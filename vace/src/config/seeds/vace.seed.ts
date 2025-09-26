import { Random, arrayIncludes } from "@btffamily/vacepay";
import Business from "../../models/Business.model";
import Provider from "../../models/Provider.model";
import Settlement from "../../models/Settlement.model";
import Transaction from "../../models/Transaction.model";
import User from "../../models/User.model"
import transactionRepository from "../../repositories/transaction.repository";
import BusinessService from "../../services/business.service";
import ProviderService from "../../services/provider.service";
import settlementService from "../../services/settlement.service";
import WalletService from "../../services/wallet.service";
import { BusinessType, PrefixType, SettlementStatus, TransactionFeatureType, TransactionStatus } from "../../utils/enums.util";
import envUtil from "../../utils/env.util";
import { IBusinessDoc, ISettlementDoc } from "../../utils/types.util";

export const createVacepayBaniWallet = async (): Promise<void> => {

    const vacepayUser = await User.findOne({ email: process.env.SUPERADMIN_EMAIL });
    const business = await Business.findOne({ email: process.env.SUPERADMIN_EMAIL });
    const provider = await Provider.findOne({ name: 'bani' });

    if (vacepayUser && provider && business) {

        // check
        const check = await ProviderService.accountExists(provider, business);

        if (check === false) {

            // create business data for vacepay
            vacepayUser.phoneCode = '+234';
            vacepayUser.phoneNumber = '08138068180';
            vacepayUser.firstName = vacepayUser.firstName ? vacepayUser.firstName : 'Vace';
            vacepayUser.lastName = vacepayUser.lastName ? vacepayUser.lastName : 'Technologies';
            await vacepayUser.save();

            business.phoneCode = vacepayUser.phoneCode;
            business.phoneNumber = vacepayUser.phoneNumber;
            business.location.city = business.location.city ? business.location.city : 'Maitama';
            business.location.address = business.location.address ? business.location.address : '1a Taraba Close, Maitama, Abuja';
            business.location.state = business.location.state ? business.location.state : 'Abuja';
            business.officialEmail = business.officialEmail ? business.officialEmail : vacepayUser.email;
            business.legal = {
                bvnNumber: process.env.SUPERADMIN_BVN || '',
                ninNumber: process.env.SUPERADMIN_NIN || ''
            }
            business.owner.firstName = process.env.PLATFORM_FIRSTNAME || '';
            business.owner.lastName = process.env.PLATFORM_LASTNAME || '';
            await business.save();

            // create business settings
            await BusinessService.createSettingData({
                business: business,
                user: vacepayUser
            });

            // create wallet data for vacepay
            await WalletService.createWallet({ business, currency: 'NGN' });

            // generate a bank account for vacepay via bani
            await BusinessService.createBankAccount(business._id, 'bani');

            console.log('generated-bani-vacepay-account')

        }


    } else if (vacepayUser && provider && !business) {

        await BusinessService.createBusiness(vacepayUser, { 
            type: BusinessType.CORPORATE, 
            name: 'Vace Technologies Limited',
            tier: '3',
            limit: {
                label: '3M',
                value: 300000000
            }
        });

    }

}

export const createVacepayPSBWallet = async (): Promise<void> => {

    const vacepayUser = await User.findOne({ email: process.env.SUPERADMIN_EMAIL });
    const provider = await Provider.findOne({ name: 'ninepsb' });
    let business: IBusinessDoc | null | undefined = null;

    if (vacepayUser && provider) {

        // create business data for vacepay
        vacepayUser.phoneCode = vacepayUser.phoneCode ? vacepayUser.phoneCode : '+234';
        vacepayUser.phoneNumber = vacepayUser.phoneNumber ? vacepayUser.phoneNumber : '2348138068180';
        vacepayUser.firstName = vacepayUser.firstName ? vacepayUser.firstName : 'Vace';
        vacepayUser.lastName = vacepayUser.lastName ? vacepayUser.lastName : 'Technologies';
        await vacepayUser.save();

        business = await Business.findOne({ email: vacepayUser.email });

        if (!business) {

            business = await BusinessService.createBusiness(vacepayUser, {
                type: BusinessType.CORPORATE,
                name: 'Vace Technologies Limited',
                tier: '3',
                limit: {
                    label: '3M',
                    value: 300000000
                }
            });

        }

        business.location.city = business.location.city ? business.location.city : 'Maitama';
        business.location.address = business.location.address ? business.location.address : '1a Taraba Close, Maitama, Abuja';
        business.location.state = business.location.state ? business.location.state : 'Abuja';
        business.officialEmail = business.officialEmail ? business.officialEmail : vacepayUser.email;
        business.legal = {
            bvnNumber: process.env.SUPERADMIN_BVN || '',
            ninNumber: process.env.SUPERADMIN_NIN || ''
        }
        await business.save();

        // create account date for user
        const check = await ProviderService.accountExists(provider, business);

        if (check === false) {

            // create wallet data for vacepay
            await WalletService.createWallet({ business, currency: 'NGN' });

            // generate a bank account for vacepay via bani
            await BusinessService.createBankAccount(business._id, 'ninepsb');

            console.log('generated ninepsb vacepay account');

        }

    }

}

export const scriptTransaction = async (): Promise<void> => {


}