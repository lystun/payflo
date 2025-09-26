import crypto from 'crypto';
import mongoose, { ObjectId, Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { asyncHandler, strIncludesEs6, arrayIncludes, isString, notDefined, isZero, isNeg, isPrecise, hasDecimal, toDecimal } from '@btffamily/vacepay'
import { generate } from '../utils/random.util';
import { uploadBase64File } from '../utils/google.util'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import User from '../models/User.model'

import nats from '../events/nats';
import { NewAuditDTO } from '../dtos/audit.dto';
import SystemService from '../services/system.service';
import Business from '../models/Business.model';
import { IAccountDoc, IBusinessDoc, IPagination, IProviderDoc, IResult, ISearchQuery, ISettingDoc, IUserDoc, IWalletDoc } from '../utils/types.util';
import { advanced, search } from '../utils/result.util';
import Account from '../models/Account.model';
import { FundBusinessWalletDTO, SwapRevenueFundsDTO } from '../dtos/vace.dto';
import Provider from '../models/Provider.model';
import WalletService from '../services/wallet.service';
import ProviderService from '../services/provider.service';
import BusinessService from '../services/business.service';
import { BusinessType, ProviderNameType, TransactionFeatureType } from '../utils/enums.util';
import BankService from '../services/bank.service';
import NinepsbService from '../services/providers/ninepsb.service';
import { PSBApiResponseDTO } from '../dtos/providers/ninepsb.dto';
import { UpdateSettingsDTO } from '../dtos/business.dto';
import PaystackService from '../services/providers/paystack.service';
import { WithdrawMoneyDTO, WithdrawRevenueDTO } from '../dtos/wallet.dto';
import UserService from '../services/user.service';
import TransactionService from '../services/transaction.service';
import BaniService from '../services/providers/bani.service';
import { ResolvedBankDTO } from '../dtos/provider.dto';
import Transaction from '../models/Transaction.model';
import { FilterTransactionDTO } from '../dtos/transaction.dto';
import { createNewAuditJob } from '../queues/jobs/audit.job';
import BusinessRepository from '../repositories/business.repository';
import TransactionRepository from '../repositories/transaction.repository';
import VacepayService from '../services/vacepay.service';
import { runScriptJob } from '../queues/jobs/script.job';

/**
 * @name getWalletDetails
 * @description Get reource from database
 * @route GET /vace/v1/owner/wallet
 */
export const getWalletDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let response: IResult = { error: false, message: '', code: 200, data: null }
    const vacepay = await Business.findOne({ email: process.env.SUPERADMIN_EMAIL }).populate([
        { path: 'wallet' }
    ]);

    if (!vacepay) {
        return next(new ErrorResponse('Error', 404, ['business data does not exist']));
    }

    const wallet: IWalletDoc = vacepay.wallet;
    response = await PaystackService.getBalance();

    if (!response.error) {

        const balance = parseInt(response.data[0].balance) / 100;

        wallet.balance.paystack = balance;
        await wallet.save();

    }


    res.status(200).json({
        error: false,
        errors: [],
        data: wallet,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getWalletTransactions
 * @description Get a reource from database
 * @route GET /vace/v1/owner/transactions
 */
export const getWalletTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const type = req.query.type as string;
    const wallet = await VacepayService.getAdminWallet()

    if(!type){
        return next(new ErrorResponse('Error', 400, ['query type is required']))
    }

    if (!wallet) {
        return next(new ErrorResponse('Error', 404, ['wallet does not exist']))
    }

    let result: IPagination = {
        count: 0, total: 0, 
        data : [],
        pagination: {
            next: { limit: 0, page: 1 },
            prev: { limit: 0, page: 1 }
        }
    }

    if(type === 'all'){

        result = await search({
            model: Transaction,
            ref: null,
            value: null,
            populate: [],
            data: null,
            query: null,
            queryParam: req.query,
            operator: ''
        })
    }

    if(type === 'history'){
        result = await search({
            model: Transaction,
            ref: 'wallet',
            value: wallet._id,
            populate: [],
            data: null,
            query: null,
            queryParam: req.query,
            operator: ''
        })
    }

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: result.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name filterTransactions
 * @description Get a reource from database
 * @route POST /vace/v1/owner/filter-transactions
 * @access Superadmin | Admin
 */
export const filterTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as FilterTransactionDTO;

    const wallet = await VacepayService.getAdminWallet()

    if (!wallet) {
        return next(new ErrorResponse('Error', 404, ['wallet does not exist']))
    }

    const filters = TransactionService.defineFilterQuery(body);

    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]

    const query: ISearchQuery = {
        model: Transaction,
        ref: 'wallet',
        value: wallet._id,
        data: filters,
        query: null,
        queryParam: req.query,
        populate: pop,
        operator: 'and'
    }

    const result = await search(query); // search from DB

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        data: result.data,
        pagination: result.pagination,
        message: 'successful',
        status: 200
    })

})

/**
 * @name searchTransactions
 * @description Get a reource from database
 * @route POST /vace/v1/owner/search-transactions
 * @access Business
 */
export const searchTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { reference } = req.body;

    if (!reference) {
        return next(new ErrorResponse('Error', 400, [`reference is required`]))
    }

    const wallet = await VacepayService.getAdminWallet()

    if (!wallet) {
        return next(new ErrorResponse('Error', 404, ['wallet does not exist']))
    }

    const pop = [
        { path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
    ]

    const query: ISearchQuery = {
        model: Transaction,
        ref: 'wallet',
        value: wallet._id,
        data: [
            { vaceRef: { $regex: reference, $options: 'i' } },
            { providerRef: { $regex: reference, $options: 'i' } },
            { reference: { $regex: reference, $options: 'i' } },
            { feature: { $regex: reference, $options: 'i' } },
        ],
        query: null,
        queryParam: req.query,
        populate: pop,
        operator: 'or'
    }

    const result = await search(query); // search from DB

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        data: result.data,
        pagination: result.pagination,
        message: 'successful',
        status: 200
    })

})

/**
 * @name filterProviderTransactions
 * @description Get a reource from database
 * @route POST /vace/v1/owner/filter-transactions
 * @access Superadmin | Admin
 */
export const filterProviderTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let analytics: any = {};
    let provider: IProviderDoc | null = null;
    let result: IPagination = { 
        count: 0, 
        total: 0, 
        data: [], 
        pagination: { next: { limit: 0, page: 1 }, prev: { limit: 0, page: 1 } } 
    }

    const body = req.body as FilterTransactionDTO;
    const { type, providerName } = req.body as FilterTransactionDTO;

    const wallet = await VacepayService.getAdminWallet()

    if (!wallet) {
        return next(new ErrorResponse('Error', 404, ['wallet does not exist']))
    }

    const filters = TransactionService.defineFilterQuery(body);
    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' },
        { path: 'provider', select: '_id name' }
    ]

    // process normal filter
    if(!type){

        const query: ISearchQuery = {
            model: Transaction,
            ref: 'wallet',
            value: wallet._id,
            data: filters,
            query: null,
            queryParam: req.query,
            populate: pop,
            operator: 'and'
        }
    
        result = await search(query); // search from DB

    }

    // process filter and select 
	if(type){

		const validate = await TransactionService.validateFilterSelect(body);

        if (validate.error) {
            return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
        }

        if(providerName){
            provider = await Provider.findOne({ name: providerName });
            if (!provider) {
                return next(new ErrorResponse('Error', 404, [`provider does not exist`]))
            }
        }

		const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: true });
		const user: IUserDoc = loggedIn.data.user;

        // define request query params
        const params = await TransactionService.defineFilterDateRange(body);

        // set the query params
        req.query.from = params.from
        req.query.to = params.to;

        // search
        const query: ISearchQuery = {
            model: Transaction,
            ref: provider ? 'provider' : null,
			value: provider ? provider._id : null,
            data: filters,
            query: null,
            queryParam: req.query,
            populate: pop,
            operator: 'and'
        }

        result = await search(query); // search from DB

        if(provider){

            analytics = await TransactionRepository.aggregateAnalyticsByProvider({
                user,
                provider, 
                dates: params
            })

        } else {

            analytics = await TransactionRepository.aggregateFilterAnalytics({
                user,
                dates: params
            })

        }




	}

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        data: {
            analytics: analytics,
            transactions: result.data
        },
        pagination: result.pagination,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getAccounts
 * @description Get reource from database
 * @route GET /vace/v1/owner/accounts
 */
export const getAccounts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const vacepay = await Business.findOne({ email: process.env.SUPERADMIN_EMAIL });

    if (!vacepay) {
        return next(new ErrorResponse('Error', 404, ['business data does not exist']));
    }

    const pop = [
        { path: 'provider' },
        { path: 'business' }
    ]

    const result = await advanced(Account, pop, '', req, 'business', vacepay._id);

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: result.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name fundWallet
 * @description Get reource from database
 * @route POST /vace/v1/owner/fund-wallet
 */
export const fundWallet = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const providerName = await ProviderService.configProviderName('bank');
    const { amount, email, password } = req.body as FundBusinessWalletDTO;

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: true });
    const user: IUserDoc = loggedIn.data.user;

    if (notDefined(amount) || isZero(amount) || isNeg(amount)) {
        return next(new ErrorResponse('Error', 400, ['amount is required and cannot be negative or zero']))
    }

    const business = await Business.findOne({ email: email }).populate([ { path: 'user' } ])

    if (!business) {
        return next(new ErrorResponse('Error', 400, ['business does not exist']))
    }

    const bizUser: IUserDoc = business.user;

    if (!BusinessService.isCompliant(bizUser)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is requred to be approved`]))
    }

    const adminWallet = await VacepayService.getAdminWallet(true);

    if (!adminWallet) {
        return next(new ErrorResponse('Error', 500, [`cannot find admin wallet/business details`]))
    }

    const adminBusiness: IBusinessDoc = adminWallet.business;
    const adminAccount: IAccountDoc = BusinessService.getAccontByProvider(adminBusiness.accounts, providerName);
    const adminProvider: IProviderDoc = adminAccount.provider;

    const matched = await UserService.matchPassword({ password, user });

    if (!matched) {
        return next(new ErrorResponse('Error', 403, [`incorrect password`]))
    }

    const hasBalance = await WalletService.checkBalance({ 
        amount, 
        provider: adminProvider, 
        settings: adminBusiness.settings, 
        wallet: adminWallet, type: 'transfer',
        category: 'outflow'
    });

    if (hasBalance === false) {
        return next(new ErrorResponse('Error', 403, ['insufficient revenue balance']))
    }

    const response = await WalletService.processInternalFunding({
        amount: amount,
        recipients: [business._id],
        providerName,
        adminBusiness,
        adminWallet,
        adminProvider,
        adminAccount
    });

    if (response.error) {
        return next(new ErrorResponse('Error', 500, [`${response.message}`], response.data));
    }

    // create audit log
    createNewAuditJob({
        action: 'fundWallet',
        type: "success",
        user: user,
        entity: 'Business',
        entityId: business._id,
        controller: 'vace',
        description: `Funded business wallet with NGN${amount.toLocaleString()} from admin wallet`,
        changes: req.body
    })

    res.status(200).json({
        error: false,
        errors: [],
        data: {},
        message: 'successful',
        status: 200
    })

})

/**
 * @name withdrawRevenue
 * @description Get reource from database
 * @route POST /vace/v1/owner/withdraw-revenue
 */
export const withdrawRevenue = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const providerName = await ProviderService.configProviderName('bank');
    let response: IResult = { error: false, message: '', code: 200, data: null }

    const { amount, bank, password, saveBank } = req.body as WithdrawRevenueDTO;

    const validate = await WalletService.validateWithdrawRevenue(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', validate.code!, [`${validate.message}`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: true });
    const user: IUserDoc = loggedIn.data.user;

    const adminWallet = await VacepayService.getAdminWallet(true);

    if (!adminWallet) {
        return next(new ErrorResponse('Error', 500, [`cannot find admin wallet/business details`]))
    }

    const business: IBusinessDoc = adminWallet.business;
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider;

    const matched = await UserService.matchPassword({ password, user });

    if (!matched) {
        return next(new ErrorResponse('Error', 403, [`incorrect password`]))
    }

    const hasBalance = await WalletService.checkBalance({ amount, provider, settings: business.settings, wallet: adminWallet, type: 'transfer', category: 'outflow' });

    if (hasBalance === false) {
        return next(new ErrorResponse('Error', 403, ['insufficient revenue balance']))
    }

    const inBank = await BankService.getBank(bank.bankCode, provider.name);

    if (!inBank) {
        return next(new ErrorResponse('Error', 400, ['invalid bank code supplied']))
    }

    const txnref = TransactionService.generateRef() // vacepay reference

    if (provider.name === ProviderNameType.BANI) {

        // create transaction
        const transaction = await TransactionService.createPayoutTransaction({
            type: 'debit',
            isAdmin: true,
            business,
            wallet: adminWallet,
            provider,
            isWebhook: false,
            reference: txnref,
            feature: TransactionFeatureType.WALLET_WITHDRAW,
            amount: amount,
            bank: {
                accountName: bank.accountName,
                accountNo: bank.accountNo,
                bankCode: inBank.code,
                name: inBank.legalName,
                platformCode: inBank.platformCode
            }
        });

        /**
         * debit wallet immediately.
         * practice this to avaoid double spending or unintended overdraft
         */
        await WalletService.updateAdminWalletOutflow(adminWallet, transaction);

        response = await BaniService.payoutToBankNGN({
            amount,
            receiverType: 'personal',
            accountName: bank.accountName,
            accountNo: bank.accountNo,
            bankCode: inBank.code,
            currency: adminWallet.currency,
            reference: txnref,
            narration: `Funds withdrawal by ${user.email} to ${bank.accountName} | ${bank.accountNo}`,
        });

        if (response.error) {

            // reverse money to wallet
            await WalletService.reverseMoneyToWallet({
                account,
                isWebhook: false,
                provider,
                transaction,
                wallet: adminWallet,
                business,
                addFee: true
            })

            return next(new ErrorResponse('Error', 500, [`${response.message}`], response.data));
        }

    }

    if (provider.name === ProviderNameType.NINEPSB) {

        // TODO: Resolve bank details for 9PSB

        // verify PSB9 collection bank account
        response = await BankService.resolveBankAccount({ 
            accountNo: NinepsbService.bankAccount, 
            bankCode: NinepsbService.bankCode,
            name: provider.name
        })

        if (response.error) {
            return next(new ErrorResponse('Error', 500, [`${response.message}`], response.data))
        }

        const bankSender: ResolvedBankDTO = response.data;

        // create transaction
        const transaction = await TransactionService.createPayoutTransaction({
            type: 'debit',
            isAdmin: true,
            business,
            wallet: adminWallet,
            provider,
            isWebhook: false,
            reference: txnref,
            feature: TransactionFeatureType.WALLET_WITHDRAW,
            amount: amount,
            bank: {
                accountName: bank.accountName,
                accountNo: bank.accountNo,
                bankCode: inBank.code,
                name: inBank.legalName,
                platformCode: inBank.platformCode
            }
        });

        /**
         * debit wallet immediately.
         * practice this to avaoid double spending or unintended overdraft
         */
        await WalletService.updateAdminWalletOutflow(adminWallet, transaction);

        response = await NinepsbService.fundBankAccount({
            type: "fund-normal",
            reference: txnref,
            amount,
            recipient: {
                accountName: bank.accountName,
                accountNo: bank.accountNo,
                bankCode: inBank.code,
            },
            sender: {
                accountName: bankSender.accountName,
                accountNo: bankSender.accountNo
            },
            description: `Funds withdrawal by ${user.email} to ${bank.accountName} | ${bank.accountNo}`
        });

        if (response.error) {

            // reverse money to wallet
            await WalletService.reverseMoneyToWallet({
                account,
                isWebhook: false,
                provider,
                transaction,
                wallet: adminWallet,
                business,
                addFee: true
            })

            return next(new ErrorResponse('Error', 500, [`${response.message}`]));
        }

        if (!response.error) {

            // update trasaction immediately and wallet details
            await TransactionService.updatePayoutTransaction({
                business,
                event: null,
                isWebhook: false,
                payload: response.data,
                provider,
                transaction
            });

        }

    }

    // create audit log
    createNewAuditJob({
        action: 'withdrawRevenue',
        type: "success",
        user: user,
        entity: 'Wallet',
        entityId: adminWallet._id,
        controller: 'vace',
        description: `Withdraw money worth (NGN${amount.toLocaleString()}) from wallet`,
        changes: req.body
    })

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            reference: txnref,
            amount: amount
        },
        message: 'successful',
        status: 200
    })

})

/**
 * @name swapRevenueFunds
 * @description Update resource in the database
 * @route PUT /vace/v1/owner/swap-revenue
 */
export const swapRevenueFunds = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { amount, fromBalance, toBalance, password } = req.body as SwapRevenueFundsDTO

    const validate = await VacepayService.validateSwapFunds(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: true });
    const user: IUserDoc = loggedIn.data.user;

    const matched = await UserService.matchPassword({ password, user });

    if (!matched) {
        return next(new ErrorResponse('Error', 403, [`incorrect password`]))
    }

    const adminWallet = await VacepayService.getAdminWallet();

    if (adminWallet) {

        if (fromBalance === 'locked' && toBalance === 'available') {

            if (adminWallet.balance.locked < amount) {
                return next(new ErrorResponse('Error', 403, [`insufficient funds in locked balance`]))
            }

            const lessBal = adminWallet.balance.locked - amount;
            const moreBal = adminWallet.balance.available + amount;

            adminWallet.balance.locked = toDecimal(lessBal, 2);
            adminWallet.balance.available = toDecimal(moreBal, 2);
            await adminWallet.save();

            // create audit log
            createNewAuditJob({
                action: 'swapRevenueFunds',
                type: "success",
                user: user,
                entity: 'Wallet',
                entityId: adminWallet._id,
                controller: 'vace',
                description: `Swapped money worth (NGN${amount.toLocaleString()}) from ${fromBalance} to ${toBalance}`,
                changes: req.body
            })

        }

        if (fromBalance === 'available' && toBalance === 'locked') {

            if (adminWallet.balance.available < amount) {
                return next(new ErrorResponse('Error', 403, [`insufficient funds in available balance`]))
            }

            const lessBal = adminWallet.balance.available - amount;
            const moreBal = adminWallet.balance.locked + amount;

            adminWallet.balance.locked = toDecimal(moreBal, 2);
            adminWallet.balance.available = toDecimal(lessBal, 2);
            await adminWallet.save();

            // create audit log
            createNewAuditJob({
                action: 'swapRevenueFunds',
                type: "success",
                user: user,
                entity: 'Wallet',
                entityId: adminWallet._id,
                controller: 'vace',
                description: `Swapped money worth (NGN${amount.toLocaleString()}) from ${fromBalance} to ${toBalance}`,
                changes: req.body
            })

        }

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            walletID: adminWallet?.walletID,
            transactions: adminWallet?.transactions.length
        },
        message: 'successful',
        status: 200
    })

})

/**
 * @name swapRevenueFunds
 * @description Update resource in the database
 * @route PUT /terra/v1/owner/run-script
 */
export const runScriptTasks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { scriptType } = req.body;

    if(!scriptType){
        return next(new ErrorResponse('Error', 400, ['script type is required']));
    }

    runScriptJob({ scriptType })

    res.status(200).json({
        error: false,
        errors: [],
        data: {},
        message: 'successful',
        status: 200
    })

})

