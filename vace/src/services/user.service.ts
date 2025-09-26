import { dateToday, strIncludesEs6 } from '@btffamily/vacepay';
import User from '../models/User.model';
import { APIKeyType, BusinessType, DomainType, HeaderType, SettingStatusType, UserType } from '../utils/enums.util';
import ENV from '../utils/env.util';
import { IResult, ISettingDoc, IUserDoc, IWebhook } from '../utils/types.util'
import crypto from 'crypto'
import { Request } from 'express'
import Axios, { AxiosRequestConfig } from 'axios';
import { AccountActiveDTO, CheckDomainDTO, DecodeAPIKeyDTO, FireAuthChecksDTO, MatchPasswordDTO } from '../dtos/user.dto';
import SystemService from './system.service';
import Account from '../models/Account.model';
import Bank from '../models/Bank.model';
import Beneficiary from '../models/Beneficiary.model';
import Card from '../models/Card.model';
import Chargeback from '../models/Chargeback.model';
import Invoice from '../models/Invoice.model';
import PaymentLink from '../models/PaymentLink.model';
import Product from '../models/Product.model';
import Refund from '../models/Refund.model';
import Subaccount from '../models/Subaccount.model';
import Wallet from '../models/Wallet.model';
import Transaction from '../models/Transaction.model';
import Business from '../models/Business.model';
import Setting from '../models/Setting.model';

class UserService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name decodeAPIKey
     * @param data 
     * @returns 
     */
    public async decodeAPIKey(data: DecodeAPIKeyDTO): Promise<IUserDoc | null> {

        let result: IUserDoc | null = null;
        const { apikey, type } = data;

        if (type === APIKeyType.SECRETKEY) {

            const token = crypto.createHash('sha256').update(apikey).digest('hex');
            const user = await User.findOne({ "apiKey.secret": apikey, "apiKey.token": token }).populate([
                {
                    path: 'business', populate: [
                        { path: 'settings' }
                    ]
                }
            ]);

            if (user) {
                result = user;
            }

        }

        if (type === APIKeyType.PUBLICKEY) {

            const token = crypto.createHash('sha256').update(apikey).digest('hex');
            const user = await User.findOne({ "apiKey.public": apikey, "apiKey.publicToken": token }).populate([
                {
                    path: 'business', populate: [
                        { path: 'settings' }
                    ]
                }
            ]);

            if (user) {
                result = user;
            }

        }

        return result;

    }

    /**
     * @name checkDomain
     * @param data 
     * @returns 
     */
    public async checkDomain(data: CheckDomainDTO): Promise<boolean> {

        let result: boolean = false;
        const { settings, user } = data;

        if (ENV.isProduction() && settings.domain === DomainType.LIVE) {
            result = true;
        } else if ((ENV.isStaging() || ENV.isDev()) && settings.domain === DomainType.TEST) {
            result = true;
        }

        return result;

    }

    /**
     * @name isAccountActive
     * @param data 
     * @returns 
     */
    public async isAccountActive(data: AccountActiveDTO): Promise<boolean> {

        let result: boolean = false;
        const { settings, user } = data;

        if (settings.account === SettingStatusType.ACTIVE) {
            result = true
        }

        return result;

    }

    /**
     * @name fireAuthChecks
     * @param data 
     * @returns 
     */
    public async fireAuthChecks(data: FireAuthChecksDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null };
        const { settings, user, type, apiKey } = data;

        if (type === 'protect') {

            if (user.userType === UserType.BUSINESS && user.businessType === BusinessType.CORPORATE) {

                const accountCheck = await this.isAccountActive({ user: user, settings: settings });
                const domainCheck = await this.checkDomain({ user: user, settings: user.business.settings });

                if (!accountCheck) {
                    result.error = true;
                    result.code = 403;
                    result.message = `account is currently de-activated`
                } else if (!domainCheck && apiKey === false) {
                    result.error = true;
                    result.message = `invalid domain configured. contact support`
                    result.code = 403;
                }

            }

        }

        if (type === 'authorize') {

            if (user.userType === UserType.BUSINESS && user.businessType === BusinessType.CORPORATE) {



            }

        }

        return result;

    }

    /**
     * @name getLoggedInUser
     * @param data 
     * @returns 
     */
    public async getLoggedInUser(data: { req: Request, isAdmin: boolean }): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { req, isAdmin } = data;

        const user = await User.findOne({ _id: req.user!._id }).populate([
            {
                path: 'business', populate: [
                    { path: 'user' },
                    { path: 'wallet' },
                    { path: 'settings' },
                    {
                        path: 'accounts', populate: [
                            { path: 'provider' }
                        ]
                    },
                    { path: 'banks.details' },
                ]
            }
        ]).select("+savedPassword");

        if (!user) {
            result.error = true;
            result.message = `authorized user details not found`
            result.code = 401;
        } else if (user && isAdmin === false && (user.userType === UserType.ADMIN || user.userType === UserType.SUPER)) {
            result.error = true;
            result.message = `user is not authorized to access this route`
            result.code = 401;
            result.data = {
                user: user,
                business: user.business,
                settings: user.userType === UserType.SUPER ? user.business.settings : null
            }
        } else {

            if (user.userType === UserType.BUSINESS) {

                const domainCheck = await this.checkDomain({ user: user, settings: user.business.settings });

                if (!domainCheck) {

                    result.error = true;
                    result.message = `account is currently deactivated. contact support`
                    result.code = 403;

                } else {

                    result.error = false;
                    result.data = {
                        user: user,
                        business: user.business,
                        settings: user.business.settings
                    }

                }

            } else {
            
                console.log('Got to else')

                result.error = false;
                result.data = {
                    user: user,
                    business: user.business,
                    settings: user.userType === UserType.SUPER ? user.business.settings : null
                }

            }

        }

        return result;

    }

    /**
     * @name matchPassword
     * @param data 
     * @returns 
     */
    public async matchPassword(data: MatchPasswordDTO): Promise<boolean> {

        let result: boolean = false;
        const { password, user } = data;

        // decrypt encrypted password
        const decrypted = await this.decryptUserPassword(user);

        if (decrypted.toString() === password.toString()) {
            result = true;
        }

        return result;


    }

    /**
     * @name decryptUserPassword
     * @param user 
     * @returns 
     */
    public async decryptUserPassword(user: IUserDoc): Promise<any> {

        let result: any = null;

        const decrypted = await SystemService.decryptData({
            password: user.email,
            payload: user.savedPassword,
            separator: '-'
        });

        result = decrypted.data.toString();

        return result;

    }

    /**
     * @name attachPhoneCode
     * @param code 
     * @param phone 
     * @returns 
     */
    public attachPhoneCode(code: string, phone: string): string {

        let result: string = '';
        let codeStr: string = '';

        if (code && phone) {

            if (strIncludesEs6(code, '-')) {
                codeStr = code.substring(3);
                codeStr = `+${codeStr}`;
            } else if (strIncludesEs6(code, '+')) {
                codeStr = code;
            } else {
                codeStr = code;
            }

            result = codeStr + phone.substring(1);

        }

        return result;

    }

    /**
     * @name checkAccess
     * @param user 
     * @param req 
     * @returns 
     */
    public checkAccess(user: IUserDoc, req: Request): boolean {

        let result: boolean = true;

        if (user.userType === UserType.BUSINESS && req.params && req.params.id) {

            // if((user.business._id.toString() !== req.params.id.toString()) || (user._id.toString() !== req.params.id.toString())){
            //     result = false
            // }

        }

        return result;

    }

    /**
     * @name deleteUserData
     * @param user 
     */
    public async deleteUserData(user: IUserDoc): Promise<void> {

        const delUser = await User.findOne({ _id: user._id })

        if (delUser) {

            await Account.deleteOne({ business: delUser._id });
            await Wallet.deleteOne({ business: delUser._id });
            await Business.deleteOne({ user: delUser._id });
            await Setting.deleteOne({ business: delUser._id });

            await Bank.deleteMany({ business: delUser._id });
            await Beneficiary.deleteMany({ business: delUser._id });
            await Card.deleteMany({ business: delUser._id });
            await Chargeback.deleteMany({ business: delUser._id });
            await Invoice.deleteMany({ business: delUser._id });
            await PaymentLink.deleteMany({ business: delUser._id });
            await Product.deleteMany({ business: delUser._id });
            await Refund.deleteMany({ business: delUser._id });
            await Subaccount.deleteMany({ business: delUser._id });

            await Transaction.deleteMany({ business: delUser._id });
            await User.deleteOne({ _id: delUser._id });

        }


    }

}

export default new UserService();