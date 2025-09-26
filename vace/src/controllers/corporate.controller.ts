import crypto from 'crypto';
import mongoose, { ObjectId, Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { asyncHandler, strIncludesEs6, arrayIncludes, isString, notDefined, isZero, isNeg, UIID, hasDecimal, isPrecise, isBase64, Random, hasSAC, isPos, checkDateFormat, checkTimeFormat, dateToday, toDecimal, charLen } from '@btffamily/vacepay'
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
import { IAccountDoc, IBankDoc, IBeneficiaryDoc, IBusinessDoc, IInvoiceDoc, IPagination, IPaymentLinkDoc, IProductDoc, IProviderDoc, IRefundDoc, IResult, ISearchQuery, ISettingDoc, ITransactionDoc, IUserDoc, IWalletDoc } from '../utils/types.util';
import { advanced, search } from '../utils/result.util';
import Provider from '../models/Provider.model';
import WalletService from '../services/wallet.service';
import ProviderService from '../services/provider.service';
import BusinessService from '../services/business.service';
import { AmountType, BusinessType, FeatureType, PrefixType, ProviderNameType, SettingStatusType, TransactionFeatureType, TransactionStatus, UserType, VerificationType, WebhookEventType } from '../utils/enums.util';
import BankService from '../services/bank.service';
import NinepsbService from '../services/providers/ninepsb.service';
import { PSBApiResponseDTO } from '../dtos/providers/ninepsb.dto';
import UserService from '../services/user.service';
import Transaction from '../models/Transaction.model';
import Product from '../models/Product.model';
import { CreateProductDTO, FilterProductDTO, UpdateProductDTO } from '../dtos/product.dto';
import ProductService from '../services/product.service';
import PaymentLink from '../models/PaymentLink.model';
import { AttachLinkResourceDTO, CreatePaymentLinkDTO, FilterPaymentLinkDTO, UpdatePaymentLinkDTO } from '../dtos/payment.link.dto';
import PaymentLinkService from '../services/payment.link.service';
import Subaccount from '../models/Subaccount.model';
import { CreateSubaccountRequestDTO, FilterSubaccountDTO, UpdateSubaccountDTO } from '../dtos/subaccount.dto';
import SubAccountService from '../services/subaccount.service';
import Invoice from '../models/Invoice.model';
import { CreateInvoiceRequestDTO, FilterInvoiceDTO, UpdateInvoiceDTO } from '../dtos/invoice.dto';
import InvoiceService from '../services/invoice.service';
import Bank from '../models/Bank.model';
import { FilterTransactionDTO, InitTransactionRequestDTO } from '../dtos/transaction.dto';
import TransactionService from '../services/transaction.service';
import Beneficiary from '../models/Beneficiary.model';
import { CreateBusinessBankDTO } from '../dtos/business.dto';
import { ResolvedBankDTO } from '../dtos/provider.dto';
import { BuyAirtimeDTO, BuyDataeDTO, SendMoneyDTO, WithdrawMoneyCorpDTO, WithdrawMoneyDTO } from '../dtos/wallet.dto';
import beneficiaryService from '../services/beneficiary.service';
import BaniService from '../services/providers/bani.service';
import AccountService from '../services/account.service';
import VasService from '../services/vas.service';
import { ValidateBillerDTO, VasResponseDTO } from '../dtos/vas.dto';
import { BaniResponseDTO, PayBillsDTO } from '../dtos/providers/bani.dto';
import StorageService from '../services/storage.service';
import SubaccountService from '../services/subaccount.service';
import Refund from '../models/Refund.model';
import { CreateRefundDTO } from '../dtos/refund.dto';
import RefundService from '../services/refund.service';
import VacepayService from '../services/vacepay.service';
import ENV from '../utils/env.util';
import CorporateMapper from '../mappers/corporate.mapper';
import { createNewAuditJob } from '../queues/jobs/audit.job';
import { sendWebhookNotificationJob } from '../queues/jobs/webhook.job';
import { addBeneficiaryJob } from '../queues/jobs/bank.job';
import TransactionRepository from '../repositories/transaction.repository';
import BankRepository from '../repositories/bank.repository';
import beneficiaryRepository from '../repositories/beneficiary.repository';

/**
 * @name getBusinessAccount
 * @description Get a reource from database
 * @route GET /vace/v1/corporate/account
 */
export const getBusinessAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;

    let business = await Business.findOne({ _id: user.business._id }).populate([
        { path: 'user' },
        { path: 'wallet' },
        {
            path: 'accounts', populate: [
                { path: 'provider' }
            ]
        },
        { path: 'card.details' },
        { path: 'cards.details' }
    ]).select('-card.authCode -cards.authCode');

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const mapped = await CorporateMapper.mapAccountDetails(business);

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getWalletDetails
 * @description Get a reource from database
 * @route GET /vace/v1/corporate/wallet
 */
export const getWalletDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;
    const wallet: IWalletDoc = business.wallet;

    const mapped = await CorporateMapper.mapGetWallet(wallet);

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getWalletTransactions
 * @description Get a reource from database
 * @route GET /vace/v1/corporate/wallet-transactions
 */
export const getWalletTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const result = await advanced(Transaction, [], 'status', req, 'wallet', business.wallet._id, null, 'absolute');
    const mapped = await CorporateMapper.mapTransactionList(result.data)

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name sendMoney
 * @description Update a reource from database
 * @route POST /vace/v1/corporate/transfer
 */
export const sendMoneyFromWallet = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let recipient: any = {};
    let recipients: Array<ObjectId> = [];
    let response: IResult = { error: false, message: '', code: 200, data: null }

    const providerName = await ProviderService.configProviderName('bank');
    const { amount, bank, users, type, pin, reference, saveBank } = req.body as SendMoneyDTO;

    const validate = await WalletService.validateSendMoneyCorp(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', validate.code!, [`${validate.message}`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;
    const settings: ISettingDoc = loggedIn.data.settings;

    if (business.accounts.length === 0) {
        return next(new ErrorResponse('Error', 500, [`bank account has not been generated`]));
    }

    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider
    const wallet: IWalletDoc = business.wallet;

    if (settings.wallet.outflow === SettingStatusType.INACTIVE) {
        return next(new ErrorResponse('Error', 403, [`account outflows is deactivated`]))
    }

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending`]))
    }

    // check transaction pin
    const isPinValid = await BusinessService.matchPIN(business._id, pin);

    if (isPinValid === false) {
        return next(new ErrorResponse('Error', 403, ['invalid transaction pin supplied']))
    }

    if (type === 'account' && bank) {

        // check wallet balance ( add transaction fee )
        const hasBalance = await WalletService.checkBalance({ amount, provider, settings, wallet, type: 'transfer', category: 'outflow' });

        if (hasBalance === false) {
            return next(new ErrorResponse('Error', 403, ['insufficient balance on wallet']))
        }

        const existBank = await beneficiaryRepository.findByAccountNoAndCode({
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

            const resolve = await BankService.resolveBankAccount({ bankCode: inBank.platformCode, accountNo: bank.accountNo, name: provider.name })

            if (resolve.error) {
                return next(new ErrorResponse('Error', 403, [`${resolve.message}`]));
            }

            let resolvedBank: ResolvedBankDTO = resolve.data;

            recipient = {
                accountName: resolvedBank.accountName,
                accountNo: resolvedBank.accountNo,
                bankCode: inBank.code,
                platformCode: inBank.platformCode,
                legalName: inBank.legalName,
                name: inBank.name,
                providers: inBank.providers
            }
        }

        // process transfer
        const txnref = TransactionService.generateRef(); // vacepay reference

        if (provider.name === ProviderNameType.BANI) {

            // create transaction
            const transaction = await TransactionService.createPayoutTransaction({
                type: 'debit',
                business,
                wallet,
                provider,
                isWebhook: false,
                reference: txnref,
                merchantRef: reference,
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

            /**
             * debit wallet immediately.
             * practice this to avaoid double spending or unintended overdraft
             */
            const userWallet = await WalletService.updateWalletOutflow(wallet, transaction);
            await AccountService.updateAccountOutflow(account, transaction);

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
            })
            const bankSender: ResolvedBankDTO = response.data;

            // create transaction
            const transaction = await TransactionService.createPayoutTransaction({
                type: 'debit',
                business,
                wallet,
                provider,
                isWebhook: false,
                reference: txnref,
                merchantRef: reference,
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
            controller: 'corporate',
            description: `User sent money (NGN${amount.toLocaleString()}) to bank account`,
            changes: req.body
        })

        response.data = {
            reference: reference ? reference : txnref,
            recipient
        }

    }

    if (type === 'vacepay') {

        response.data = [];

        if (users && users.length > 3) {
            return next(new ErrorResponse('Error', 403, [`cannot send money to more than 3 vacepay users at once`]))
        }

        if (users && users.length > 0) {

            // check wallet balance ( add transaction fee )
            const hasBalance = await WalletService.checkBalance({ amount, provider, wallet, settings, frequency: users.length, type: 'transfer', category: 'outflow' });

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
            response.data = await WalletService.processInternalTransfer({
                business,
                wallet,
                account,
                provider,
                recipients,
                amount,
                providerName
            });

            response.data = await CorporateMapper.mapInternalTransferList(response.data);

        }

        // create audit log
        createNewAuditJob({
            action: 'sendMoneyFromWallet',
            type: "success",
            user: user,
            entity: 'Wallet',
            entityId: wallet._id,
            controller: 'corporate',
            description: `User sent money (NGN${amount.toLocaleString()}) to ${recipients.length} vacepay users`,
            changes: req.body
        })

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
 * @route POST /vace/v1/corporate/withdraw
 */
export const withdrawFromWallet = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let businessBank: any = {};
    const providerName = await ProviderService.configProviderName('bank');
    let response: IResult = { error: false, message: '', code: 200, data: null }

    const { amount, accountNo, pin, reference } = req.body as WithdrawMoneyCorpDTO;

    const validate = await WalletService.validateWithdrawMoneyCorp(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', validate.code!, [`${validate.message}`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;
    const settings: ISettingDoc = loggedIn.data.settings;

    if (business.accounts.length === 0) {
        return next(new ErrorResponse('Error', 500, [`bank account has not been generated`]));
    }

    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider
    const wallet: IWalletDoc = business.wallet;

    if (settings.wallet.outflow === SettingStatusType.INACTIVE) {
        return next(new ErrorResponse('Error', 403, [`account outflows is deactivated`]))
    }

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending`]))
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

    const foundBank = await BankRepository.findByAccountNo(accountNo, business._id, false);

    if (!foundBank) {
        return next(new ErrorResponse('Error', 404, ['bank account does not exist']))
    }

    businessBank.accountNo = foundBank.accountNo
    businessBank.accountName = foundBank.accountName;
    businessBank.details = foundBank;
    const _bank: IBankDoc = businessBank.details;

    // process transfer
    const txnref = TransactionService.generateRef(); // vacepay reference

    if (provider.name === ProviderNameType.BANI) {

        // create transaction
        const transaction = await TransactionService.createPayoutTransaction({
            type: 'debit',
            business,
            wallet,
            provider,
            isWebhook: false,
            reference: txnref,
            merchantRef: reference,
            feature: TransactionFeatureType.WALLET_WITHDRAW,
            amount: amount,
            bank: {
                accountName: businessBank.accountName,
                accountNo: businessBank.accountNo,
                bankCode: _bank.code,
                name: _bank.legalName,
                platformCode: _bank.platformCode
            }
        });

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
            bankCode: _bank.code,
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
            merchantRef: reference,
            amount: amount,
            bank: {
                accountName: businessBank.accountName,
                accountNo: businessBank.accountNo,
                bankCode: _bank.code,
                name: _bank.legalName,
                platformCode: _bank.platformCode
            }
        });

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
                accountNo: businessBank.accountNo,
                bankCode: _bank.code,
                accountName: businessBank.accountName,
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
        controller: 'corporate',
        description: `Withdraw (NGN${amount.toLocaleString()}) from wallet to bank account`,
        changes: req.body
    })

    const mapped = await CorporateMapper.mapBankData(_bank)

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            accountNo: businessBank.accountNo,
            accountName: businessBank.accountName,
            bank: {
                name: mapped.name,
                bankCode: mapped.code
            },
            amount: toDecimal(amount, 2),
            reference: reference ? reference : txnref
        },
        message: 'successful',
        status: 200
    })

})

/**
 * @name buyAirtime
 * @description Update a reource from database
 * @route POST /vace/v1/corporate/airtime
 */
export const buyAirtime = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const providerName = await ProviderService.configProviderName('bills');
    let response: IResult = { error: false, message: '', code: 200, data: null }

    const { amount, phoneNumber, phoneCode, network, pin, reference } = req.body as BuyAirtimeDTO;

    const validate = await WalletService.validateBuyAirTimme(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', validate.code!, [`${validate.message}`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const billProvider = await Provider.findOne({ name: providerName });

    if (!billProvider) {
        return next(new ErrorResponse('Error', 500, ['bill provider error. please contact support']))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;
    const settings: ISettingDoc = loggedIn.data.settings;

    if (business.accounts.length === 0) {
        return next(new ErrorResponse('Error', 500, [`bank account has not been generated`]));
    }

    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider
    const wallet: IWalletDoc = business.wallet;

    if (settings.bills.airtime === SettingStatusType.INACTIVE) {
        return next(new ErrorResponse('Error', 403, [`account airtime is deactivated`]))
    }

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending`]))
    }

    // check pin validation
    const isPinValid = await BusinessService.matchPIN(business._id, pin);

    if (isPinValid === false) {
        return next(new ErrorResponse('Error', 403, ['invalid transaction pin supplied']))
    }

    // check wallet balance ( add transaction fee )
    const hasBalance = await WalletService.checkBalance({ amount, provider, wallet, settings, type: 'bill', category: 'outflow' });

    if (hasBalance === false) {
        return next(new ErrorResponse('Error', 403, ['insufficient balance on wallet']))
    }

    // process transaction
    const txnref = TransactionService.generateRef(); // vacepay reference

    if (provider.name === ProviderNameType.BANI) {

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
            merchantRef: reference,
            feature: TransactionFeatureType.WALLET_AIRTIME,
            amount: amount,
        });

        /**
         * debit wallet immediately.
         * practice this to avaoid double spending or unintended overdraft
         */
        const userWallet = await WalletService.updateWalletVASOutflow(wallet, transaction);
        await AccountService.updateAccountOutflow(account, transaction);

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

    if (provider.name === ProviderNameType.NINEPSB) {

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
            merchantRef: reference,
            feature: TransactionFeatureType.WALLET_AIRTIME,
            amount: amount
        })

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
        controller: 'corporate',
        description: `Bought airtime worth (NGN${amount.toLocaleString()}) from wallet`,
        changes: req.body
    })

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            amount: toDecimal(amount, 2),
            reference: reference ? reference : txnref,
        },
        message: 'successful',
        status: 200
    })

})

/**
 * @name buyData
 * @description Update a reource from database
 * @route POST /vace/v1/corporate/data
 */
export const buyData = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const providerName = await ProviderService.configProviderName('bills');
    let response: IResult = { error: false, message: '', code: 200, data: null }

    const { amount, phoneNumber, phoneCode, dataId, pin, reference, network } = req.body as BuyDataeDTO;

    const validate = await WalletService.validateBuyData(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', validate.code!, [`${validate.message}`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const billProvider = await Provider.findOne({ name: providerName });

    if (!billProvider) {
        return next(new ErrorResponse('Error', 500, ['bill provider error. please contact support']))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    if (business.accounts.length === 0) {
        return next(new ErrorResponse('Error', 500, [`bank account has not been generated`]));
    }

    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider
    const wallet: IWalletDoc = business.wallet;
    const settings: ISettingDoc = loggedIn.data.settings;

    if (settings.bills.data === SettingStatusType.INACTIVE) {
        return next(new ErrorResponse('Error', 403, [`account data bundle is deactivated`]))
    }

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    // check pin validation
    const isPinValid = await BusinessService.matchPIN(business._id, pin);

    if (isPinValid === false) {
        return next(new ErrorResponse('Error', 403, ['invalid transaction pin supplied']))
    }

    // check wallet balance ( add transaction fee )
    const hasBalance = await WalletService.checkBalance({ amount, provider, wallet, settings, type: 'bill', category: 'outflow' });

    if (hasBalance === false) {
        return next(new ErrorResponse('Error', 403, ['insufficient balance on wallet']))
    }

    // process transaction
    const txnref = TransactionService.generateRef(); // vacepay reference

    if (provider.name === ProviderNameType.BANI) {

        let _phoneCode = phoneCode ? phoneCode : '+234';
        let phone = VasService.attachPhoneCode(_phoneCode, phoneNumber);

        // create transaction
        const transaction = await TransactionService.createVASTransaction({
            type: 'debit',
            business,
            wallet,
            provider,
            isWebhook: false,
            reference: txnref,
            merchantRef: reference,
            feature: TransactionFeatureType.WALLET_DATA,
            vasRef: response.data.vas_ref,
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
            narration: `${amount} data recharge`,
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

    if (provider.name === ProviderNameType.NINEPSB) {

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
            merchantRef: reference,
            feature: TransactionFeatureType.WALLET_DATA,
            amount: amount
        })

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
        controller: 'corporate',
        description: `Bought data worth (NGN${amount.toLocaleString()}) from wallet`,
        changes: req.body
    })

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            amount,
            reference: reference ? reference : txnref,
        },
        message: 'successful',
        status: 200
    })

})

/**
 * @name payBill
 * @description Update a reource from database
 * @route POST /vace/v1/corporate/bill
 */
export const payBill = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const providerName = await ProviderService.configProviderName('bills');
    let response: IResult = { error: false, message: '', code: 200, data: null }

    const { phoneNumber, phoneCode, itemId, pin, amount, customerId, billerId, type, reference, addons } = req.body as PayBillsDTO;

    const validate = await WalletService.validatePayBill(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const billProvider = await Provider.findOne({ name: providerName });

    if (!billProvider) {
        return next(new ErrorResponse('Error', 500, ['bill provider error. please contact support']))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;
    const settings: ISettingDoc = loggedIn.data.settings;

    if (business.accounts.length === 0) {
        return next(new ErrorResponse('Error', 500, [`bank account has not been generated`]));
    }

    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider
    const wallet: IWalletDoc = business.wallet;

    if (type === 'cable' && settings.bills.cable === SettingStatusType.INACTIVE) {
        return next(new ErrorResponse('Error', 403, [`account cable top-up is deactivated`]))
    }

    if (type === 'utility' && settings.bills.electricity === SettingStatusType.INACTIVE) {
        return next(new ErrorResponse('Error', 403, [`account electricity top-up is deactivated`]))
    }

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    // check pin validation
    const isPinValid = await BusinessService.matchPIN(business._id, pin);

    if (isPinValid === false) {
        return next(new ErrorResponse('Error', 403, ['invalid transaction pin supplied']))
    }

    // check wallet balance ( add transaction fee )
    const hasBalance = await WalletService.checkBalance({ amount, provider, wallet, settings, type: 'bill', category: 'outflow' });

    if (hasBalance === false) {
        return next(new ErrorResponse('Error', 403, ['insufficient balance on wallet']))
    }

    // process transaction
    const txnref = TransactionService.generateRef(); // vacepay reference

    if (provider.name === ProviderNameType.BANI) {

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
            merchantRef: reference,
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
            merchantRef: reference,
            feature: TransactionFeatureType.WALLET_BILL,
            vasRef: txnref,
            amount: amount
        })

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
        controller: 'corporate',
        description: `Bills payment worth (NGN${amount.toLocaleString()}) from wallet`,
        changes: req.body
    })

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            amount: toDecimal(amount, 2),
            reference: reference ? reference : txnref
        },
        message: 'successful',
        status: 200
    })

})

/**
 * @name validateBiller
 * @description Get reource from database
 * @route POST /vace/v1/vas/validate-biller
 */
export const validateBiller = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let mapped: any = {};
    const providerName = await ProviderService.configProviderName('bills');
    let response: IResult = { error: false, message: '', code: 200, data: null }

    const { itemId, customerId, amount, billerId } = req.body as ValidateBillerDTO;

    const validate = await VasService.validateBillerRequest(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    if (providerName === ProviderNameType.BANI) {

        response = await BaniService.validateBiller({
            amount,
            customerItem: customerId,
            itemId: parseInt(itemId.toString()),
            currency: 'NGN'
        });

        if (response.error) {
            return next(new ErrorResponse('Error', 422, [`${response.message}`]))
        }

        response.data = VasService.mapVASResponse({ providerName, type: 'validate-biller', response: response.data })

        mapped = await CorporateMapper.mapValidateBiller(response.data);

    }

    if (providerName === ProviderNameType.NINEPSB) {

        if (!billerId) {
            return next(new ErrorResponse('Error', 400, [`biller id is required`]))
        }

        response = await NinepsbService.validateInputFields({
            amount,
            customerId,
            itemId: itemId.toString(),
            billerId,
            firstName: "Dummy",
            lastName: "Customer"
        });

        if (response.error) {
            return next(new ErrorResponse('Error', 422, [`${response.message}`]))
        }

        response.data = VasService.mapVASResponse({
            providerName, type: 'validate-biller',
            response: response.data,
            itemId: itemId.toString(),
            amount: amount,
            billerId: billerId,
            customerId: customerId
        })

        mapped = await CorporateMapper.mapValidateBiller(response.data);

    }

    if (providerName === ProviderNameType.ONAFRIQ) {

        mapped = {
            status: 'success',
            billerCode: '',
            billerItem: {},
            customer: {},
            currency: 'NGN'
        }

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getTopUpStatus
 * @description Get reource from database
 * @route POST /vace/v1/vas/topup-status
 */
export const getTopUpStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let mapped: any = {};
    let response: IResult = { error: false, message: '', code: 200, data: null }

    const { reference } = req.body;

    if (!reference) {
        return next(new ErrorResponse('Error', 400, [`reference is required`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const transaction = await Transaction.findOne({ merchantRef: reference }).populate([
        { path: 'provider' }
    ]);

    if (!transaction) {
        return next(new ErrorResponse('Error', 404, [`transaction does not exist`]))
    }

    if (transaction.feature !== 'wallet-airtime' && transaction.feature !== 'wallet-data') {
        return next(new ErrorResponse('Error', 403, [`invalid transaction reference`]))
    }

    const provider: IProviderDoc = transaction.provider;

    if (provider.name === ProviderNameType.BANI) {

        response = await BaniService.validateBillTransaction({ vaceRef: transaction.merchantRef ? transaction.merchantRef : transaction.reference });

        if (response.error) {
            return next(new ErrorResponse('Error', 422, [`${response.message}`]))
        }

        const _response: BaniResponseDTO = response.data;

        response.data = {
            status: _response.transaction_status,
            reference: transaction.reference,
            ...transaction.vasData
        }
        response.message = transaction.description;

        mapped = await CorporateMapper.mapGetTopupStatus(response.data)

    }

    if (provider.name === ProviderNameType.NINEPSB) {

        response = await NinepsbService.getTopupStatus({ reference: transaction.reference });

        if (response.error) {
            return next(new ErrorResponse('Error', 422, [`${response.message}`]))
        }
        const _response: PSBApiResponseDTO = response.data;

        response.data = {
            status: _response.transactionStatus,
            reference: transaction.reference,
            ...transaction.vasData
        }
        response.message = _response.description

        mapped = await CorporateMapper.mapGetTopupStatus(response.data)

    }

    if (provider.name === ProviderNameType.ONAFRIQ) {

        mapped = await CorporateMapper.mapTransactionData(transaction);
        response.message = 'successful';

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: response.message,
        status: 200
    })

})

/**
 * @name validateBiller
 * @description Get reource from database
 * @route POST /vace/v1/vas/bill-status
 */
export const validateBillTransaction = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let mapped: any = {};
    const providerName = await ProviderService.configProviderName('bills');
    let response: IResult = { error: false, message: '', code: 200, data: null }

    const { reference } = req.body;

    if (!reference) {
        return next(new ErrorResponse('Error', 400, [`reference is required`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const transaction = await Transaction.findOne({ merchantRef: reference }).populate([
        { path: 'provider' }
    ]);

    if (!transaction) {
        return next(new ErrorResponse('Error', 404, [`transaction does not exist`]))
    }

    const provider: IProviderDoc = transaction.provider;

    if (provider.name === ProviderNameType.BANI) {

        response = await BaniService.validateBillTransaction({ vaceRef: transaction.merchantRef ? transaction.merchantRef : transaction.reference });

        if (response.error) {
            return next(new ErrorResponse('Error', 422, [`${response.message}`]))
        }

        response.data = VasService.mapVASResponse({ providerName, type: 'bill-transaction', response: response.data })
        mapped = await CorporateMapper.mapGetBillStatus(response.data);

    }

    if (provider.name === ProviderNameType.NINEPSB) {

        response = await NinepsbService.getBillPaymentStatus(transaction.reference);

        if (response.error) {
            return next(new ErrorResponse('Error', 422, [`${response.message}`]))
        }

        response.data = VasService.mapVASResponse({
            providerName,
            type: 'bill-transaction',
            response: response.data,
            transaction: transaction
        })

        mapped = await CorporateMapper.mapGetBillStatus(response.data);

    }

    if (provider.name === ProviderNameType.ONAFRIQ) {

        mapped = await CorporateMapper.mapTransactionData(transaction);
        response.message = 'successful';

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getBusinessProducts
 * @description Get a reource from database
 * @route GET /vace/v1/corporate/products
 */
export const getBusinessProducts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const pop: Array<any> = []
    const result = await advanced(Product, pop, '', req, 'business', business._id, null, 'absolute');

    const mapped = await CorporateMapper.mapProductList(result.data);

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getProduct
 * @description Get a reource from database
 * @route GET /vace/v1/corporate/product/:code
 */
export const getProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const product = await Product.findOne({ code: req.params.code }).populate([
        { path: 'business', select: '_id email officialEmail name, products' }
    ]);

    if (!product) {
        return next(new ErrorResponse('Error', 404, ['product does not exist']))
    }

    if (user.userType === UserType.BUSINESS && !arrayIncludes(business.products, product._id.toString())) {
        return next(new ErrorResponse('Error', 404, ['product does not belong to business']))
    }

    const mapped = await CorporateMapper.mapProductData(product);

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name searchProducts
 * @description Get a reource from database
 * @route POST /vace/v1/corporate/search-products
 * @access Business
 */
export const searchProducts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { key } = req.body;

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    if (!key) {
        return next(new ErrorResponse('Error', 400, [`search key is required`]))
    }

    const pop = [
        { path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
    ]

    const query: ISearchQuery = {
        model: Product,
        ref: 'business',
        value: business._id,
        data: [
            { name: { $regex: key, $options: 'i' } },
            { code: { $regex: key, $options: 'i' } },
        ],
        query: null,
        queryParam: req.query,
        populate: pop,
        operator: 'or'
    }

    const result = await search(query); // search from DB
    const mapped = await CorporateMapper.mapProductList(result.data);

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})


/**
 * @name filterProducts
 * @description Get a reource from database
 * @route POST /vace/v1/corporate/filter-products
 * @access Superadmin | Admin
 */
export const filterProducts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as FilterProductDTO;

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const filters = ProductService.defineFilterQuery(body);

    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]

    const query: ISearchQuery = {
        model: Product,
        ref: 'business',
        value: business._id,
        data: filters,
        query: null,
        queryParam: req.query,
        populate: pop,
        operator: 'and'
    }

    const result = await search(query); // search from DB
    const mapped = await CorporateMapper.mapProductList(result.data);

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name createProduct
 * @description Create a reource in the database
 * @route POST /vace/v1/corporate/product
 * @access Superadmin | Admin | Business
 */
export const createProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { name, avatar, code, description, price, isLink } = req.body as CreateProductDTO;

    const validate = await ProductService.validateCreateProduct(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    let generateLink: boolean = !notDefined(isLink, true) ? isLink : false;
    const create = await ProductService.createProduct({
        name,
        description,
        price,
        business,
        code,
        avatar,
        isLink: generateLink
    });

    if (create.error) {
        return next(new ErrorResponse('Error', 403, [`${create.message}`]))
    }

    let response: any = {};
    const mapped = await CorporateMapper.mapProductData(create.data);
    Object.assign(response, mapped);

    if (create.data.link) {
        response.paymentLink = create.data.link;
    }


    res.status(200).json({
        error: false,
        errors: [],
        data: response,
        message: 'successful',
        status: 200
    })

});

/**
 * @name updateProduct
 * @description Update a reource in the database
 * @route PUT /vace/v1/corporate/product/:code
 * @access Superadmin | Admin | Business
 */
export const updateProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { name, avatar, description, price } = req.body as UpdateProductDTO;

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    let product = await Product.findOne({ code: req.params.code }).populate([
        {
            path: 'business', populate: [
                { path: 'user' }
            ]
        },
        { path: 'payments' }
    ])

    if (!product) {
        return next(new ErrorResponse('Error', 404, ['product does not exist']))
    }

    if (!BusinessService.isCompliant(business.user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    if (name) {

        const nameExists = await Product.findOne({ name: name, business: business._id });

        if (nameExists) {
            return next(new ErrorResponse('Error', 404, ['product name already exists']))
        }

    }

    if (price) {

        if (isZero(price) || isNeg(price)) {
            return next(new ErrorResponse('Error', 400, ['price cannot be zero or negative']))
        }

        if (hasDecimal(price) && !isPrecise({ value: price, length: 2 })) {
            return next(new ErrorResponse('Error', 400, ['price decimal places cannot be more than 2']))
        }

    }

    product.name = name ? name : product.name;
    product.description = description ? description : product.description;
    product.price = price ? price : product.price;
    await product.save();

    if (price && product.payments[0]) {
        const payment: IPaymentLinkDoc = product.payments[0];
        await PaymentLinkService.attachProduct(payment, product);
    }

    if (avatar && isBase64(avatar)) {

        const filename = `product-${product.code.toLowerCase()}-${Random.randomNum(8)}`;
        const upload = await StorageService.uploadGcpFile(avatar, filename, 'base64');

        if (upload.error) {
            //TODO: Logo Audit here
        }

        if (!upload.error && upload.data) {
            product.avatar = upload.data.publicUrl;
            await product.save();
        }

    }

    const mapped = await CorporateMapper.mapProductData(product);

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

});

/**
 * @name getBusinessPaymentLinks
 * @description Get a reource from database
 * @route GET /vace/v1/corporate/payments
 */
export const getBusinessPaymentLinks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const pop: Array<any> = []
    const result = await advanced(PaymentLink, pop, '', req, 'business', business._id, null, 'relative');
    const mapped = await CorporateMapper.mapPaymentLinkList(result.data);

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getPaymentLink
 * @description Get a reource from database
 * @route GET /vace/v1/corporate/payment/:slug
 */
export const getPaymentLink = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const paymentLink = await PaymentLink.findOne({ slug: req.params.slug }).populate([
        { path: 'product' },
        { path: 'invoice' },
        { path: 'subaccounts' }
    ]);

    if (!paymentLink) {
        return next(new ErrorResponse('Error', 404, ['payment link does not exist']))
    }
    if (user.userType === UserType.BUSINESS && !arrayIncludes(business.payments, paymentLink._id.toString())) {
        return next(new ErrorResponse('Error', 404, ['payment link does not belong to business']))
    }
    const mapped = await CorporateMapper.mapPaymentLinkData(paymentLink);

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

});

/**
 * @name searchPaymentLinks
 * @description Get a reource from database
 * @route POST /vace/v1/corporate/search-payments
 * @access Business
 */
export const searchPaymentLinks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { key } = req.body;

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    if (!key) {
        return next(new ErrorResponse('Error', 400, [`search key is required`]))
    }

    const pop = [
        { path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
    ]

    const query: ISearchQuery = {
        model: PaymentLink,
        ref: 'business',
        value: business._id,
        data: [
            { name: { $regex: key, $options: 'i' } },
            { slug: { $regex: key, $options: 'i' } },
        ],
        query: null,
        queryParam: req.query,
        populate: pop,
        operator: 'or'
    }

    const result = await search(query); // search from DB
    const mapped = await CorporateMapper.mapPaymentLinkList(result.data);

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name filterPaymentLinks
 * @description Get a reource from database
 * @route POST /vace/v1/corporate/filter-payments
 * @access Superadmin | Admin
 */
export const filterPaymentLinks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as FilterPaymentLinkDTO;

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const filters = PaymentLinkService.defineFilterQuery(body);

    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]

    const query: ISearchQuery = {
        model: PaymentLink,
        ref: 'business',
        value: business._id,
        data: filters,
        query: null,
        queryParam: req.query,
        populate: pop,
        operator: 'and'
    }

    const result = await search(query); // search from DB
    const mapped = await CorporateMapper.mapPaymentLinkList(result.data);

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getPaymentlinkTransactions
 * @description Get a reource from database
 * @route GET /vace/v1/corporate/payment-transactions/:slug
 */
export const getPaymentlinkTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const payment = await PaymentLink.findOne({ slug: req.params.slug });

    if (!payment) {
        return next(new ErrorResponse('Error', 404, ['payment does not exist']))
    }

    const result = await advanced(Transaction, [], 'status', req, 'payment', payment._id, null, 'absolute');
    const mapped = await CorporateMapper.mapTransactionList(result.data);

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name createPaymentLink
 * @description Create a reource in the database
 * @route POST /vace/v1/corporate/payment
 * @access Superadmin | Admin | Business
 */
export const createPaymentLink = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { name, feature, type, amount, invoiceId, productId, redirectUrl, message, slug, description, splits } = req.body as CreatePaymentLinkDTO;

    const validate = await PaymentLinkService.validateCreateLink(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    if (splits && splits.length > 0) {

        const check = await PaymentLinkService.validateSplits(splits);

        if (check.error) {
            return next(new ErrorResponse('Error', 400, [`${check.message}`]))
        }

    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    if (slug && hasSAC(slug)) {
        return next(new ErrorResponse('Error', 404, ['invalid URL. remove spaces and special characters']))
    }

    const create = await PaymentLinkService.createPaymentLink({
        business,
        name,
        feature,
        type,
        amount,
        invoiceId,
        productId,
        redirectUrl,
        message,
        slug,
        description,
        splits: splits,
        initialized: false
    });

    if (create.error) {
        return next(new ErrorResponse('Error', 403, [`${create.message}`]))
    }
    const mapped = await CorporateMapper.mapPaymentLinkData(create.data);

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

});

/**
 * @name enablePaymentLink
 * @description Update a reource in the database
 * @route PUT /vace/v1/corporate/enable-payment/:slug
 * @access Superadmin | Admin | Business
 */
export const enablePaymentLink = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const payment = await PaymentLink.findOne({ slug: req.params.slug })

    if (!payment) {
        return next(new ErrorResponse('Error', 404, ['payment does not exist']))
    }

    if (user.userType === UserType.BUSINESS) {

        if (!arrayIncludes(business.payments, payment._id.toString())) {
            return next(new ErrorResponse('Error', 403, ['payment link does not belong to business']))
        }

        if (!BusinessService.isCompliant(user)) {
            return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
        }

    }

    if (payment.feature === FeatureType.PRODUCT && !payment.product) {
        return next(new ErrorResponse('Error', 422, ['attach product to payment link']))
    }

    if (payment.feature === FeatureType.INVOICE && !payment.invoice) {
        return next(new ErrorResponse('Error', 422, ['attach invoice to payment link']))
    }

    if (payment.isEnabled === false) {
        payment.isEnabled = true;
        await payment.save();
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            name: payment.name,
            link: payment.link,
            isEnabled: payment.isEnabled
        },
        message: 'successful',
        status: 200
    })

});

/**
 * @name disablePaymentLink
 * @description Update a reource in the database
 * @route PUT /vace/v1/corporate/disable-payment/:slug
 * @access Superadmin | Admin | Business
 */
export const disablePaymentLink = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const payment = await PaymentLink.findOne({ slug: req.params.slug })

    if (!payment) {
        return next(new ErrorResponse('Error', 404, ['payment does not exist']))
    }

    if (user.userType === UserType.BUSINESS && !arrayIncludes(business.payments, payment._id.toString())) {

        return next(new ErrorResponse('Error', 403, ['payment link does not belong to business']))

    }

    if (payment.isEnabled === true) {
        payment.isEnabled = false;
        await payment.save();
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            name: payment.name,
            link: payment.link,
            isEnabled: payment.isEnabled
        },
        message: 'successful',
        status: 200
    })

});

/**
 * @name attachLinkResource
 * @description Update a reource in the database
 * @route PUT /vace/v1/corporate/attach-payment-resource/:slug
 * @access Superadmin | Admin | Business
 */
export const attachLinkResource = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const allowed = ['product', 'invoice']
    const { type, code } = req.body as AttachLinkResourceDTO;

    if (!type) {
        return next(new ErrorResponse('Error', 400, [`attach type is required`]))
    }

    if (!arrayIncludes(allowed, type)) {
        return next(new ErrorResponse('Error', 400, [`invalid attach type value. choose from ${allowed.join(', ')}`]))
    }

    if (!code) {
        return next(new ErrorResponse('Error', 400, [`code is required`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const paymentLink = await PaymentLink.findOne({ slug: req.params.slug })

    if (!paymentLink) {
        return next(new ErrorResponse('Error', 404, ['payment link does not exist']))
    }

    if (paymentLink.feature !== FeatureType.PRODUCT && paymentLink.feature !== FeatureType.INVOICE) {
        return next(new ErrorResponse('Error', 403, [`cannot attach resource to a ${paymentLink.feature} link`]))
    }

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    if (type === FeatureType.PRODUCT) {

        if (paymentLink.feature !== FeatureType.PRODUCT) {
            return next(new ErrorResponse('Error', 422, [`cannot attach product to a ${paymentLink.feature} link type`]))
        }

        const product = await Product.findOne({ code: code });

        if (!product) {
            return next(new ErrorResponse('Error', 404, ['product does not exist']))
        }

        if (product.business.toString() !== paymentLink.business._id.toString()) {
            return next(new ErrorResponse('Error', 403, ['product does not belong to business']))
        }

        await PaymentLinkService.attachProduct(paymentLink, product);

    }

    if (type === FeatureType.INVOICE) {

        if (paymentLink.feature !== FeatureType.INVOICE) {
            return next(new ErrorResponse('Error', 422, [`cannot attach invoice  to a ${paymentLink.feature} link type`]))
        }

        const invoice = await Invoice.findOne({ code: code }).populate([
            { path: 'payment' }
        ]);

        if (!invoice) {
            return next(new ErrorResponse('Error', 404, ['invoice does not exist']))
        }

        if (invoice.business.toString() !== paymentLink.business._id.toString()) {
            return next(new ErrorResponse('Error', 403, ['invoice does not belong to business']))
        }

        if (invoice.status === TransactionStatus.PAID) {
            return next(new ErrorResponse('Error', 422, [`cannot attach a ${invoice.status} invoice`]))
        }

        if (invoice.payment) {
            return next(new ErrorResponse('Error', 422, [`invoice is already attached to ${invoice.payment.name} link`]))
        }

        // attach invoice to payment link
        await PaymentLinkService.attachInvoice(paymentLink, invoice);

    }

    const mapped = await CorporateMapper.mapPaymentLinkData(paymentLink);

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

});

/**
 * @name detachLinkSplit
 * @description Update a reource in the database
 * @route PUT /vace/v1/corporate/remove-subaccount/:slug
 * @access Superadmin | Admin | Business
 */
export const detachLinkSplit = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { code } = req.body;

    if (!code) {
        return next(new ErrorResponse('Error', 400, ['subaccount code is required']))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const subaccount = await Subaccount.findOne({ code: code });

    if (!subaccount) {
        return next(new ErrorResponse('Error', 404, ['subaccount does not exist']))
    }

    let payment = await PaymentLink.findOne({ slug: req.params.slug });

    if (!payment) {
        return next(new ErrorResponse('Error', 404, ['payment does not exist']))
    }

    if (user.userType === UserType.BUSINESS && !arrayIncludes(business.payments, payment._id.toString())) {

        return next(new ErrorResponse('Error', 403, ['payment link does not belong to business']))

    }

    if (arrayIncludes(payment.subaccounts, subaccount._id.toString())) {

        const filtered = payment.subaccounts.filter((x) => x.toString() !== subaccount._id.toString());
        payment.subaccounts = filtered;
        await payment.save();

    }

    const mapped = await CorporateMapper.mapPaymentLinkData(payment);

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            slug: mapped.slug,
            link: mapped.link,
            qrcode: mapped.qrcode
        },
        message: 'successful',
        status: 200
    })

});

/**
 * @name updatePaymentLink
 * @description Update a reource in the database
 * @route PUT /vace/v1/corporate/payment/:slug
 * @access Superadmin | Admin | Business
 */
export const updatePaymentLink = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const allowed = ['fixed', 'dynamic']
    const allowedFeatures = ['invoice', 'product']

    const { name, type, amount, redirectUrl, message, slug, description, feature, splits } = req.body as UpdatePaymentLinkDTO;

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    let paymentLink = await PaymentLink.findOne({ slug: req.params.slug }).populate([
        { path: 'invoice' },
        { path: 'product' }
    ])

    if (!paymentLink) {
        return next(new ErrorResponse('Error', 404, ['payment link does not exist']))
    }

    if (splits && splits.length > 0) {

        const validate = await PaymentLinkService.validateSplits(splits);

        if (validate.error) {
            return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
        }

    }

    const invoice: IInvoiceDoc = paymentLink.invoice;
    const product: IProductDoc = paymentLink.product;

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    if (!notDefined(amount) && amount && !isPos(amount)) {
        return next(new ErrorResponse('Error', 403, ['amount cannot be zero']))
    }

    if (!notDefined(amount) && amount && hasDecimal(amount) && !isPrecise({ value: amount, length: 2 })) {
        return next(new ErrorResponse('Error', 403, ['amount should have only decimals']))
    }

    if (slug && slug.toLowerCase() !== paymentLink.slug) {

        if (hasSAC(slug)) {
            return next(new ErrorResponse('Error', 404, ['invalid URL. remove spaces and special characters']))
        }

        const urlExists = await PaymentLinkService.urlExists(slug);

        if (urlExists) {
            return next(new ErrorResponse('Error', 404, ['choice url already exists']))
        }

    }

    if (type) {

        if (!arrayIncludes(allowed, type)) {
            return next(new ErrorResponse('Error', 400, [`invalid type value. choose from ${allowed.join(', ')}`]))
        }

        if (type === 'fixed' && (notDefined(amount) || isZero(amount)) && isZero(paymentLink.amount)) {
            return next(new ErrorResponse('Error', 404, ['amount is required']))
        }

    }

    if (feature) {

        if (!arrayIncludes(allowedFeatures, feature)) {
            return next(new ErrorResponse('Error', 400, [`invalid feature value. choose from ${allowedFeatures.join(', ')}`]))
        }

    }

    if(redirectUrl){
        if (redirectUrl && (!strIncludesEs6(redirectUrl, 'https://') && !strIncludesEs6(redirectUrl, 'http://'))) {
            return next(new ErrorResponse('Error', 400, ['redirect url must include https:// or http://']))
        }
    }

    paymentLink.name = name ? name : paymentLink.name;
    paymentLink.slug = slug ? slug.toLowerCase() : paymentLink.slug;
    paymentLink.feature = feature ? feature : paymentLink.feature;
    paymentLink.amount = amount ? amount : paymentLink.amount;
    paymentLink.redirectUrl = redirectUrl ? redirectUrl : paymentLink.redirectUrl;
    paymentLink.message = message ? message : paymentLink.message;
    paymentLink.description = description ? description : paymentLink.description;
    await paymentLink.save();

    if (slug) {

        let oldLink = paymentLink.link

        // update link
        let updated = await PaymentLinkService.updateLinkUrl(paymentLink, slug);

        // delete old QR and generate new QRCode
        await PaymentLinkService.updateLinkQRCode({ payment: updated, oldLink, newLink: updated.link })

    }

    if (type) {

        if (type === 'dynamic' && paymentLink.feature === FeatureType.INVOICE && invoice) {
            paymentLink.type = 'fixed';
            paymentLink.amount = invoice.summary.totalAmount
        } else {
            paymentLink.type = type;
        }

        await paymentLink.save();
    }

    if (splits && splits.length > 0) {
        paymentLink = await PaymentLinkService.updateSplits(paymentLink, splits);
    }

    const mapped = await CorporateMapper.mapPaymentLinkData(paymentLink);

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

});

/**
 * @name getBusinessSubaccounts
 * @description Get a reource from database
 * @route GET /vace/v1/corporate/subaccounts
 */
export const getBusinessSubaccounts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const pop: Array<any> = [];
    const result = await advanced(Subaccount, pop, '', req, 'business', business._id, null, 'absolute');
    const mapped = await CorporateMapper.mapSubaccountList(result.data)

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getSubaccount
 * @description Get a reource from database
 * @route GET /vace/v1/corporate/subaccount/:code
 */
export const getSubaccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const subacccount = await Subaccount.findOne({ code: req.params.code });

    if (!subacccount) {
        return next(new ErrorResponse('Error', 404, ['subacccount does not exist']))
    }

    if (user.userType === UserType.BUSINESS && !arrayIncludes(business.subaccounts, subacccount._id.toString())) {
        return next(new ErrorResponse('Error', 403, ['subacccount does not belong to business']))
    }

    const mapped = await CorporateMapper.mapSubaccountData(subacccount)

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

});

/**
 * @name searchSubaccounts
 * @description Get a reource from database
 * @route POST /vace/v1/corporate/search-subaccounts
 * @access Business
 */
export const searchSubaccounts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { key } = req.body;

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    if (!key) {
        return next(new ErrorResponse('Error', 400, [`search key is required`]))
    }

    const pop = [
        { path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
    ]

    const query: ISearchQuery = {
        model: Subaccount,
        ref: null,
        value: null,
        data: [
            { name: { $regex: key, $options: 'i' } },
            { code: { $regex: key, $options: 'i' } },
            { email: { $regex: key, $options: 'i' } },
            { "bank.accountNo": { $regex: key, $options: 'i' } },
            { "bank.accountName": { $regex: key, $options: 'i' } }
        ],
        query: null,
        queryParam: req.query,
        populate: pop,
        operator: 'or'
    }

    const result = await search(query); // search from DB
    const mapped = await CorporateMapper.mapSubaccountList(result.data)

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name filterSubaccounts
 * @description Get a reource from database
 * @route POST /vace/v1/corporate/filter-subaccounts
 * @access Superadmin | Admin
 */
export const filterSubaccounts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as FilterSubaccountDTO;

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const filters = SubAccountService.defineFilterQuery(body);

    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]

    const query: ISearchQuery = {
        model: Subaccount,
        ref: null,
        value: null,
        data: filters,
        query: null,
        queryParam: req.query,
        populate: pop,
        operator: 'and'
    }

    const result = await search(query); // search from DB
    const mapped = await CorporateMapper.mapSubaccountList(result.data)

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name createSubaccount
 * @description Create a reource in the database
 * @route POST /vace/v1/corporate/subaccount
 * @access Superadmin | Admin | Business
 */
export const createSubaccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let bankDetails: any = {};
    const { name, description, accountNo, bankCode, email, phoneCode, phoneNumber, split } = req.body as CreateSubaccountRequestDTO;

    const validate = await SubaccountService.validateCreateSubaccount(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    const providerName = await ProviderService.configProviderName('bank');
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider;

    // resolve account number
    if (accountNo && bankCode) {

        // resolve bank acount that was provided
        const _bank = await BankService.getBank(bankCode, provider.name);

        if (!_bank) {
            return next(new ErrorResponse('Error', 400, ['invalid bank details. select a valid bank']))
        }

        const resolve = await BankService.resolveBankAccount({
            bankCode: _bank.code,
            accountNo: accountNo,
            name: provider.name
        })

        if (resolve.error) {
            return next(new ErrorResponse('Error', 403, [`${resolve.message}`]));
        }

        let resolvedBank: ResolvedBankDTO = resolve.data;
        let nameSplit = _bank.name.toLowerCase().split(' ');

        bankDetails = {
            accountNo: resolvedBank.accountNo,
            accountName: resolvedBank.accountName,
            name: _bank.name,
            legalName: resolvedBank.bankName,
            bankCode: resolvedBank.bankCode,
            platformCode: resolvedBank.platformCode
        }

    }

    const create = await SubaccountService.createSubaccount({
        business,
        name,
        bank: bankDetails,
        email,
        phoneCode: phoneCode ? phoneCode : '+234',
        phoneNumber,
        split,
        description
    });

    if (create.error) {
        return next(new ErrorResponse('Error', 500, [`${create.message}`]))
    }

    const mapped = await CorporateMapper.mapSubaccountData(create.data)

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

});

/**
 * @name updateSubaccount
 * @description Create a reource in the database
 * @route PUT /vace/v1/corporate/subaccount/:code
 * @access Superadmin | Admin | Business
 */
export const updateSubaccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let bankDetails: any = {};
    const { name, description, accountNo, bankCode, email, phoneCode, phoneNumber, split } = req.body as UpdateSubaccountDTO;

    const validate = await SubaccountService.validateUpdateSubaccount(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const subacccount = await Subaccount.findOne({ code: req.params.code });

    if (!subacccount) {
        return next(new ErrorResponse('Error', 404, ['subacccount does not exist']))
    }

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    const providerName = await ProviderService.configProviderName('bank');
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider;

    // resolve account number
    if (accountNo && bankCode) {

        // resolve bank acount that was provided
        const _bank = await BankService.getBank(bankCode, provider.name);

        if (!_bank) {
            return next(new ErrorResponse('Error', 400, ['invalid bank details. select a valid bank']))
        }

        const resolve = await BankService.resolveBankAccount({
            bankCode: _bank.code,
            accountNo: accountNo,
            name: provider.name
        })

        if (resolve.error) {
            return next(new ErrorResponse('Error', 403, [`${resolve.message}`]));
        }

        let resolvedBank: ResolvedBankDTO = resolve.data;
        let nameSplit = _bank.name.toLowerCase().split(' ');

        bankDetails = {
            accountNo: resolvedBank.accountNo,
            accountName: resolvedBank.accountName,
            name: _bank.name,
            legalName: _bank.legalName,
            bankCode: resolvedBank.bankCode,
            platformCode: resolvedBank.platformCode
        }

    }

    subacccount.name = name ? name : subacccount.name;
    subacccount.description = description ? description : subacccount.description;
    subacccount.email = email ? email : subacccount.email;
    subacccount.phoneCode = phoneCode ? phoneCode : subacccount.phoneCode;
    subacccount.phoneNumber = phoneNumber ? phoneNumber : subacccount.phoneNumber;
    subacccount.bank = {
        accountName: bankDetails.accountName ? bankDetails.accountName : subacccount.bank.accountName,
        accountNo: bankDetails.accountNo ? bankDetails.accountNo : subacccount.bank.accountNo,
        name: bankDetails.name ? bankDetails.name : subacccount.bank.name,
        legalName: bankDetails.legalName ? bankDetails.legalName : subacccount.bank.legalName,
        bankCode: bankDetails.bankCode ? bankDetails.bankCode : subacccount.bank.bankCode,
        platformCode: bankDetails.platformCode ? bankDetails.platformCode : subacccount.bank.platformCode
    }
    subacccount.split = {
        type: split.type ? split.type : subacccount.split.type,
        value: split.value ? split.value : subacccount.split.value
    }
    await subacccount.save();

    const mapped = await CorporateMapper.mapSubaccountData(subacccount)

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

});

/**
 * @name getBusinessInvoices
 * @description Get a reource from database
 * @route GET /vace/v1/corporate/invoices
 */
export const getBusinessInvoices = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const pop: Array<any> = [{ path: 'payment' }];
    const result = await advanced(Invoice, pop, '', req, 'business', business._id, null, 'relative');
    const mapped = await CorporateMapper.mapInvoiceList(result.data)

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getInvoice
 * @description Get a reource from database
 * @route GET /vace/v1/corporate/invoice/:code
 */
export const getInvoice = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const invoice = await Invoice.findOne({ code: req.params.code }).populate([
        { path: 'business', select: '_id email officialEmail name' },
        { path: 'payment' }
    ]);

    if (!invoice) {
        return next(new ErrorResponse('Error', 404, ['invoice does not exist']))
    }

    if (user.userType === UserType.BUSINESS && !arrayIncludes(business.invoices, invoice._id.toString())) {
        return next(new ErrorResponse('Error', 404, ['invoice does not belong to business']))
    }

    const mapped = await CorporateMapper.mapInvoiceData(invoice)

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name searchInvoices
 * @description Get a reource from database
 * @route POST /vace/v1/corporate/search-invoices/
 * @access Business
 */
export const searchInvoices = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { key } = req.body;

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    if (!key) {
        return next(new ErrorResponse('Error', 400, [`search key is required`]))
    }

    const pop = [
        { path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
        { path: 'payment' }
    ]

    const query: ISearchQuery = {
        model: Invoice,
        ref: 'business',
        value: business._id,
        data: [
            { name: { $regex: key, $options: 'i' } },
            { number: { $regex: key, $options: 'i' } },
            { code: { $regex: key, $options: 'i' } },
        ],
        query: null,
        queryParam: req.query,
        populate: pop,
        operator: 'or'
    }

    const result = await search(query); // search from DB
    const mapped = await CorporateMapper.mapInvoiceList(result.data)

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name filterInvoices
 * @description Get a reource from database
 * @route POST /vace/v1/corporate/filter-invoices/
 * @access Superadmin | Admin
 */
export const filterInvoices = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as FilterInvoiceDTO;

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const filters = InvoiceService.defineFilterQuery(body);

    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' },
        { path: 'payment' }
    ]

    const query: ISearchQuery = {
        model: Invoice,
        ref: 'business',
        value: business._id,
        data: filters,
        query: null,
        queryParam: req.query,
        populate: pop,
        operator: 'and'
    }

    const result = await search(query); // search from DB
    const mapped = await CorporateMapper.mapInvoiceList(result.data)

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name createInvoice
 * @description Create a reource in the database
 * @route POST /vace/v1/corporate/invoice
 * @access Superadmin | Admin | Business
 */
export const createInvoice = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { name, items, vat, dueAt, number, recipient, description, partial, isLink } = req.body as CreateInvoiceRequestDTO

    const validate = await InvoiceService.validateCreateInvoice(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    const split = dueAt.split(' ');

    if (split.length === 1) {
        return next(new ErrorResponse('Error', 400, ['incorrect date and time format. use \"YYYY/MM/DD HH:mm:ss\"']))
    } else {

        if (!checkDateFormat(split[0])) {
            return next(new ErrorResponse('Error', 400, ['incorrect date format. use YYYY/MM/DD or YYYY-MM-DD']))
        }

        if (!checkTimeFormat(split[1])) {
            return next(new ErrorResponse('Error', 400, ['incorrect time format. use HH:mm:ss']))
        }

    }

    let generateLink: boolean = !notDefined(isLink, true) ? isLink : false;
    const create = await InvoiceService.createInvoice({
        business,
        description,
        dueAt,
        items,
        name,
        number,
        partial,
        recipient,
        vat,
        isLink: generateLink
    });

    if (create.error) {
        return next(new ErrorResponse('Error', create.code!, [`${create.message}`], create.data))
    }

    const mapped = await CorporateMapper.mapInvoiceData(create.data)

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

});

/**
 * @name removeInvoiceItem
 * @description Update a reource in the database
 * @route PUT /vace/v1/corporate/remove-invoice-item/:code
 * @access Superadmin | Admin | Business
 */
export const removeInvoiceItem = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const label = req.body.label as string;

    if (!label) {
        return next(new ErrorResponse('Error', 400, ['item label is required']))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const invoice = await Invoice.findOne({ code: req.params.code })

    if (!invoice) {
        return next(new ErrorResponse('Error', 404, ['payment does not exist']))
    }

    if (user.userType === UserType.BUSINESS && !arrayIncludes(business.invoices, invoice._id.toString())) {
        return next(new ErrorResponse('Error', 403, ['invoice does not belong to business']))
    }

    if (invoice.items.length === 1) {
        return next(new ErrorResponse('Error', 403, ['cannot delete last invoice item']))
    }

    let currentList = invoice.items;
    let item = currentList.find((x) => x.label === label);

    if (item) {

        const filtered = currentList.filter((x) => x.label !== label);
        invoice.items = filtered;

        // calculate summary
        const summary = await InvoiceService.calculateSummary({
            items: invoice.items,
            partial: invoice.summary.partialAmount,
            VAT: invoice.VAT
        });

        invoice.summary = {
            subtotal: summary.subtotal,
            totalAmount: summary.totalAmount,
            partialAmount: summary.partialAmount,
            amountPaid: 0,
            paidAt: 0
        };

        await invoice.save();

    }

    let items = invoice.items.map((x) => {
        return {
            label: x.label,
            name: x.name,
            price: x.price,
            quantity: x.quantity,
            total: x.total,
        }
    })

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            items: items,
            summary: invoice.summary
        },
        message: 'successful',
        status: 200
    })

});

/**
 * @name updateInvoice
 * @description Update a reource in the database
 * @route PUT /vace/v1/corporate/invoice/:code
 * @access Superadmin | Admin | Business
 */
export const updateInvoice = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const allowedTypes = ['percentage', 'flat']
    const { name, items, vat, dueAt, number, recipient, description, partial } = req.body as UpdateInvoiceDTO

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    let invoice = await Invoice.findOne({ code: req.params.code }).populate([
        { path: 'payment' }
    ])

    if (!invoice) {
        return next(new ErrorResponse('Error', 404, ['Invoice does not exist']))
    }

    if (invoice.status === TransactionStatus.PAID) {
        return next(new ErrorResponse('Error', 403, ['cannot update a paid invoice']))
    }

    if (user.userType === UserType.BUSINESS && !arrayIncludes(business.invoices, invoice._id.toString())) {
        return next(new ErrorResponse('Error', 403, ['invoice does not belong to business']))
    }

    const paymentLink: IPaymentLinkDoc = invoice.payment;

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    if (items && items.length > 0) {

        const validate = await InvoiceService.validateItems(items);

        if (validate.error) {
            return next(new ErrorResponse('Error', 404, [`${validate.message}`]))
        }

    }

    if (number) {

        const exist = await InvoiceService.invoiceExists({ business, number, check: 'number' });

        if (exist.error) {
            return next(new ErrorResponse('Error', exist.code!, [`${exist.message}`]))
        }

        if (hasSAC(number)) {
            return next(new ErrorResponse('Error', 403, [`spaces and special characters are not allowed for invoice number`]))
        }

    }

    if (name) {

        const exist = await InvoiceService.invoiceExists({ business, name, check: 'name' });

        if (exist.error) {
            return next(new ErrorResponse('Error', exist.code!, [`${exist.message}`]))
        }

    }

    if (dueAt) {

        const split = dueAt.split(' ');

        if (split.length === 1) {
            return next(new ErrorResponse('Error', 400, ['incorrect date and time format. use \"YYYY/MM/DD HH:mm:ss\"']))
        } else {

            if (!checkDateFormat(split[0])) {
                return next(new ErrorResponse('Error', 400, ['incorrect date format. use YYYY/MM/DD or YYYY-MM-DD']))
            }

            if (!checkTimeFormat(split[1])) {
                return next(new ErrorResponse('Error', 400, ['incorrect time format. use HH:mm:ss']))
            }

        }

    }

    if (vat && vat.type && !arrayIncludes(allowedTypes, vat.type)) {
        return next(new ErrorResponse('Error', 400, [`invalid vat (tax) type. choose from ${allowedTypes.join(', ')}`]))
    }

    if (vat && isNeg(vat.value)) {
        return next(new ErrorResponse('Error', 400, [`vat (tax) value cannot be negative`]))
    }

    if (vat && vat.value && hasDecimal(vat.value) && !isPrecise({ value: vat.value, length: 2 })) {
        return next(new ErrorResponse('Error', 400, [`vat (tax) value is required to have 2 decimals`]))
    }

    invoice.name = name ? name : invoice.name;
    invoice.number = number ? number : invoice.number;
    invoice.description = description ? description : invoice.description;

    if (dueAt) {

        let dueFormat = SystemService.formatISO(dateToday(dueAt).ISO);
        invoice.dueAt = {
            date: dueFormat.date,
            time: dueFormat.time,
            ISO: dateToday(dueAt).ISO
        }

    }

    if (vat) {
        invoice.VAT = {
            title: vat.title ? vat.title : invoice.VAT.title,
            type: vat.type ? vat.type : invoice.VAT.type,
            value: vat.value ? vat.value : invoice.VAT.value
        }
    }

    if (recipient) {
        invoice.recipient = {
            email: recipient.email ? recipient.email : invoice.recipient.email,
            firstName: recipient.firstName ? recipient.firstName : invoice.recipient.firstName,
            lastName: recipient.lastName ? recipient.lastName : invoice.recipient.lastName,
            address: recipient.address ? recipient.address : invoice.recipient.address,
            businessName: recipient.businessName ? recipient.businessName : invoice.recipient.businessName,
            city: recipient.city ? recipient.city : invoice.recipient.city,
            state: recipient.state ? recipient.state : invoice.recipient.state,
            phoneCode: recipient.phoneCode ? recipient.phoneCode : invoice.recipient.phoneCode,
            phoneNumber: recipient.phoneNumber ? recipient.phoneNumber : invoice.recipient.phoneNumber,
            type: recipient.type ? recipient.type : invoice.recipient.type,
            countryCode: recipient.countryCode ? recipient.countryCode : invoice.recipient.countryCode
        }
    }

    if (items && items.length > 0) {

        invoice = await InvoiceService.updateInvoiceItems(invoice, items);

        // calculate summary
        const summary = await InvoiceService.calculateSummary({
            items: invoice.items,
            partial: isZero(partial) || partial > 0 ? partial : invoice.summary.partialAmount,
            VAT: invoice.VAT
        });

        invoice.summary = {
            subtotal: summary.subtotal,
            totalAmount: summary.totalAmount,
            partialAmount: summary.partialAmount,
            amountPaid: 0,
            paidAt: 0
        }

        // update payment link if available
        if (paymentLink) {
            paymentLink.amount = invoice.summary.totalAmount;
            paymentLink.type = 'fixed';
            await paymentLink.save();
        }

    }

    await invoice.save();
    const mapped = await CorporateMapper.mapInvoiceData(invoice)

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

});

/**
 * @name getBusinessBanks
 * @description Get a reource from database
 * @route GET /vace/v1/corporate/banks
 */
export const getBusinessBanks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const pop: Array<any> = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]
    const result = await advanced(Bank, pop, '', req, 'business', business._id, null, 'absolute');
    const mapped = await CorporateMapper.mapGetBanks(result.data);

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getBusinessTransactions
 * @description Get a reource from database
 * @route GET /vace/v1/corporate/transactions
 */
export const getBusinessTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const result = await advanced(Transaction, [], 'status', req, 'business', business._id, null, 'absolute');
    const mapped = await CorporateMapper.mapTransactionList(result.data);

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name verifyTransaction
 * @description Get reource from database
 * @route POST /vace/v1/corporate/verify-transaction
 */
export const verifyTransaction = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { reference } = req.body;

    if (!reference) {
        return next(new ErrorResponse('Error', 400, ['reference is required']))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const transaction = await Transaction.findOne({ merchantRef: reference }).populate([
        { path: 'business', select: '_id email name officialEmail' }
    ]);

    if (!transaction) {
        return next(new ErrorResponse('Error', 404, ['transaction does not exist']))
    }

    if (user.userType === UserType.BUSINESS && !arrayIncludes(business.transactions, transaction._id.toString())) {
        return next(new ErrorResponse('Error', 403, ['transaction does not belong to business']))
    }

    const mapped = await CorporateMapper.mapTransactionData(transaction);

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

});

/**
 * @name getTransaction
 * @description Get reource from database
 * @route GET /vace/v1/corporate/transaction/:ref
 */
export const getTransaction = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const transaction = await Transaction.findOne({ merchantRef: req.params.ref }).populate([
        { path: 'business', select: '_id email name officialEmail' }
    ]);

    if (!transaction) {
        return next(new ErrorResponse('Error', 404, ['transaction does not exist']))
    }

    if (user.userType === UserType.BUSINESS && !arrayIncludes(business.transactions, transaction._id.toString())) {
        return next(new ErrorResponse('Error', 403, ['transaction does not belong to business']))
    }

    const mapped = await CorporateMapper.mapTransactionData(transaction);

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

});

/**
 * @name filterTransactions
 * @description Get a reource from database
 * @route POST /vace/v1/corporate/filter-transactions/
 * @access Superadmin | Admin
 */
export const filterTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let analytics: any = {};
    let result: IPagination = { count: 0, total: 0, data: [], pagination: { next: { limit: 0, page: 1 }, prev: { limit: 0, page: 1 } } }

    const body = req.body as FilterTransactionDTO;
    const { type } = req.body as FilterTransactionDTO;

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const filters = TransactionService.defineFilterQuery(body);
    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]

    if (!type) {

        const query: ISearchQuery = {
            model: Transaction,
            ref: 'business',
            value: business._id,
            data: filters,
            query: null,
            queryParam: req.query,
            populate: pop,
            operator: 'and'
        }

        result = await search(query); // search from DB

    }

    if (type) {

        const validate = await TransactionService.validateFilterSelect(body);

        if (validate.error) {
            return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
        }

        // define request query params
        const params = await TransactionService.defineFilterDateRange(body);

        // set the params
        req.query.from = params.from
        req.query.to = params.to;

        // search
        const query: ISearchQuery = {
            model: Transaction,
            ref: 'business',
            value: business._id,
            data: filters,
            query: null,
            queryParam: req.query,
            populate: pop,
            operator: 'and'
        }

        result = await search(query); // search from DB
        analytics = await TransactionRepository.aggregateFilterAnalytics({ user: business.user, dates: params })

    }

    const mapped = await CorporateMapper.mapTransactionList(result.data);

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: {
            analytics: analytics,
            transactions: mapped
        },
        message: 'successful',
        status: 200
    })

})

/**
 * @name searchTransactions
 * @description Get a reource from database
 * @route POST /vace/v1/corporate/search-transactions/
 * @access Business
 */
export const searchTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { key } = req.body;

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    if (!key) {
        return next(new ErrorResponse('Error', 400, [`search keyword is required`]))
    }

    const pop = [
        { path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
    ]

    const query: ISearchQuery = {
        model: Transaction,
        ref: 'business',
        value: business._id,
        data: [
            { reference: { $regex: key, $options: 'i' } },
            { feature: { $regex: key, $options: 'i' } },
        ],
        query: null,
        queryParam: req.query,
        populate: pop,
        operator: 'or'
    }

    const result = await search(query); // search from DB
    const mapped = await CorporateMapper.mapTransactionList(result.data);

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name initializeTransaction
 * @description Get a reource from database
 * @route POST /vace/v1/corporate/initialize
 * @access Business
 */
export const initializeTransaction = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { amount, customer, description, redirectUrl, subaccounts, message, type, reuseable, metadata, reference } = req.body as InitTransactionRequestDTO;

    const validate = await TransactionService.validateinitTransaction(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;
    const settings: ISettingDoc = business.settings;

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance approval is pending`]))
    }

    if (settings.paymentLink.request === SettingStatusType.INACTIVE) {
        return next(new ErrorResponse('Error', 403, [`request payment link is deactivated on account. contact support`]))
    }

    if (reference) {

        const payment = await PaymentLink.findOne({ initializeRef: reference });

        if (payment) {
            return next(new ErrorResponse('Error', 400, [`a payment is already initialized with the reference ${reference}`]))
        }

        const transaction = await Transaction.findOne({ merchantRef: reference });

        if (transaction) {
            return next(new ErrorResponse('Error', 400, [`a payment is already initialized with the reference ${reference}`]))
        }

        if (charLen(reference) < 8) {
            return next(new ErrorResponse('Error', 400, [`reference cannot be less than 8 characters`]))
        }

    }

    const initialize = await TransactionService.initializeTransaction({
        type: type,
        amount: type === AmountType.FIXED ? amount! : 0,
        business: business,
        customer: customer,
        subaccounts: subaccounts ? subaccounts : [],
        description: description,
        redirectUrl: redirectUrl,
        message: message,
        metadata: metadata,
        reuseable: reuseable,
        reference: reference
    });

    if (initialize.error) {
        return next(new ErrorResponse('Error', 422, [`${initialize.message}`]))
    }

    const mapped = await CorporateMapper.mapPaymentLinkData(initialize.data);

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getBeneficiaries
 * @description Get a reource from database
 * @route GET /vace/v1/corporate/beneficiaries
 */
export const getBeneficiaries = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const result = await advanced(Beneficiary, [], 'accountName', req, 'business', business._id, null, 'relative');
    const mapped = await CorporateMapper.mapGetBeneficiaries(result.data)

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name addBusinessBank
 * @description Create resource in the database
 * @route POST /vace/v1/corporate/bank
 */
export const addBusinessBank = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { bankCode, accountNo } = req.body as CreateBusinessBankDTO;

    const providerName = await ProviderService.configProviderName('bank');
    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider

    if (!accountNo) {
        return next(new ErrorResponse('Error', 400, ['account number is required']))
    }

    if (!bankCode) {
        return next(new ErrorResponse('Error', 400, ['bank code is required']))
    }

    // resolve bank acount that was provided
    const _bank = await BankService.getBank(bankCode, provider.name);

    if (!_bank) {
        return next(new ErrorResponse('Error', 400, ['invalid bank code supplied']))
    }

    const resolve = await BankService.resolveBankAccount({ bankCode, accountNo: accountNo, name: provider.name });

    if (resolve.error) {
        return next(new ErrorResponse('Error', 403, [`${resolve.message}`]));
    }

    const bankExist = await Bank.findOne({ code: _bank.code, accountNo: accountNo, business: business._id });

    if (bankExist) {
        return next(new ErrorResponse('Error', 403, [`bank already exists for business`]));
    }

    // add bank account to business
    let resolvedBank: ResolvedBankDTO = resolve.data;

    const bank = await BankService.createBank({
        code: resolvedBank.platformCode,
        accountName: resolvedBank.accountName,
        accountNo: resolvedBank.accountNo,
        business: business,
        provider: provider
    });

    if (!arrayIncludes(business.banks, bank._id.toString())) {
        business.banks.push(bank._id);
        await business.save()
    }

    let mapped = await CorporateMapper.mapBankData(bank);

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name updateSettlementBank
 * @description Create resource in the database
 * @route POST /vace/v1/corporate/change-settlement-bank
 */
export const updateSettlementBank = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { bankCode, accountNo } = req.body as CreateBusinessBankDTO;

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    if (!accountNo) {
        return next(new ErrorResponse('Error', 400, ['account number is required']))
    }

    if (!bankCode) {
        return next(new ErrorResponse('Error', 400, ['bank code is required']))
    }

    const providerName = await ProviderService.configProviderName('bank');
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider;

    const _bank = await BankService.getBank(bankCode, provider.name);

    if (!_bank) {
        return next(new ErrorResponse('Error', 400, ['invalid bank details. select a valid bank']))
    }

    const resolve = await BankService.resolveBankAccount({ bankCode: bankCode, accountNo: accountNo, name: provider.name });

    if (resolve.error) {
        return next(new ErrorResponse('Error', 403, [`${resolve.message}`]));
    }

    // add bank account to business
    let resolvedBank: ResolvedBankDTO = resolve.data;

    business.bank = {
        accountName: resolvedBank.accountName,
        accountNo: resolvedBank.accountNo,
        bankCode: resolvedBank.bankCode,
        platformCode: resolvedBank.platformCode,
        name: _bank.legalName,
        updatedAt: dateToday(Date.now()).ISO
    }
    await business.save();

    res.status(200).json({
        error: false,
        errors: [],
        data: business.bank,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getBusinessRefunds
 * @description Get a reource from database
 * @route GET /vace/v1/corporate/refunds
 */
export const getBusinessRefunds = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const pop: Array<any> = [
        { path: 'business', select: '_id email officialEmail name ' }
    ]
    const result = await advanced(Refund, pop, '', req, 'business', business._id, null, 'absolute');
    const mapped = await CorporateMapper.mapRefundList(result.data)

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getRefund
 * @description Get a reource from database
 * @route GET /vace/v1/corporate/refund/:code
 */
export const getRefund = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const refund = await Refund.findOne({ code: req.params.code }).populate([
        { path: 'transaction' },
        { path: 'refundedTxn' },
    ])

    if (!refund) {
        return next(new ErrorResponse('Error', 404, ['refund does not exist']))
    }

    if (user.userType === UserType.BUSINESS && !arrayIncludes(business.refunds, refund._id.toString())) {
        return next(new ErrorResponse('Error', 403, ['refund does not belong to business']))
    }

    const mapped = await CorporateMapper.mapRefundData(refund)

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name createRefund
 * @description Get a reource from database
 * @route POST /vace/v1/corporate/refund
 */
export const createRefund = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const providerName = await ProviderService.configProviderName('bank');
    let response: IResult = { error: false, message: '', code: 200, data: null }
    let bankDetails: any = {};

    const { option, reason, type, amount, bank, reference, pin } = req.body as CreateRefundDTO;

    const validate = await RefundService.validateCreateRefund(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]));
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    const transaction = await Transaction.findOne({ merchantRef: reference }).populate([
        { path: 'provider' }
    ]);

    if (!transaction) {
        return next(new ErrorResponse('Error', 404, ['transaction does not exist']))
    }

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending`]));
    }

    const isPinValid = await BusinessService.matchPIN(business._id, pin!);

    if (isPinValid === false) {
        return next(new ErrorResponse('Error', 403, ['invalid transaction pin supplied']))
    }

    if (business.accounts.length === 0) {
        return next(new ErrorResponse('Error', 500, [`bank account has not been generated`]));
    }

    const provider: IProviderDoc = transaction.provider
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const wallet: IWalletDoc = business.wallet;

    if (option === 'instant') {

        // get provider used to move instant refund
        const bankProvider = await ProviderService.getProviderFromList('bank');

        if (!bankProvider) {
            return next(new ErrorResponse('Error', 500, ['an error occured. contact support']))
        }

        if (bank) {

            // resolve bank acount that was provided
            const _bank = await BankService.getBank(bank.bankCode, provider.name);

            if (!_bank) {
                return next(new ErrorResponse('Error', 400, ['invalid bank details. select a valid bank']))
            }

            const resolve = await BankService.resolveBankAccount({ bankCode: bank.bankCode, accountNo: bank.accountNo, name: provider.name })

            if (resolve.error) {
                return next(new ErrorResponse('Error', 403, [`${resolve.message}`]));
            }

            let resolvedBank: ResolvedBankDTO = resolve.data;

            bankDetails = {
                accountNo: resolvedBank.accountNo,
                accountName: resolvedBank.accountName,
                name: _bank.name,
                legalName: resolvedBank.bankName,
                bankCode: resolvedBank.bankCode,
                platformCode: resolvedBank.platformCode
            }

        }

        response = await RefundService.createRefundData({
            business,
            option,
            reason,
            transaction,
            type,
            amount,
            bank: bankDetails
        });

        if (response.error) {
            return next(new ErrorResponse('Error', 500, [`${response.message}`]));
        }

        const refund: IRefundDoc = response.data;

        // payout refund instantly
        response = await RefundService.payoutRefund({
            business,
            provider: bankProvider,
            refund,
            transaction,
            wallet,
            account
        });

        if (response.error) {
            return next(new ErrorResponse('Error', 500, [`${response.message}`]));
        }

        // create audit log
        createNewAuditJob({
            action: 'createRefund',
            type: "success",
            user: user,
            entity: 'Refund',
            entityId: refund._id,
            controller: 'refund',
            description: `Created NGN${refund.amount.toLocaleString()} instant refund for transaction ${transaction.reference}`,
            changes: req.body
        })

    }

    if (option === 'request') {

        response = await RefundService.createRefundData({
            business,
            option,
            reason,
            transaction,
            type,
            amount,
            bank: bankDetails
        });

        if (response.error) {
            return next(new ErrorResponse('Error', 500, [`${response.message}`]));
        }

        const refund: IRefundDoc = response.data;

        // refund via provider API
        response = await RefundService.redirectRefundToAPI({
            business,
            provider,
            refund,
            transaction,
            wallet,
        });

        if (response.error) {
            return next(new ErrorResponse('Error', 500, [`${response.message}`]));
        }

        // create audit log
        createNewAuditJob({
            action: 'createRefund',
            type: "success",
            user: user,
            entity: 'Refund',
            entityId: refund._id,
            controller: 'refund',
            description: `Created NGN${refund.amount.toLocaleString()} request refund for transaction ${transaction.reference}`,
            changes: req.body
        })

    }

    const mapped = await CorporateMapper.mapRefundData(response.data);

    res.status(200).json({
        error: false,
        errors: [],
        data: mapped,
        message: 'successful',
        status: 200
    })

})

/**
 * @name resolveBankAccount
 * @description Get a reource from database
 * @route POST /vace/v1/corporate/resolve
 */
export const resolveBankAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { accountNo, bankCode } = req.body;
    const providerName = await ProviderService.configProviderName('bank')
    let response: IResult = { error: false, message: '', code: 200, data: null };

    if (!accountNo) {
        return next(new ErrorResponse('Error', 400, ['account number is required']))
    }

    if (!bankCode) {
        return next(new ErrorResponse('Error', 400, ['bank code is required']))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', loggedIn.code!, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;

    response = await BankService.resolveBankAccount({
        accountNo,
        bankCode: bankCode,
        name: providerName
    })

    if (response.error) {
        return next(new ErrorResponse('Error', 500, [`${response.message}`], response.data))
    }

    const resolved: ResolvedBankDTO = response.data;

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            accountNo: resolved.accountNo,
            accountName: resolved.accountName,
            bankCode: resolved.bankCode,
            bankName: resolved.bankName,
        },
        message: 'successful',
        status: 200
    })

})