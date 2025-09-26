import crypto from 'crypto';
import mongoose, { ObjectId, Model, Error } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { asyncHandler, strIncludesEs6, arrayIncludes, isString, UIID } from '@btffamily/vacepay'
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
import BusinessService from '../services/business.service';
import { IAccountDoc, IBank, IBankDoc, IBeneficiaryDoc, IBusinessBank, IPagination, IProviderDoc, IResult, ISearchQuery, ISettingDoc, ITransactionDoc, IUserDoc, IWalletDoc } from '../utils/types.util';
import Bank from '../models/Bank.model';
import BankService from '../services/bank.service';
import { BusinessType, PrefixType, ProviderNameType, SettingStatusType, TransactionFeatureType, TransactionStatus, UserType, VerificationType, WebhookEventType } from '../utils/enums.util';
import Card from '../models/Card.model';
import Wallet from '../models/Wallet.model';
import { BuyAirtimeDTO, BuyDataeDTO, SendMoneyDTO, WithdrawMoneyDTO } from '../dtos/wallet.dto';
import WalletService from '../services/wallet.service';
import Account from '../models/Account.model';
import ProviderService from '../services/provider.service';
import BeneficiaryService from '../services/beneficiary.service';
import BaniService from '../services/providers/bani.service';
import TransactionService from '../services/transaction.service';
import { advanced, search } from '../utils/result.util';
import Transaction from '../models/Transaction.model';
import Beneficiary from '../models/Beneficiary.model';
import { PayBillsDTO } from '../dtos/providers/bani.dto';
import { FilterTransactionDTO } from '../dtos/transaction.dto';
import VasService from '../services/vas.service';
import { VasResponseDTO } from '../dtos/vas.dto';
import NinepsbService from '../services/providers/ninepsb.service';
import { PSBApiResponseDTO } from '../dtos/providers/ninepsb.dto';
import { ResolvedBankDTO } from '../dtos/provider.dto';
import AccountService from '../services/account.service';
import BusinessRepository from '../repositories/business.repository';
import { addBankToListJob, addBeneficiaryJob } from '../queues/jobs/bank.job';
import { createNewAuditJob } from '../queues/jobs/audit.job';
import Provider from '../models/Provider.model';
import { saveIdempotentKeyJob } from '../queues/jobs/idempotent.job';
import UserService from '../services/user.service';
import TransactionRepository from '../repositories/transaction.repository';
import BankRepository from '../repositories/bank.repository';
import BeneficiaryRepository from '../repositories/beneficiary.repository';

/**
 * @name getWallets
 * @description Get reources from database
 * @route GET /vace/v1/wallets
 */
export const getWallets = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json(res.advancedResults);
})

/**
 * @name getWallet
 * @description Get a reource from database
 * @route GET /vace/v1/wallets/:id
 */
export const getWallet = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const wallet = await Wallet.findOne({ _id: req.params.id }).populate([
        { path: 'business', select: '_id name email officialEmail' },
        {
            path: 'account', populate: [
                { path: 'provider' }
            ]
        }
    ]);

    if (!wallet) {
        return next(new ErrorResponse('Error', 404, [`wallet does not exist`]))
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
 * @route GET /vace/v1/wallets/transactions/:id
 */
export const getWalletTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const wallet = await Wallet.findOne({ _id: req.params.id });

    if (!wallet) {
        return next(new ErrorResponse('Error', 404, ['wallet does not exist']))
    }

    const result = await advanced(Transaction, [], 'status', req, 'wallet', wallet._id, null, 'absolute');

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
 * @route POST /vace/v1/wallets/filter-transactions/:id
 * @access Superadmin | Admin
 */
export const filterTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let analytics: any = {};
    let result: IPagination = { count: 0, total: 0, data: [], pagination: { next: { limit: 0, page: 1 }, prev: { limit: 0, page: 1 } } }

    const body = req.body as FilterTransactionDTO;
    const { type } = req.body as FilterTransactionDTO;

    const wallet = await Wallet.findOne({ _id: req.params.id })

    if (!wallet) {
        return next(new ErrorResponse('Error', 404, ['wallet does not exist']))
    }

    const filters = TransactionService.defineFilterQuery(body);
    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' }
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

    if(type){

        const validate = await TransactionService.validateFilterSelect(body);

        if (validate.error) {
            return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
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
            ref: 'wallet',
			value: wallet._id,
            data: filters,
            query: null,
            queryParam: req.query,
            populate: pop,
            operator: 'and'
        }

        result = await search(query); // search from DB

        // capture analytics
        analytics = await TransactionRepository.aggregateFilterAnalytics({
            user,
            model: { wallet: wallet._id }, 
            dates: params
        });
        analytics.revenue = await TransactionRepository.aggregateDailyRevenue(user, { from: params.today, to: params.today })
        analytics.expenses = await TransactionRepository.aggregateDailyExpense(user, { from: params.today, to: params.today })
        analytics.inflow = await TransactionRepository.aggregateDailyInflow(user, { from: params.today, to: params.today })

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
 * @name searchTransactions
 * @description Get a reource from database
 * @route POST /vace/v1/wallets/search-transactions/:id
 * @access Business
 */
export const searchTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { reference } = req.body;

    if (!reference) {
        return next(new ErrorResponse('Error', 400, [`reference is required`]))
    }

    const wallet = await Wallet.findOne({ _id: req.params.id })

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
            { reference: { $regex: reference, $options: 'i' } },
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
 * @name sendMoneyFromWallet
 * @description Update a reource from database
 * @route POST /vace/v1/wallets/send-money/:id
 */
export const sendMoneyFromWallet = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let recipient: any = {}, trxData: any = {};
    let recipients: Array<ObjectId> = [];
    let response: IResult = { error: false, message: '', code: 200, data: null }

    const providerName = await ProviderService.configProviderName('bank');
    const { amount, bank, users, type, pin, saveBank } = req.body as SendMoneyDTO;

    const validate = await WalletService.validateSendMoney(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', validate.code!, [`${validate.message}`]))
    }

    const business = await BusinessRepository.findByIdAndSelectPin(req.params.id, true);

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    if (business.accounts.length === 0) {
        return next(new ErrorResponse('Error', 500, [`bank account has not been generated`]));
    }

    const user: IUserDoc = business.user;
    const settings: ISettingDoc = business.settings;
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider
    const wallet: IWalletDoc = business.wallet;

    if(settings.wallet.outflow === SettingStatusType.INACTIVE){
        return next(new ErrorResponse('Error', 403, [`account outflows is deactivated`]))
    }

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is still pending`]))
    }

    // check transaction pin
    const isPinValid = await BusinessService.matchPIN(business._id, pin);

    if (isPinValid === false) {
        return next(new ErrorResponse('Error', 403, ['invalid transaction pin']))
    }

    if (type === 'account' && bank) {

        // check wallet balance ( add transaction fee )
        const hasBalance = await WalletService.checkBalance({ amount, provider, settings, wallet, type: 'transfer', category: 'outflow' });

        if (hasBalance === false) {
            return next(new ErrorResponse('Error', 403, ['insufficient balance on wallet']))
        }

        const existBank = await BeneficiaryRepository.findByAccountNoAndCode({
            accountNo: bank.accountNo,
            bankCode: bank.bankCode,
            businessId: business._id,
            populate: false
        })

        if (existBank) {

            recipient = {
                accountName: existBank.accountName,
                accountNo: existBank.accountNo,
                bankCode: existBank.bank.bankCode,
                platformCode: existBank.bank.platformCode,
                legalName: existBank.bank.legalName,
                name: existBank.bank.name,
                providers: existBank.providers
            }

        } else {

            const inBank = await BankService.getBank(bank.bankCode, provider.name);

            if (!inBank) {
                return next(new ErrorResponse('Error', 400, ['invalid bank code supplied']))
            }

            recipient = {
                accountName: bank.accountName,
                accountNo: bank.accountNo,
                bankCode: inBank.code,
                platformCode: inBank.platformCode,
                legalName: inBank.legalName,
                name: inBank.name,
                providers: inBank.providers
            }
        }

        const txnref = TransactionService.generateRef() // terra reference

        if (provider.name === ProviderNameType.BANI) {

            // create transaction
            const transaction = await TransactionService.createPayoutTransaction({
                type: 'debit',
                business,
                wallet,
                provider,
                isWebhook: false,
                reference: txnref,
                amount: amount,
                bank: {
                    accountName: recipient.accountName,
                    accountNo: recipient.accountNo,
                    bankCode: recipient.bankCode,
                    name: recipient.legalName,
                    platformCode: recipient.platformCode
                },
                feature: TransactionFeatureType.WALLET_TRANSFER
            });

            trxData = transaction; // capture for idempotency data

            /**
             * debit wallet immediately.
             * practice this to avaoid double spending or unintended overdraft
             */
            const userWallet = await WalletService.updateWalletOutflow(wallet, transaction);
            await AccountService.updateAccountOutflow(account, transaction);

            // call Bani API
            response = await BaniService.payoutToBankNGN({
                amount,
                receiverType: 'personal',
                accountName: recipient.accountName,
                accountNo: recipient.accountNo,
                bankCode: recipient.bankCode,
                currency: wallet.currency,
                reference: txnref,
                narration: `bank transfer from ${business.name} to ${recipient.accountName} | ${recipient.accountNo}`
            });

            if (response.error) {

                // update transaction
                transaction.status = TransactionStatus.FAILED
                await transaction.save();

                // reverse money to wallet
                await WalletService.reverseMoneyToWallet({
                    account,
                    isWebhook: false,
                    provider,
                    transaction,
                    wallet,
                    business,
                    addFee: true
                })

                return next(new ErrorResponse('Error', 500, [`${response.message}`]));
            }

            if (!response.error) {

                // add beneficiary
                if (saveBank && saveBank === true) {

                    addBeneficiaryJob({
                        accountName: recipient.accountName,
                        accountNo: recipient.accountNo,
                        bank: {
                            bankCode: recipient.bankCode,
                            platformCode: recipient.platformCode,
                            legalName: recipient.legalName,
                            name: recipient.name,
                            providers: recipient.providers
                        },
                        business: business
                    })

                }

                // send email
                await WalletService.sendDebitTransferEmail({
                    account,
                    business,
                    transaction: transaction,
                    user,
                    wallet: userWallet
                })

            }

        }

        if (provider.name === ProviderNameType.NINEPSB) {

            // verify PSB9 collection bank account
            response = await BankService.resolveBankAccount({ 
                accountNo: NinepsbService.bankAccount, 
                bankCode: NinepsbService.bankCode,
                name: provider.name
            });
            const bankSender: ResolvedBankDTO = response.data;

            // create transaction
            const transaction = await TransactionService.createPayoutTransaction({
                type: 'debit',
                business,
                wallet,
                provider,
                isWebhook: false,
                reference: txnref,
                amount: amount,
                bank: {
                    accountName: recipient.accountName,
                    accountNo: recipient.accountNo,
                    bankCode: recipient.bankCode,
                    name: recipient.legalName,
                    platformCode: recipient.platformCode
                },
                feature: TransactionFeatureType.WALLET_TRANSFER
            });

            trxData = transaction; // capture for idempotency data

            /**
             * debit wallet immediately.
             * practice this to avaoid double spending or unintended overdraft
             */
            const userWallet = await WalletService.updateWalletOutflow(wallet, transaction);
            await AccountService.updateAccountOutflow(account, transaction);

            response = await NinepsbService.fundBankAccount({
                type: "fund-normal",
                reference: txnref,
                amount,
                recipient: {
                    accountNo: recipient.accountNo,
                    bankCode: recipient.bankCode,
                    accountName: recipient.accountName,
                },
                sender: {
                    accountName: bankSender.accountName,
                    accountNo: bankSender.accountNo
                },
                description: `bank transfer from ${business.name} to ${recipient.accountName} | ${recipient.accountNo}`
            });

            if (response.error) {

                // update transaction
                transaction.status = TransactionStatus.FAILED
                await transaction.save();

                // reverse money to wallet
                await WalletService.reverseMoneyToWallet({
                    account,
                    isWebhook: false,
                    provider,
                    transaction,
                    wallet,
                    business,
                    addFee: true
                })

                return next(new ErrorResponse('Error', 500, [`${response.message}`]));
            }

            if (!response.error) {

                // add beneficiary
                if (saveBank && saveBank === true) {

                    addBeneficiaryJob({
                        accountName: recipient.accountName,
                        accountNo: recipient.accountNo,
                        bank: {
                            bankCode: recipient.bankCode,
                            platformCode: recipient.platformCode,
                            legalName: recipient.legalName,
                            name: recipient.name,
                            providers: recipient.providers
                        },
                        business: business
                    })

                }

                // update trasaction immediately and wallet details
                await TransactionService.updatePayoutTransaction({
                    business,
                    event: null,
                    isWebhook: false,
                    payload: response.data,
                    provider,
                    transaction
                })

                // send email
                await WalletService.sendDebitTransferEmail({
                    account,
                    business,
                    transaction: transaction,
                    user,
                    wallet: userWallet
                })

            }


        }

        // create audit log
        createNewAuditJob({
            action: 'sendMoneyFromWallet',
            type: "success",
            user: user,
            entity: 'Wallet',
            entityId: wallet._id,
            controller: 'wallet',
            description: `User sent money (NGN${amount.toLocaleString()}) to bank account`,
            changes: req.body
        })

        // save idempotent key
        saveIdempotentKeyJob({
            payload: req.body,
            key: req.idempotentKey!,
            transaction: trxData,
            user: req.user
        });

        response.data = {
            reference: txnref,
            recipient,
        }

    }

    if (type === 'vacepay') {

        response.data = [];

        if (users && users.length > 3) {
            return next(new ErrorResponse('Error', 403, [`cannot send money to more than 3 vacepay users at once`]))
        }

        if (users && users.length > 0) {

            // check wallet balance ( add transaction fee )
            const hasBalance = await WalletService.checkBalance({ amount, provider, settings, wallet, frequency: users.length, type: 'transfer', category: 'outflow' });

            if (hasBalance === false) {
                return next(new ErrorResponse('Error', 403, ['insufficient balance on wallet']))
            }

            for (let i = 0; i < users.length; i++) {

                let recipient = await Business.findOne({ _id: users[i] }).populate([
                    { path: 'user' }
                ]);

                if (!recipient) {
                    return next(new ErrorResponse('Error', 404, [`cannot find one of the users specified`]));
                }

                let user: IUserDoc = recipient.user;

                if (user.businessType === BusinessType.CORPORATE && user.identity.kyb !== VerificationType.APPROVED) {
                    return next(new ErrorResponse('Error', 403, [`${recipient.name} is not yet verified for KYB compliance`]));
                }

                recipients.push(recipient._id);

            }

            // process internal transfer
            // debits and update wallets immediately
            response.data = await WalletService.processInternalTransfer({
                business,
                wallet,
                account,
                provider,
                recipients,
                amount,
                providerName
            });

        }

        // create audit log
        createNewAuditJob({
            action: 'sendMoneyFromWallet',
            type: "success",
            user: user,
            entity: 'Wallet',
            entityId: wallet._id,
            controller: 'wallet',
            description: `User sent money (NGN${amount.toLocaleString()}) to ${recipients.length} vacepay users`,
            changes: req.body
        })

        // save idempotent key
        saveIdempotentKeyJob({
            payload: req.body,
            key: req.idempotentKey!,
            transaction: response.data.sourceTransaction,
            user: req.user
        });

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: response.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name withdrawFromWallet
 * @description Update a reource from database
 * @route POST /vace/v1/wallets/withdraw/:id
 */
export const withdrawFromWallet = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let businessBank: any = {}, trxData: any = {};
    const providerName = await ProviderService.configProviderName('bank');
    let response: IResult = { error: false, message: '', code: 200, data: null }

    const { amount, bank, pin } = req.body as WithdrawMoneyDTO;

    const validate = await WalletService.validateWithdrawMoney(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', validate.code!, [`${validate.message}`]))
    }

    const business = await BusinessRepository.findByIdAndSelectPin(req.params.id, true);

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    if (business.accounts.length === 0) {
        return next(new ErrorResponse('Error', 500, [`bank account has not been generated`]));
    }

    const user: IUserDoc = business.user;
    const settings: ISettingDoc = business.settings;
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider
    const wallet: IWalletDoc = business.wallet;

    if(settings.wallet.outflow === SettingStatusType.INACTIVE){
        return next(new ErrorResponse('Error', 403, [`account outflows is deactivated`]))
    }

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is still pending`]))
    }

    // check pin validation
    const isPinValid = await BusinessService.matchPIN(business._id, pin);

    if (isPinValid === false) {
        return next(new ErrorResponse('Error', 403, ['invalid transaction pin supplied']))
    }

    // check wallet balance ( add transaction fee )
    const hasBalance = await WalletService.checkBalance({ amount, provider, settings, wallet, type: 'transfer', category: 'outflow' });

    if (hasBalance === false) {
        return next(new ErrorResponse('Error', 403, ['insufficient balance on wallet']))
    }

    const foundBank = await BankRepository.findByAccountNoAndCode({
        accountNo: bank.accountNo,
        bankCode: bank.bankCode,
        businessId: business._id,
        populate: false
    });

    if (foundBank) {

        businessBank.accountNo = foundBank.accountNo
        businessBank.accountName = foundBank.accountName;
        businessBank.details = foundBank;

    } else {

        const inBank = await BankService.getBank(bank.bankCode, provider.name);

        if (!inBank) {
            return next(new ErrorResponse('Error', 400, ['invalid bank code supplied']))
        }

        const newBank = await BankService.createBank({
            business: business,
            code: inBank.platformCode,
            accountName: bank.accountName,
            accountNo: bank.accountNo,
            provider: provider
        });

        businessBank.accountNo = newBank.accountNo
        businessBank.accountName = newBank.accountName;
        businessBank.details = newBank;

    }

    const txnref = TransactionService.generateRef() // terra reference

    if (provider.name === ProviderNameType.BANI) {

        // create transaction
        const transaction = await TransactionService.createPayoutTransaction({
            type: 'debit',
            business,
            wallet,
            provider,
            isWebhook: false,
            reference: txnref,
            feature: TransactionFeatureType.WALLET_WITHDRAW,
            amount: amount,
            bank: {
                accountName: businessBank.accountName,
                accountNo: businessBank.accountNo,
                bankCode: businessBank.details.code,
                name: businessBank.details.legalName,
                platformCode: businessBank.details.platformCode
            }
        });
        
        trxData = transaction; // capture for idemp data

        /**
         * debit wallet immediately.
         * practice this to avaoid double spending or unintended overdraft
         */
        const userWallet = await WalletService.updateWalletOutflow(wallet, transaction);
        await AccountService.updateAccountOutflow(account, transaction);

        response = await BaniService.payoutToBankNGN({
            amount,
            receiverType: 'personal',
            accountName: businessBank.accountName,
            accountNo: businessBank.accountNo,
            bankCode: businessBank.details.code,
            currency: wallet.currency,
            reference: txnref,
            narration: `bank transfer from ${business.name} to ${businessBank.accountName} | ${businessBank.accountNo}`,
        });

        if (response.error) {

            // update transaction
            transaction.status = TransactionStatus.FAILED
            await transaction.save();

            // reverse money to wallet
            await WalletService.reverseMoneyToWallet({
                account,
                isWebhook: false,
                provider,
                transaction,
                wallet,
                business,
                addFee: true
            })

            return next(new ErrorResponse('Error', 500, [`${response.message}`], response.data));
        }

        if (!response.error) {

            // send email
            await WalletService.sendDebitTransferEmail({
                account,
                business,
                transaction: transaction,
                user,
                wallet: userWallet
            })

        }

    }

    if (provider.name === ProviderNameType.NINEPSB) {

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
            business,
            wallet,
            provider,
            isWebhook: false,
            reference: txnref,
            feature: 'wallet-withdraw',
            amount: amount,
            bank: {
                accountName: businessBank.accountName,
                accountNo: businessBank.accountNo,
                bankCode: businessBank.details.code,
                name: businessBank.details.legalName,
                platformCode: businessBank.details.platformCode
            }
        });

        trxData = transaction; // capture for idemp data

        /**
         * debit wallet immediately.
         * practice this to avaoid double spending or unintended overdraft
         */
        const userWallet = await WalletService.updateWalletOutflow(wallet, transaction);
        await AccountService.updateAccountOutflow(account, transaction);

        response = await NinepsbService.fundBankAccount({
            type: "fund-normal",
            reference: txnref,
            amount,
            recipient: {
                accountName: businessBank.accountName,
                accountNo: businessBank.accountNo,
                bankCode: businessBank.details.code,
            },
            sender: {
                accountName: bankSender.accountName,
                accountNo: bankSender.accountNo
            },
            description: `bank transfer from ${business.name} to ${businessBank.accountName} | ${businessBank.accountNo}`
        });

        if (response.error) {

            // update transaction
            transaction.status = TransactionStatus.FAILED
            await transaction.save();

            // reverse money to wallet
            await WalletService.reverseMoneyToWallet({
                account,
                isWebhook: false,
                provider,
                transaction,
                wallet,
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
            })

            // send email
            await WalletService.sendDebitTransferEmail({
                account,
                business,
                transaction: transaction,
                user,
                wallet: userWallet
            })

        }

    }

    // create audit log
    createNewAuditJob({
        action: 'withdrawFromWallet',
        type: "success",
        user: user,
        entity: 'Wallet',
        entityId: wallet._id,
        controller: 'wallet',
        description: `Withdraw (NGN${amount.toLocaleString()}) from wallet to bank account`,
        changes: req.body
    })

    // save idempotent key
    saveIdempotentKeyJob({
        payload: req.body,
        key: req.idempotentKey!,
        transaction: trxData,
        user: req.user
    });

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            amount,
            reference: txnref,
            accountNo: businessBank.accountNo,
            accountName: businessBank.accountName,
            bank: {
                name: businessBank.details.legalName,
                bankCode: businessBank.details.code
            },
        },
        message: 'successful',
        status: 200
    })

})

/**
 * @name buyAirtime
 * @description Update a reource from database
 * @route POST /vace/v1/wallets/buy-airtime/:id
 */
export const buyAirtime = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const providerName = await ProviderService.configProviderName('bills');
    let response: IResult = { error: false, message: '', code: 200, data: null }

    const { amount, phoneNumber, phoneCode, network, pin } = req.body as BuyAirtimeDTO;

    const validate = await WalletService.validateBuyAirTimme(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', validate.code!, [`${validate.message}`]))
    }

    const billProvider = await Provider.findOne({ name: providerName });

    if (!billProvider) {
        return next(new ErrorResponse('Error', 500, ['bill provider error. please contact support']))
    }

    const business = await BusinessRepository.findByIdAndSelectPin(req.params.id, true)

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    if (business.accounts.length === 0) {
        return next(new ErrorResponse('Error', 500, [`bank account has not been generated`]));
    }

    const user: IUserDoc = business.user;
    const settings: ISettingDoc = business.settings;
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider
    const wallet: IWalletDoc = business.wallet;

    if(settings.bills.airtime === SettingStatusType.INACTIVE){
        return next(new ErrorResponse('Error', 403, [`account airtime is deactivated`]))
    }

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is still pending`]))
    }

    // check pin validation
    const isPinValid = await BusinessService.matchPIN(business._id, pin);

    if (isPinValid === false) {
        return next(new ErrorResponse('Error', 403, ['invalid transaction pin supplied']))
    }

    // check wallet balance ( add transaction fee )
    const hasBalance = await WalletService.checkBalance({ amount, settings, provider, wallet, type: 'bill', category: 'outflow' });

    if (hasBalance === false) {
        return next(new ErrorResponse('Error', 403, ['insufficient balance on wallet']))
    }

    // process transaction
    const txnref = TransactionService.generateRef(); // terra reference

    if (billProvider.name === ProviderNameType.BANI) {

        let _phoneCode = phoneCode ? phoneCode : '+234';
        let phone = VasService.attachPhoneCode(_phoneCode, phoneNumber);

        // create transaction
        const transaction = await TransactionService.createVASTransaction({
            type: 'debit',
            business,
            wallet,
            provider: billProvider,
            isWebhook: false,
            reference: txnref,
            feature: TransactionFeatureType.WALLET_AIRTIME,
            amount: amount
        });

        /**
         * debit wallet immediately.
         * practice this to avaoid double spending or unintended overdraft
         */
        const userWallet = await WalletService.updateWalletVASOutflow(wallet, transaction);
        await AccountService.updateAccountOutflow(account, transaction);

        // call Bani API
        response = await BaniService.buyAirtime({
            amount,
            phoneNumber: phone,
            network: network,
            reference: txnref,
            narration: `${amount} ${network} airtime recharge`,
        });

        if (response.error) {

            // update transaction
            transaction.status = TransactionStatus.FAILED
            await transaction.save();

            await WalletService.reverseMoneyToWallet({
                account,
                isWebhook: false,
                provider,
                transaction,
                wallet,
                business,
                addFee: true
            });

            return next(new ErrorResponse('Error', 500, [`${response.message}`]));
        }

        if (!response.error) {

            // update transaction
            transaction.vasData.ref = response.data.vas_ref;
            await transaction.save();

            // send email
            await WalletService.sendDebitTransferEmail({
                account,
                business,
                transaction: transaction,
                user,
                wallet: userWallet
            })

        }

    }

    if (billProvider.name === ProviderNameType.NINEPSB) {

        // get the nextwork
        response = await NinepsbService.getNetwork({ phone: phoneNumber });

        if (response.error) {
            return next(new ErrorResponse('Error', 500, [`${response.message}`]));
        }

        const _netresp: PSBApiResponseDTO = response.data;

        // create transaction
        const transaction = await TransactionService.createVASTransaction({
            type: 'debit',
            business,
            wallet,
            provider,
            isWebhook: false,
            reference: txnref,
            feature: TransactionFeatureType.WALLET_AIRTIME,
            amount: amount
        });

        /**
         * debit wallet immediately.
         * practice this to avaoid double spending or unintended overdraft
         */
        const userWallet = await WalletService.updateWalletVASOutflow(wallet, transaction);
        await AccountService.updateAccountOutflow(account, transaction);

        response = await NinepsbService.airtimeTopup({
            accountNo: NinepsbService.bankAccount,
            amount: amount,
            network: _netresp.network,
            phone: phoneNumber,
            reference: txnref
        });

        if (response.error) {

            // update transaction
            transaction.status = TransactionStatus.FAILED
            await transaction.save();

            // reverse money to wallet
            await WalletService.reverseMoneyToWallet({
                account,
                isWebhook: false,
                provider,
                transaction,
                wallet,
                business,
                addFee: true
            })

            return next(new ErrorResponse('Error', 422, [`${response.message}`], response.data))
        }

        if (!response.error) {

            await TransactionService.updateVASTransaction({
                business,
                event: 'vas_completed',
                isWebhook: false,
                payload: response.data,
                provider,
                transaction: transaction,
                type: 'airtime-topup'
            });

            // send email
            await WalletService.sendDebitTransferEmail({
                account,
                business,
                transaction: transaction,
                user, 
                wallet: userWallet
            })

        }

    }

    // create audit log
    createNewAuditJob({
        action: 'buyAirtime',
        type: "success",
        user: user,
        entity: 'Wallet',
        entityId: wallet._id,
        controller: 'wallet',
        description: `Bought airtime worth (NGN${amount.toLocaleString()}) from wallet`,
        changes: req.body
    })

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            amount,
            reference: txnref
        },
        message: 'successful',
        status: 200
    })

})

/**
 * @name buyData
 * @description Update a reource from database
 * @route POST /vace/v1/wallets/buy-data/:id
 */
export const buyData = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const providerName = await ProviderService.configProviderName('bills');
    let response: IResult = { error: false, message: '', code: 200, data: null }

    const { amount, phoneNumber, phoneCode, dataId, pin, network } = req.body as BuyDataeDTO;

    const validate = await WalletService.validateBuyData(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', validate.code!, [`${validate.message}`]))
    }

    const billProvider = await Provider.findOne({ name: providerName });

    if (!billProvider) {
        return next(new ErrorResponse('Error', 500, ['bill provider error. please contact support']))
    }

    const business = await BusinessRepository.findByIdAndSelectPin(req.params.id, true)

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    if (business.accounts.length === 0) {
        return next(new ErrorResponse('Error', 500, [`bank account has not been generated`]));
    }

    const user: IUserDoc = business.user;
    const settings: ISettingDoc = business.settings;
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider
    const wallet: IWalletDoc = business.wallet;

    if(settings.bills.data === SettingStatusType.INACTIVE){
        return next(new ErrorResponse('Error', 403, [`account data bundle is deactivated`]))
    }

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compiance is still pending`]))
    }

    // check pin validation
    const isPinValid = await BusinessService.matchPIN(business._id, pin);

    if (isPinValid === false) {
        return next(new ErrorResponse('Error', 403, ['invalid transaction pin supplied']))
    }

    // check wallet balance ( add transaction fee )
    const hasBalance = await WalletService.checkBalance({ amount, provider, settings, wallet, type: 'bill', category: 'outflow' });

    if (hasBalance === false) {
        return next(new ErrorResponse('Error', 403, ['insufficient balance on wallet']))
    }

    // process transaction
    const txnref = TransactionService.generateRef(); // terra reference

    if (billProvider.name === ProviderNameType.BANI) {

        let _phoneCode = phoneCode ? phoneCode : '+234';
        let phone = VasService.attachPhoneCode(_phoneCode, phoneNumber);

        // create transaction
        const transaction = await TransactionService.createVASTransaction({
            type: 'debit',
            business,
            wallet,
            provider: billProvider,
            isWebhook: false,
            reference: txnref,
            feature: TransactionFeatureType.WALLET_DATA,
            amount: amount
        });

        /**
         * debit wallet immediately.
         * practice this to avaoid double spending or unintended overdraft
         */
        const userWallet = await WalletService.updateWalletVASOutflow(wallet, transaction);
        await AccountService.updateAccountOutflow(account, transaction);

        response = await BaniService.buyData({
            phoneNumber: phone,
            amount,
            dataId: parseInt(dataId.toString()),
            reference: txnref,
            narration: `${amount} data top-up`,
        });

        if (response.error) {

            // update transaction
            transaction.status = TransactionStatus.FAILED
            await transaction.save();

            await WalletService.reverseMoneyToWallet({
                account,
                isWebhook: false,
                provider,
                transaction,
                wallet,
                business,
                addFee: true
            });

            return next(new ErrorResponse('Error', 500, [`${response.message}`]));
        }

        if (!response.error) {

            // update transaction
            transaction.vasData.ref = response.data.vas_ref;
            await transaction.save();

            // send email
            await WalletService.sendDebitTransferEmail({
                account,
                business,
                transaction: transaction,
                user,
                wallet: userWallet
            })

        }

    }

    if (billProvider.name === ProviderNameType.NINEPSB) {

        // get the nextwork
        response = await NinepsbService.getNetwork({ phone: phoneNumber });

        if (response.error) {
            return next(new ErrorResponse('Error', 500, [`${response.message}`]));
        }

        const _netresp: PSBApiResponseDTO = response.data;

        // create transaction
        const transaction = await TransactionService.createVASTransaction({
            type: 'debit',
            business,
            wallet,
            provider,
            isWebhook: false,
            reference: txnref,
            feature: TransactionFeatureType.WALLET_DATA,
            amount: amount
        });

        /**
         * debit wallet immediately.
         * practice this to avaoid double spending or unintended overdraft
         */
        const userWallet = await WalletService.updateWalletVASOutflow(wallet, transaction);
        await AccountService.updateAccountOutflow(account, transaction);

        response = await NinepsbService.dataTopup({
            accountNo: NinepsbService.bankAccount,
            amount: amount,
            network: _netresp.network,
            phone: phoneNumber,
            reference: txnref,
            productId: dataId.toString()
        });

        if (response.error) {

            // update transaction
            transaction.status = TransactionStatus.FAILED
            await transaction.save();

            // reverse money to wallet
            await WalletService.reverseMoneyToWallet({
                account,
                isWebhook: false,
                provider,
                transaction,
                wallet,
                business,
                addFee: true
            })

            return next(new ErrorResponse('Error', 422, [`${response.message}`], response.data))
        }

        if (!response.error) {

            await TransactionService.updateVASTransaction({
                business,
                event: 'vas_completed',
                isWebhook: false,
                payload: response.data,
                provider,
                transaction: transaction,
                type: 'data-topup'
            })

            // send email
            await WalletService.sendDebitTransferEmail({
                account,
                business,
                transaction: transaction,
                user,
                wallet: userWallet
            })

        }

    }

    // create audit log
    createNewAuditJob({
        action: 'buyData',
        type: "success",
        user: user,
        entity: 'Wallet',
        entityId: wallet._id,
        controller: 'wallet',
        description: `Bought data worth (NGN${amount.toLocaleString()}) from wallet`,
        changes: req.body
    })

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            amount,
            reference: txnref
        },
        message: 'successful',
        status: 200
    })

})

/**
 * @name payBill
 * @description Update a reource from database
 * @route POST /vace/v1/wallets/bill/:id
 */
export const payBill = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const providerName = await ProviderService.configProviderName('bills');
    let response: IResult = { error: false, message: '', code: 200, data: null }

    const { phoneNumber, phoneCode, itemId, pin, amount, customerId, billerId, type, addons } = req.body as PayBillsDTO;

    const validate = await WalletService.validatePayBill(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    const billProvider = await Provider.findOne({ name: providerName });

    if (!billProvider) {
        return next(new ErrorResponse('Error', 500, ['bill provider error. please contact support']))
    }

    const business = await BusinessRepository.findByIdAndSelectPin(req.params.id, true)

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    if (business.accounts.length === 0) {
        return next(new ErrorResponse('Error', 500, [`bank account has not been generated`]));
    }

    const user: IUserDoc = business.user;
    const settings: ISettingDoc = business.settings;
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider
    const wallet: IWalletDoc = business.wallet;

    if(type === 'cable' && settings.bills.cable === SettingStatusType.INACTIVE){
        return next(new ErrorResponse('Error', 403, [`account cable top-up is deactivated`]))
    }

    if(type === 'utility' && settings.bills.electricity === SettingStatusType.INACTIVE){
        return next(new ErrorResponse('Error', 403, [`account electricity top-up is deactivated`]))
    }

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is still pending`]))
    }

    // check pin validation
    const isPinValid = await BusinessService.matchPIN(business._id, pin);

    if (isPinValid === false) {
        return next(new ErrorResponse('Error', 403, ['invalid transaction pin supplied']))
    }

    // check wallet balance ( add transaction fee )
    const hasBalance = await WalletService.checkBalance({ amount, provider, settings, wallet, type: 'bill', category: 'outflow' });

    if (hasBalance === false) {
        return next(new ErrorResponse('Error', 403, ['insufficient balance on wallet']))
    }

    // process transaction
    const txnref = TransactionService.generateRef(); // terra reference

    if (billProvider.name === ProviderNameType.BANI) {

        let _phoneCode = phoneCode ? phoneCode : '+234';
        let phone = VasService.attachPhoneCode(_phoneCode, phoneNumber);

        // validate biller first
        response = await BaniService.validateBiller({
            amount,
            customerItem: customerId,
            itemId,
            currency: 'NGN'
        });

        if (response.error) {
            return next(new ErrorResponse('Error', 422, [`${response.message}`]))
        }

        const biller: VasResponseDTO = VasService.mapVASResponse({ providerName, type: 'validate-biller', response: response.data })

        // create transaction
        const transaction = await TransactionService.createVASTransaction({
            type: 'debit',
            business,
            wallet,
            provider,
            isWebhook: false,
            reference: txnref,
            feature: TransactionFeatureType.WALLET_BILL,
            amount: amount
        });

        /**
         * debit wallet immediately.
         * practice this to avaoid double spending or unintended overdraft
         */
        const userWallet = await WalletService.updateWalletVASOutflow(wallet, transaction);
        await AccountService.updateAccountOutflow(account, transaction);

        response = await BaniService.payBill({
            phoneNumber: phone,
            customerItem: biller.customer.id,
            customerName: biller.customer.name,
            billerCode: biller.billerCode,
            reference: txnref,
            itemId,
            narration: `${amount} bill payment`,
            amount
        });

        if (response.error) {

            // update transaction
            transaction.status = TransactionStatus.FAILED
            await transaction.save();

            await WalletService.reverseMoneyToWallet({
                account,
                isWebhook: false,
                provider,
                transaction,
                wallet,
                business,
                addFee: true
            });

            return next(new ErrorResponse('Error', 500, [`${response.message}`]));
        }

        if (!response.error) {

            // update transaction
            transaction.vasData.ref = response.data.vas_ref;
            await transaction.save();

            const valToken = await BaniService.validateBillTransaction({
                vaceRef: transaction.reference
            })

            await console.log(valToken);

            // send email
            await WalletService.sendDebitTransferEmail({
                account,
                business,
                transaction: transaction,
                user,
                wallet: userWallet
            })

        }

    }

    if (billProvider.name === ProviderNameType.NINEPSB) {

        if (!billerId) {
            return next(new ErrorResponse('Error', 400, [`biller id is required`]))
        }

        response = await NinepsbService.validateInputFields({
            amount,
            customerId,
            itemId: itemId.toString(),
            billerId,
            firstName: business.name.split(' ')[0],
            lastName: business.name.split(' ')[1]
        });

        if (response.error) {
            return next(new ErrorResponse('Error', 422, [`${response.message}`]))
        }

        // map VAS response
        const biller: VasResponseDTO = VasService.mapVASResponse({
            providerName, type: 'validate-biller',
            response: response.data,
            itemId: itemId.toString(),
            amount: amount,
            billerId: billerId,
            customerId: customerId
        });

        // create transaction
        const transaction = await TransactionService.createVASTransaction({
            type: 'debit',
            business,
            wallet,
            provider,
            isWebhook: false,
            reference: txnref,
            feature: TransactionFeatureType.WALLET_BILL,
            amount: amount
        });

        /**
         * debit wallet immediately.
         * practice this to avaoid double spending or unintended overdraft
         */
        const userWallet = await WalletService.updateWalletVASOutflow(wallet, transaction);
        await AccountService.updateAccountOutflow(account, transaction);

        response = await NinepsbService.initiateBillPayment({
            accountNo: NinepsbService.bankAccount,
            amount: amount,
            billerId: biller.billerId,
            customerId: biller.customer.id,
            itemId: biller.billerItem.itemId.toString(),
            metadata: biller.metadata,
            name: biller.customer.name,
            phoneNumber: phoneNumber,
            reference: txnref
        })

        if (response.error) {

            // update transaction
            transaction.status = TransactionStatus.FAILED
            await transaction.save();

            // reverse money to wallet
            await WalletService.reverseMoneyToWallet({
                account,
                isWebhook: false,
                provider,
                transaction,
                wallet,
                business,
                addFee: true
            })

            return next(new ErrorResponse('Error', 422, [`${response.message}`], response.data))
        }

        if (!response.error) {

            await TransactionService.updateVASTransaction({
                business,
                event: 'vas_completed',
                isWebhook: false,
                payload: response.data,
                provider,
                transaction: transaction,
                amount: amount,
                type: type === 'cable' ? 'cable-bill' : 'utility-bill'
            })

            // send email
            await WalletService.sendDebitTransferEmail({
                account,
                business,
                transaction: transaction,
                user,
                wallet: userWallet
            })

        }

    }

    // create audit log
    createNewAuditJob({
        action: 'payBill',
        type: "success",
        user: user,
        entity: 'Wallet',
        entityId: wallet._id,
        controller: 'wallet',
        description: `Bills payment worth (NGN${amount.toLocaleString()}) from wallet`,
        changes: req.body
    })

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            amount,
            reference: txnref,
            token: response.data.tokenCode ? response.data.tokenCode : null,
            power: response.data.amountOfPower ? response.data.amountOfPower : null
        },
        message: 'successful',
        status: 200
    })

})