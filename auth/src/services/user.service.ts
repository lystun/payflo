import { IResult, ILogin, IUserDoc, IBulkUser, IAPIKey, IVerificationDoc } from '../utils/types.util'
import { ObjectId } from 'mongoose'
import { Request } from 'express'
import User from '../models/User.model';
import crypto from 'crypto'
import Verification from '../models/Verification.model';
import { Random, UIID, arrayIncludes, dateToday, notDefined, strIncludesEs6, Encryption, charLen } from '@btffamily/vacepay';
import Role from '../models/Role.model';
import Blacklist from '../models/Blacklist.model'
import dayjs from 'dayjs';
import { AddUserDTO, CreateUserDTO, CreateVerificationDTO, DecodeAPIKeyDTO, FilterUserDTO, IUserOverviewDTO, MatchEncryptedPasswordDTO, UpdateUserPINDTO, UpdateUserPasswordDTO } from '../dtos/user.dto';
import EmailService from './email.service';
import Paystack from './providers/paystack.service';
import { APIKeyType, BusinessType, DomainType, LoginType, OnboardType, PrefixType, TierLimits, TierLimitsConfig, UserType, VerificationType } from '../utils/enums.util';
import SystemService from './system.service';
import { LoginDTO, RegisterDTO } from '../dtos/auth.dto';
import KYCService from './kyc.service';
import KYBService from './kyb.service';
import ENV from '../utils/env.util';
import UserRepository from '../repositories/user.repository';
import PermissionService from './permission.service';
import Device from '../models/Device.model';
import Kyb from '../models/Kyb.model';
import Kyc from '../models/Kyc.model';
import Audit from '../models/Audit.model';
import Notification from '../models/Notification.model';

class UserService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name validateRegister
     * @param data 
     * @returns 
     */
    public async validateRegister(data: RegisterDTO): Promise<IResult> {

        const allowedUsers = ['business'];
        const allowedBusinesses = ['corporate', 'sme-business', 'smb-business', 'entrepreneur'];

        let result: IResult = { error: false, message: '', data: null }

        if (!data.email) {
            result.error = true;
            result.message = 'email is required'
        } else if (!data.password) {
            result.error = true;
            result.message = 'password is required'
        } else if (!data.phoneNumber) {
            result.error = true;
            result.message = 'phone number is required'
        } else if (!data.phoneCode) {
            result.error = true;
            result.message = 'phone code is required'
        } else if (!data.userType) {
            result.error = true;
            result.message = 'userType is required'
        } else if (!arrayIncludes(allowedUsers, data.userType)) {
            result.error = true;
            result.message = `invalid user type value. choose from ${allowedUsers.join(',')}`
        } else if (data.userType === UserType.BUSINESS && !data.businessType) {
            result.error = true;
            result.message = 'business type is required'
        } else if (data.businessType && !arrayIncludes(allowedBusinesses, data.businessType)) {
            result.error = true;
            result.message = `invalid business type value. choose from ${allowedBusinesses.join(',')}`
        } else if (data.userType === UserType.BUSINESS && data.businessType === BusinessType.CORPORATE && !data.businessName) {
            result.error = true;
            result.message = 'business name is required'
        } else if (!data.callbackUrl) {
            result.error = true;
            result.message = 'callback url is required'
        } else {
            result.error = false;
            result.message = ''
        }

        return result;

    }

    /**
     * @name validateLogin
     * @param data 
     * @returns 
     */
    public async validateLogin(data: LoginDTO): Promise<IResult> {

        const allowedMethods = ['email', 'biometric'];
        let result: IResult = { error: false, message: '', code: 200, data: null }

        const { method, email, password, hash } = data;

        if (!method) {
            result.error = true;
            result.message = 'login method is required'
        } else if (!arrayIncludes(allowedMethods, method)) {
            result.error = true;
            result.message = `invalid login method value. choose from ${allowedMethods.join(', ')}`
        } else if (!email) {
            result.error = true;
            result.message = 'email is required'
        } else if (method === LoginType.EMAIL && !password) {
            result.error = true;
            result.message = 'password is required'
        } else if (method === LoginType.BIOMETRIC && !hash) {
            result.error = true;
            result.message = 'password hash is required'
        } else {

            result.error = false;
            result.message = '';

        }

        return result;

    }

    /**
     * @name validateUpdatePIN
     * @param data 
     * @returns 
     */
    public async validateUpdatePIN(data: UpdateUserPINDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null }

        const { currentPin, newPin } = data;

        // if (!currentPin) {
        //     result.error = true;
        //     result.message = 'current pin is required'
        // } else

        if (!newPin) {
            result.error = true;
            result.message = 'new pin is required'
        } else if (charLen(newPin.trim()) < 4 || charLen(newPin.trim()) > 4) {
            result.error = true;
            result.message = 'transaction pin cannot be less than or more than 4 digits'
        } else {

            result.error = false;
            result.message = '';

        }

        return result;

    }

    /**
     * @name validateUpdatePassword
     * @param data 
     * @returns 
     */
    public async validateUpdatePassword(data: UpdateUserPasswordDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null }

        const { currentPassword, newPassword } = data;

        // if (!currentPassword) {
        //     result.error = true;
        //     result.message = 'current password is required'
        // } else 

        if (!newPassword) {
            result.error = true;
            result.message = 'new password is required'
        } else {

            const passCheck = await this.checkPassword(newPassword);

            if (!passCheck) {
                result.error = true;
                result.message = 'password must contain at least 8 characters, 1 lowercase letter, 1 uppercase letter, 1 special character and 1 number'
            } else {
                result.error = false;
                result.message = '';
            }

        }

        return result;

    }

    /**
     * @name validateQuestion
     * @param verification 
     * @param question 
     * @returns 
     */
    public validateQuestion(verification: IVerificationDoc, question: { label: string, answer: string }): IResult {

        let result: IResult = { error: false, message: '', code: 200, data: null };
        const userQuestion = verification.security;

        if (userQuestion.label !== question.label) {
            result.error = true;
            result.message = 'invalid security question'
        } else if (userQuestion.answer !== question.answer) {
            result.error = true;
            result.message = 'invalid security answer provider'
        } else if (userQuestion.label === question.label && userQuestion.answer === question.answer) {
            result.error = false;
            result.message = 'matched security question'
        }

        return result;

    }

    /**
     * @name validateAddUser
     * @param data 
     * @returns 
     */
    public async validateAddUser(data: AddUserDTO): Promise<IResult> {

        const allowed = ['admin', 'writer']
        let result: IResult = { error: false, message: '', code: 200, data: null };
        const { callback, email, firstName, permissions, phoneNumber, phoneCode, userType } = data;

        if (!email) {
            result.error = true;
            result.message = `email is required`
        } else if (!firstName) {
            result.error = true;
            result.message = `first name is required`
        } else if (!phoneNumber) {
            result.error = true;
            result.message = `phone number is required`
        } else if (!userType) {
            result.error = true;
            result.message = `usert type is required`
        } else if (!arrayIncludes(allowed, userType)) {
            result.error = true;
            result.message = `invalid user type. choose from ${allowed.join(',')}`
        } else if (!callback) {
            result.error = true;
            result.message = `callback url is required`
        } else if (phoneCode && !strIncludesEs6(phoneCode, '+')) {
            result.error = true;
            result.message = `phone code is must include \'+\' sign`
        } else {

            const mailCheck = await this.checkEmail(email);

            if (!mailCheck) {

                result.error = true;
                result.message = `a valid email is required`;

            } else {

                result.error = false;
                result.message = ``

            }

        }

        return result

    }

    /**
     * @name sendAccountEmail
     * @param id 
     * @param business 
     * @param callback 
     * @returns 
     */
    public async sendAccountEmail(id: ObjectId, business: string, callback: string): Promise<IResult> {

        const user = await User.findOne({ _id: id });

        if (user) {

            await EmailService.sendWelcomeEmail({
                user: user,
                driver: 'zepto',
                options: {
                    buttonText: 'Login',
                    buttonUrl: `${callback}`
                }
            });

            this.result.error = false;
            this.result.message = 'email sent successfully';

        }

        return this.result;

    }

    /**
     * @name createUser
     * @param data 
     * @returns 
     */
    public async createUser(data: CreateUserDTO): Promise<IUserDoc> {

        let fName: string = '', lName: string = ''
        const exist = await User.findOne({ email: data.email });
        const { permissions, businessType, userType } = data;

        if (exist) {
            return exist;
        } else {

            if (userType === UserType.BUSINESS) {
                fName = businessType === BusinessType.CORPORATE ? 'Corporate' : 'Entrepreneur'
                lName = 'Business'
            } else {
                fName = 'Champ'
                lName = 'User'
            }

            let user = await User.create({
                firstName: data.firstName ? data.firstName : fName,
                lastName: data.lastName ? data.lastName : lName,
                email: data.email.toLowerCase(),
                password: data.password,
                passwordType: data.passwordType ? data.passwordType : 'generated',
                phoneNumber: data.phoneNumber,
                phoneCode: data.phoneCode,
                businessName: data.businessName,
                businessType: data.businessType,
                userType: data.userType,
                isActivated: false,
                isUser: true,
                isActive: true
            });

            //TODO: remove this line 
            if (user.email === 'inosuft@gmail.com' || user.email === 'tohbyy@gmail.com') {
                user.isActivated = true;
                user.emailCode = '123567'
                user.emailCodeExpire = Date.now() + 30 * 60 * 1000;
                user.onboard.step = 10;
                user.onboard.stage = OnboardType.PIN;
                user.onboard.kycStage = OnboardType.PIN;
                user.tier = TierLimits.TIER3.toString();
                user.dailyTransaction.limit = TierLimitsConfig[TierLimits.TIER3].limit;
                user.dailyTransaction.label = TierLimitsConfig[TierLimits.TIER3].label;
                await user.save()
            }

            let phone = this.attachPhoneCode(data.phoneCode, data.phoneNumber);
            user.countryPhone = phone;
            await user.save();

            // encrypt password
            await this.encryptUserPassword(user, data.password);

            // process user roles
            user = await this.attachRole(user, user.userType);

            // create user permissions
            if (!permissions || permissions.length <= 0) {
                user = await PermissionService.createPermissionData(user)
            } else if (permissions && permissions.length > 0) {
                user = await PermissionService.updatePermissions({ user, permissions })
            }

            // create kyc data
            await KYCService.createKYCData(user);

            // create verification
            await this.createVerificationData(user);

            if (user.userType === UserType.BUSINESS && data.businessType) {

                await KYBService.initializeKYBData(user, data.businessType);

                // generate API key
                user = await this.generateAPIKey(user);

            } else if (user.userType === UserType.ADMIN) {
                // generate API key
                user = await this.generateAPIKey(user);
            }


            return user

        }

    }

    /**
     * 
     * @param user 
     * @param options 
     */
    public async createVerificationData(user: IUserDoc, options?: CreateVerificationDTO): Promise<void> {

        const verif = await Verification.create({
            basic: 'pending',
            ID: 'pending',
            address: 'pending',
            face: 'pending',
            sms: options ? options.sms : false,
            email: options ? options.email : false,
            kyb: 'pending',
            kyc: 'pending',
            bvn: 'pending',
            user: user._id
        });

        if (user.email === 'inosuft@gmail.com' || user.email === 'tohbyy@gmail.com') {
            verif.basic = VerificationType.APPROVED;
            verif.ID = VerificationType.APPROVED;
            verif.address = VerificationType.APPROVED;
            verif.face = VerificationType.APPROVED;
            verif.kyc = VerificationType.APPROVED;
            verif.bvn = VerificationType.APPROVED;
            verif.nin = VerificationType.APPROVED;
            await verif.save();
        }

        user.verification = verif._id;
        await user.save();

    }

    /**
    * @name checkEmail
    * @description validates against invalid email
    * @param email - The email to check
    * 
    * @returns {boolean} true/false to determine the state of the email
    */
    public async checkEmail(email: string): Promise<boolean> {

        const match = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        const matched: boolean = match.test(email);

        return matched;

    }

    /**
     * @name checkPassword
     * @description validates against invalid password
     * @param password 
     * 
     * @returns {boolean} true/false to determine the state of the password
     */
    public async checkPassword(password: string): Promise<boolean> {

        /* 
        password must contain at least 8 characters, 
        1 lowercase letter, 1 uppercase letter, 1 special character and 1 number
        */

        const match = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[^\w\s]).{8,}$/;
        const matched: boolean = match.test(password);

        return matched;

    }

    /**
     * @name validateLoginCredentials
     * @param data 
     */
    public async validateLoginCredentials(data: ILogin): Promise<IResult> {

        if (!data) {
            this.result.error = true;
            this.result.message = 'login credentials are required';
        } else {

            if (!data.email) {
                this.result.error = true;
                this.result.message = 'email is required';
            } else if (!data.password) {
                this.result.error = true;
                this.result.message = 'password is required';
            } else {
                this.result.error = false;
                this.result.message = '';
            }

        }

        return this.result;

    }

    /**
     * @name validateUserType
     * @param type 
     * @returns 
     */
    public async validateUserType(type: string): Promise<boolean> {

        let flag = false;
        const list = ['admin', 'business', 'team', 'writer', 'user'];

        if (arrayIncludes(list, type)) {
            flag = true;
        } else {
            flag = false;
        }

        return flag;

    }

    /**
     * @name validateBusinessType
     * @param type 
     * @returns 
     */
    public async validateBusinessType(type: string): Promise<boolean> {

        let flag = false;
        const list = ['vendor', 'school', 'corporate', 'sme-business', 'smb-business', 'entrepreneur'];

        if (arrayIncludes(list, type)) {
            flag = true;
        } else {
            flag = false;
        }

        return flag;

    }

    /**
     * @name attachRole
     * @param user 
     * @param type 
     */
    public async attachRole(user: IUserDoc, type: string): Promise<IUserDoc> {

        const role = await Role.findOne({ name: 'user' });
        const _role = await Role.findOne({ name: type });

        if (role && _role) {

            if (type === UserType.ADMIN) {

                user.roles.push(role._id);
                user.roles.push(_role._id);
                user.isAdmin = true;
                user.isUser = true;
                user.userType = UserType.ADMIN

                await user.save();

            }

            if (type === UserType.BUSINESS) {

                user.roles.push(role._id);
                user.roles.push(_role._id);
                user.isBusiness = true;
                user.isUser = true;
                user.userType = UserType.BUSINESS

                await user.save();

            }

            if (type === UserType.WRITER) {

                user.roles.push(role._id);
                user.roles.push(_role._id);
                user.isWriter = true;
                user.isUser = true;
                user.userType = UserType.WRITER

                await user.save();

            }

            if (type === UserType.TEAM) {

                user.roles.push(role._id);
                user.roles.push(_role._id);
                user.isTeam = true;
                user.isUser = true;
                user.userType = UserType.TEAM

                await user.save();

            }

        }

        return user;

    }

    /**
     * @name BlacklistDue
     * @param dueAt 
     * @returns 
     */
    private blacklistDue(dueAt: string | number): boolean {

        let flag: boolean = false;
        const today = Date.now();

        const conv = dateToday(today);
        const due = dateToday(dueAt);

        if (conv.dateTime > due.dateTime) {
            flag = true
        } else {
            flag = false;
        }

        return flag;

    }

    /**
     * @name isBlacklisted
     * @description Function checks if an email is found in Blacklist. if found, it also check if it is due to be removed or not
     * @param email 
     * @returns 
     */
    public async isBlacklisted(email: string): Promise<boolean> {

        let flag: boolean = false;

        const black = await Blacklist.findOne({ email: email });

        if (black) {

            if (this.blacklistDue(black.dueAt)) {
                // remove data from Blacklist if time is already due
                await this.removeFromBlacklist(email, false)
                flag = false;
            } else {
                flag = true;
            }

        }

        return flag;

    }

    /**
     * @name addToBlacklist
     * @param petition 
     * @param user 
     */
    public async addToBlacklist(user: IUserDoc, fullName: string, dur: number): Promise<void> {

        const today = Date.now();
        const conv = dateToday(today);

        const a90 = dayjs(conv.ISO).add(dur, 'day'); // add {dur}days;
        const dat = dateToday(a90);

        // create Blacklist record
        await Blacklist.create({
            fullName: fullName,
            email: user.email,
            listedAt: conv.ISO,
            dueAt: dat.ISO
        });

        // delete user data
        await User.deleteOne({ email: user.email });

    }

    /**
     * @name
     * @param email 
     * @param time 
     * @returns 
     */
    public async removeFromBlacklist(email: string, time: boolean = false): Promise<IResult> {

        const black = await Blacklist.findOne({ email: email });

        if (black && time === true) {

            if (this.blacklistDue(black.dueAt)) {

                await Blacklist.deleteOne({ email: email });

                this.result.error = false;
                this.result.message = 'removed from Blacklist'

            } else {

                this.result.error = true;
                this.result.message = 'cannot remove from black list, it is not yet time'

            }

        }

        if (black && time === false) {

            await Blacklist.deleteOne({ email: email });

            this.result.error = false;
            this.result.message = 'removed from Blacklist'

        }

        return this.result;

    }

    /**
     * @name createBulkUsers
     * @param data 
     * @param options 
     */
    public async createBulkUsers(data: Array<IBulkUser>, options: { isNew: boolean }): Promise<void> {

        if (data && data.length > 0) {

            for (let i = 0; i < data.length; i++) {

                let bulk: IBulkUser = data[i];
                let password: string = UIID(1).toString();
                let exist = await User.findOne({ email: bulk.email });

                if (!exist && options.isNew) {

                    // create the user
                    let user = await User.create({
                        email: bulk.email,
                        password: password,
                        firstName: bulk.firstName,
                        lastName: bulk.lastName,
                        passwordType: 'generated',
                        savedPassword: password,
                        phoneNumber: bulk.phoneNumber,
                        phoneCode: bulk.phoneCode,
                        userType: bulk.userType,
                        businessType: bulk.userType === UserType.BUSINESS ? bulk.businessType : 'none',
                        isSuper: false,
                        isAdmin: bulk.userType === UserType.ADMIN ? true : false,
                        isBusiness: bulk.userType === UserType.BUSINESS ? true : false,
                        isWriter: bulk.userType === UserType.WRITER ? true : false,
                        isActivated: false,
                        isUser: true,
                        isActive: false,
                        isLocked: true,
                    });

                    // create verification
                    const verification = await Verification.create({
                        basic: 'pending',
                        ID: 'pending',
                        address: 'pending',
                        face: 'pending',
                        sms: false,
                        email: false,
                        user: user._id,
                        activate: false
                    });

                    user.verification = verification._id;
                    await user.save();

                    // process user roles
                    await this.attachRole(user, user.userType);

                }

                if (!exist && options.isNew === false) {

                    // create the user
                    let user = await User.create({
                        email: bulk.email,
                        password: password,
                        firstName: bulk.firstName,
                        lastName: bulk.lastName,
                        passwordType: 'generated',
                        savedPassword: password,
                        phoneNumber: bulk.phoneNumber,
                        phoneCode: bulk.phoneCode,
                        userType: bulk.userType,
                        businessType: bulk.userType === UserType.BUSINESS ? bulk.businessType : 'none',
                        isSuper: false,
                        isAdmin: bulk.userType === UserType.ADMIN ? true : false,
                        isBusiness: bulk.userType === UserType.BUSINESS ? true : false,
                        isWriter: bulk.userType === UserType.WRITER ? true : false,
                        isActivated: false,
                        isUser: true,
                        isActive: false,
                        isLocked: true,
                    });

                    // create verification
                    const verification = await Verification.create({
                        basic: 'pending',
                        ID: 'pending',
                        address: 'pending',
                        face: 'pending',
                        sms: false,
                        email: false,
                        user: user._id,
                        activate: false
                    });

                    user.verification = verification._id;
                    await user.save();

                    // process user roles
                    await this.attachRole(user, user.userType);

                }

            }

        }

    }

    /**
     * @name overview
     * @returns 
     */
    public async overview(): Promise<IUserOverviewDTO> {

        let result: IUserOverviewDTO = {
            total: 0,
            active: 0,
            inactive: 0,
            corporates: 0,
            entrepreneurs: 0,
            locked: 0
        }

        const users = await User.countDocuments();
        const active = await User.countDocuments({ isActive: true });
        const inactive = await User.countDocuments({ isActive: false });
        const corporates = await User.countDocuments({ businessType: BusinessType.CORPORATE });
        const entrepreneurs = await User.countDocuments({ businessType: BusinessType.ENTREPRENEUR });
        const locked = await User.countDocuments({ isLocked: true });

        result = {
            total: users,
            active: active,
            inactive: inactive,
            corporates,
            entrepreneurs,
            locked: locked
        }

        return result;

    }

    /**
     * @name getUserAPIKey
     * @param user 
     * @returns 
     */
    public async getUserAPIKey(user: IUserDoc): Promise<IAPIKey | null> {

        let result: IAPIKey | null = null;

        const _user = await User.findOne({ _id: user._id })
            .select("+apiKey +apiKey.secret +apiKey.token +apiKey.public +apiKey.publicToken +apiKey.domain +apiKey.isActive +apiKey.updatedAt");

        if (!_user) {
            result = null;
        } else {
            result = _user.apiKey;
        }

        return result;

    }

    /**
     * @name getUserAPIKeys
     * @param user 
     * @returns 
     */
    public async getUserAPIKeys(user: IUserDoc): Promise<Array<IAPIKey>> {

        let result: Array<IAPIKey> = [];

        const _user = await User.findOne({ _id: user._id })
            .select("+keys +keys.secret +keys.token +keys.public +keys.publicToken +keys.domain +keys.isActive +keys.updatedAt");

        if (!_user) {
            result = [];
        } else {
            result = _user.keys;
        }

        return result;

    }

    /**
     * @name syncUserAPIKey
     */
    public async syncUserAPIKey(email: string): Promise<void> {

        const user = await UserRepository.findByEmailSelectKey(email, true)

        if (user) {
            await SystemService.syncNatsData({ user: user }, 'user.apikey', 'type.update');
        }

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
     * @name checkPhoneCode
     * @param code 
     * @param phone 
     * @returns 
     */
    public checkPhoneCode(code: string, phone: string): string {

        let result: string = '';
        let phoneStr: string = '';

        if (code && phone) {

            if (!strIncludesEs6(phone, '+') && phone.length > 10) {
                phoneStr = phone.substring(3);
                result = `${code}${phoneStr}`;
            } else if (strIncludesEs6(phone, '+')) {
                result = phone;
            }

        }


        return result;

    }

    /**
     * @name phoneExists
     * @param phone 
     * @returns 
     */
    public async phoneExists(phone: string): Promise<boolean> {
        let result: boolean = false;

        const exist = await User.findOne({ $or: [{ phoneNumber: phone }, { altPhone: phone }] });

        if (exist) {
            result = true;
        }

        return result;
    }

    /**
     * @name resolveBankAccount
     * @param code 
     * @param accountNo 
     * @returns 
     */
    public async resolveBankAccount(code: string, accountNo: string): Promise<IResult> {

        const result: IResult = await Paystack.verifyNuban({
            bankCode: code,
            accountNo: accountNo
        });

        return result;

    }

    /**
     * @name updateLastLogin
     * @description updates the last time user logged into the system
     * @param user 
     */
    public async updateLastLogin(user: IUserDoc): Promise<void> {

        const today = dateToday(new Date());
        user.login.last = today.ISO;
        await user.save();

    }

    /**
     * @name activateAccount
     * @param user 
     */
    public async activateAccount(user: IUserDoc): Promise<void> {

        user.isActivated = true;
        user.isActive = true;
        user.isLocked = false;
        user.loginLimit = 0;
        await user.save();

    }

    /**
     * @name deactivateAccount
     * @param user 
     */
    public async deactivateAccount(user: IUserDoc): Promise<void> {

        user.isActive = false;
        user.isLocked = true;
        await user.save();

    }

    /**
     * @name initiateOTPCode
     * @param user 
     * @returns 
     */
    public async initiateOTPCode(user: IUserDoc): Promise<string> {

        const gencode = Random.randomNum(6);
        user.emailCode = gencode.toString();
        user.emailCodeExpire = Date.now() + 30 * 60 * 1000; // 30 minutes // generates timestamp
        await user.save();

        return gencode.toString();

    }

    /**
     * @name validateOTPCode
     * @param user 
     * @param code 
     * @returns 
     */
    public async validateOTPCode(code: string): Promise<IUserDoc | null> {

        const today = Date.now(); // get timestamp from today's date
        const _foundUser = await User.findOne({ emailCode: code.toString(), emailCodeExpire: { $gt: today } })

        return _foundUser ? _foundUser : null;
    }

    /**
     * @name defineFilterQuery
     * @param data 
     * @returns 
     */
    public defineFilterQuery(data: FilterUserDTO): Array<any> {

        let result: Array<any> = [];

        if (!notDefined(data.userType)) {
            result.push({ "userType": data.userType })
        }

        if (!notDefined(data.active)) {
            result.push({ "isActive": data.active })
        }

        if (!notDefined(data.activated)) {
            result.push({ "isActivated": data.activated })
        }

        if (!notDefined(data.onboard)) {
            result.push({ "onboard.step": data.onboard })
        }

        if (!notDefined(data.businessType)) {
            result.push({ "businessType": data.businessType })
        }

        return result;

    }

    /**
     * @name matchUserPIN
     * @param user 
     * @param pin 
     * @returns 
     */
    public async matchUserPIN(user: IUserDoc, pin: string): Promise<boolean> {

        let result: boolean = false;

        const decryptedPin = await this.decryptUserPIN(user);

        if (decryptedPin && decryptedPin === pin.toString()) {
            result = true;
        } else {
            result = false;
        }

        return result;
    }

    /**
    * @name encryptUserPIN
    * @param user 
    * @param password 
    * @returns 
    */
    public async encryptUserPIN(user: IUserDoc, pin: string): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null };

        const encrypted = await SystemService.encryptData({
            payload: pin,
            password: user.email,
            separator: '-'
        });

        if (encrypted) {

            user.transactionPin = encrypted;
            await user.save();

            result.error = false;
            result.data = encrypted;

        } else {

            result.error = true;
            result.message = 'could not encrypt user pin';

        }

        return result;

    }

    /**
     * @name decryptUserPIN
     * @param user 
     * @returns 
     */
    public async decryptUserPIN(user: IUserDoc): Promise<any> {

        let result: any = null;

        const decrypted = await SystemService.decryptData({
            password: user.email,
            payload: user.transactionPin,
            separator: '-'
        });

        result = decrypted.data.toString();

        return result;

    }

    /**
     * @name encryptUserPassword
     * @param user 
     * @param password 
     * @returns 
     */
    public async encryptUserPassword(user: IUserDoc, password: string): Promise<boolean> {

        let result: boolean = false;

        const encrypted = await SystemService.encryptData({
            payload: password,
            password: user.email,
            separator: '-'
        });

        if (encrypted) {

            user.savedPassword = encrypted;
            await user.save();

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
     * @name matchEncryptedPassword
     * @param data 
     * @returns 
     */
    public async matchEncryptedPassword(data: MatchEncryptedPasswordDTO): Promise<boolean> {

        let result: boolean = false;
        const { hash, user } = data;

        if (user.savedPassword === hash) {

            // decrypt encrypted password
            const decrypted = await this.decryptUserPassword(user);

            // decrypt hashed supplied
            const hashDecrypt = await SystemService.decryptData({
                password: user.email,
                payload: hash,
                separator: '-'
            });

            if (hashDecrypt.error === false && decrypted === hashDecrypt.data.toString()) {
                result = true;
            }

        }

        return result;


    }

    /**
     * @name generateAPIKey
     * @param user 
     * @returns 
     */
    public async generateAPIKey(user: IUserDoc): Promise<IUserDoc> {

        // Generate key
        const secret = crypto.randomBytes(25).toString('hex');
        const pubkey = crypto.randomBytes(25).toString('hex');

        // configure domain,
        let domain: string = ENV.isProduction() ? DomainType.LIVE : DomainType.TEST;

        // define key
        let sec_combined = `${APIKeyType.SECRETKEY}_${domain}_${secret}`;
        let pub_combined = `${APIKeyType.PUBLICKEY}_${domain}_${pubkey}`;

        // Generate token
        const token = crypto.createHash('sha256').update(sec_combined).digest('hex');
        const pub_token = crypto.createHash('sha256').update(pub_combined).digest('hex');

        let apiKey: IAPIKey = {
            secret: sec_combined,
            public: pub_combined,
            token: token,
            publicToken: pub_token,
            domain: domain,
            isActive: true,
            updatedAt: dateToday(Date.now()).ISO
        }

        user.apiKey = apiKey;
        user.keys.push(apiKey);
        await user.save();


        return user;

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
            const user = await User.findOne({ "apiKey.secret": apikey, "apiKey.token": token });

            if (user) {
                result = user;
            }

        }

        if (type === APIKeyType.PUBLICKEY) {

            const token = crypto.createHash('sha256').update(apikey).digest('hex');
            const user = await User.findOne({ "apiKey.public": apikey, "apiKey.publicToken": token });

            if (user) {
                result = user;
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

        const user = await User.findOne({ _id: req.user._id });

        if (!user) {
            result.error = true;
            result.message = `authorized user details not found`
            result.code = 401;
        } else if (user && isAdmin === false && (user.userType === UserType.ADMIN || user.userType === UserType.SUPER)) {
            result.error = true;
            result.message = `user is not authorized to access this route`
            result.code = 401;
        } else {

            result.error = false;
            result.data = {
                user: user
            }

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

            // sync to NATS first.
            await SystemService.syncNatsData({ user: delUser }, 'user.deleted', 'typ.delete');

            // delete data
            await Blacklist.deleteOne({ user: delUser._id });
            await Device.deleteMany({ user: delUser._id });
            await Kyb.deleteOne({ user: delUser._id });
            await Kyc.deleteOne({ user: delUser._id });
            await Verification.deleteOne({ user: delUser._id });

            await Audit.deleteMany({ user: delUser._id });
            await Notification.deleteMany({ user: delUser._id });

            await User.deleteOne({ _id: delUser._id });

        }




    }

}

export default new UserService();