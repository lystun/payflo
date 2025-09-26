import { Random, UIID, arrayIncludes, checkDateFormat, dateToday, formatISO, isDefined, isEmptyObject, isNeg, isNumber, isObjectId, isZero, leadingNum, notDefined, strIncludesEs6, stringToBase64 } from '@btffamily/vacepay';
import { CreateChargebackTransactionDTO, CreateFundTransactionDTO, CreateFundingTransactionDTO, CreateInternalTransactionDTO, CreatePayinTransactionDTO, CreatePaymentLinkTransactionDTO, CreatePayoutTransactionDTO, CreateRefundTransactionDTO, CreateReversalTransactionDTO, CreateSettledTransactionDTO, CreateVASTransactionDTO, FilterTransactionDTO, InitTransactionRequestDTO, InitializeTransactionDTO, UpdateFailedTransactionDTO, UpdateFundTransactionDTO, UpdatePayoutTransactionDTO, UpdateVASTransactionDTO, VerifySocketTxnDTO, sendNotificationDTO } from '../dtos/transaction.dto';
import Transaction from '../models/Transaction.model';
import { AmountType, BusinessType, CurrencyType, FeatureType, FilterType, PaymentLinkType, PrefixType, ProviderNameType, ProviderPaymentStatus, SettleIntoType, SettlementStatus, TransactionChannelType, TransactionFeatureType, TransactionStatus, UserType } from '../utils/enums.util';
import { IAccountDoc, IBusinessDoc, IChargebackDoc, IFeeCharged, IFilterDate, IGroupTransaction, IPaymentLinkDoc, IProviderDoc, IRefundDoc, IResult, ISettingDoc, ITransactionDoc, IUserDoc, IWalletDoc } from '../utils/types.util'
import { BaniWebhookDataDTO, BaniWebhookEvent } from '../dtos/providers/bani.dto';
import Refund from '../models/Refund.model';
import SystemService from './system.service';
import Chargeback from '../models/Chargeback.model';
import { PSBApiResponseDTO, PSBWebhookDataDTO } from '../dtos/providers/ninepsb.dto';
import BankService from './bank.service';
import ProviderService from './provider.service';
import EmailService from './email.service';
import InvoiceService from './invoice.service';
import ProductService from './product.service';
import { sendWebhookNotificationJob } from '../queues/jobs/webhook.job';
import PaymentLinkService from './payment.link.service';
import TransactionRepository from '../repositories/transaction.repository';
import fsExtra from 'fs-extra'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
import { ExportAndSendEmailDTO, ExportTransactionDTO, TransactionExistsDTO } from '../dtos/export.dto';
import ExportService from './export.service';
dayjs.extend(customparse);

interface IOverview {
    total: number,
    completed: number,
    pending: number,
    successful: number,
    failed: number,
    processing: number,
    refunded: number,
    paid: number,
    cancelled: number,
    totalAmount: number
    value: number,
    analytics: {
        total: { amount: number, feeAmount: number },
        successful: { amount: number, feeAmount: number },
        refunded: { amount: number, feeAmount: number },
        failed: { amount: number, feeAmount: number }
    }
}

class TransactionService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name validateinitTransaction
     * @param data 
     * @returns 
     */
    public async validateinitTransaction(data: InitTransactionRequestDTO): Promise<IResult> {

        const allowedTypes = ['fixed', 'dynamic']

        let result: IResult = { error: false, message: '', code: 200, data: null };
        const { amount, type, customer, redirectUrl } = data;

        if (!type) {
            result.error = true;
            result.message = 'transaction type is required'
        } else if (!arrayIncludes(allowedTypes, type)) {
            result.error = true;
            result.message = `invalid transaction type value. choose from ${allowedTypes.join(',')}`
        } else if (type === 'fixed' && (notDefined(amount) || isZero(amount))) {
            result.error = true;
            result.message = `amount is required for fixed transaction`
        } else if (type === 'fixed' && amount && isNeg(amount)) {
            result.error = true;
            result.message = `amount cannot be negative`
        } else if (!customer || isEmptyObject(customer)) {
            result.error = true;
            result.message = 'customer details is required'
        } else if (!customer.email) {
            result.error = true;
            result.message = 'customer email is required'
        } else if (!customer.firstName) {
            result.error = true;
            result.message = 'customer first name is required'
        } else if (!customer.phoneNumber) {
            result.error = true;
            result.message = 'customer phone number is required'
        } else if (redirectUrl && (!strIncludesEs6(redirectUrl, 'https://') && !strIncludesEs6(redirectUrl, 'http://'))) {
            result.error = true;
            result.message = 'redirect url must include https:// or http://';
        } else {
            result.error = false;
            result.message = ''
        }

        return result;

    }

    /**
     * @name validateFilterSelect
     * @param data 
     * @returns 
     */
    public async validateFilterSelect(data: FilterTransactionDTO): Promise<IResult> {

        const allowedTypes = ['day', 'month', 'custom-date']
        let result: IResult = { error: false, message: '', code: 200, data: null };
        const { dayNumber, type, endDate, startDate } = data;

        if (type) {

            if (!arrayIncludes(allowedTypes, type)) {
                result.error = true;
                result.message = `invalid filter type value. choose from ${allowedTypes.join(',')}`
            } else if ((type === FilterType.DAY || type === FilterType.MONTH) && notDefined(dayNumber)) {
                result.error = true;
                result.message = 'filter number of days is required'
            } else if (type === FilterType.DAY && dayNumber > 30) {
                result.error = true;
                result.message = 'days cannot be greater than 30'
            } else if (type === FilterType.MONTH && dayNumber < 30) {
                result.error = true;
                result.message = 'days cannot be less than 30'
            } else if (type === FilterType.CUSTOM_DATE && !startDate) {
                result.error = true;
                result.message = 'start date is required'
            } else if (type === FilterType.CUSTOM_DATE && startDate && !checkDateFormat(startDate)) {
                result.error = true;
                result.message = 'invalid start date format. use YYYY/MM/DD or YYYY-MM-DD'
            } else if (type === FilterType.CUSTOM_DATE && !endDate) {
                result.error = true;
                result.message = 'end date is required'
            } else if (type === FilterType.CUSTOM_DATE && endDate && !checkDateFormat(endDate)) {
                result.error = true;
                result.message = 'invalid end date format. use YYYY/MM/DD or YYYY-MM-DD'
            } else {
                result.error = false;
                result.message = ''
            }

        } else {
            result.error = false;
            result.message = ''
        }

        return result;

    }

    /**
     * @name validateExportSelect
     * @param data 
     * @returns 
     */
    public async validateExportSelect(data: ExportTransactionDTO): Promise<IResult> {

        const allowedTypes = ['day', 'month', 'custom-date']
        let result: IResult = { error: false, message: '', code: 200, data: null };
        const { endDate, startDate } = data;

        if (!startDate) {
            result.error = true;
            result.message = 'start date is required'
        } else if (!checkDateFormat(startDate)) {
            result.error = true;
            result.message = 'invalid start date format. use YYYY/MM/DD or YYYY-MM-DD'
        } else if (!endDate) {
            result.error = true;
            result.message = 'end date is required'
        } else if (!checkDateFormat(endDate)) {
            result.error = true;
            result.message = 'invalid end date format. use YYYY/MM/DD or YYYY-MM-DD'
        } else {
            result.error = false;
            result.message = ''
        }

        return result;

    }

    /**
     * @name initializeTransaction
     * @param data 
     * @returns 
     */
    public async initializeTransaction(data: InitializeTransactionDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null };
        const {
            amount, customer, business, subaccounts, description, redirectUrl,
            message, type, metadata, reuseable, reference, enableLink
        } = data;

        result = await PaymentLinkService.createPaymentLink({
            business,
            name: `Payment-Request-${Random.randomCode(4, true)}`,
            feature: FeatureType.REQUEST,
            type: type,
            amount: type === AmountType.FIXED ? amount : 0,
            redirectUrl,
            slug: `${Random.randomCode(12, true)}`,
            description,
            splits: subaccounts,
            customer: customer,
            initialized: true,
            message: message,
            metadata: metadata,
            reuseable: reuseable,
            initializeRef: reference
        })

        if (result.error === false) {

            let payment: IPaymentLinkDoc = result.data;

            if (enableLink === undefined || enableLink === true) {
                payment.isEnabled = true;
                await payment.save();
            }

            result.data = payment;

        }

        return result;

    }

    /**
     * @name attachRefund
     * @param transaction 
     * @param refund 
     */
    public async attachRefund(transaction: ITransactionDoc, refund: IRefundDoc): Promise<void> {

        if (!arrayIncludes(transaction.refunds, refund._id.toString())) {

            transaction.refunds.push(refund._id);
            await transaction.save();
        }

    }

    /**
     * @name getPaymentStatus
     * @param status 
     * @returns 
     */
    public getPaymentStatus(status: string): string {

        let result: string = TransactionStatus.PENDING;

        if (status === ProviderPaymentStatus.COMPLETED || status === ProviderPaymentStatus.PAID || status === ProviderPaymentStatus.ACTIVATED) {
            result = TransactionStatus.SUCCESSFUL;
        } if (status === ProviderPaymentStatus.SUCCESS || status === ProviderPaymentStatus.SUCCESSFUL || status === ProviderPaymentStatus.CODE00) {
            result = TransactionStatus.SUCCESSFUL;
        } else if (status === ProviderPaymentStatus.FAILED) {
            result = TransactionStatus.FAILED;
        } else if (status === ProviderPaymentStatus.IN_PROGRESS || status === ProviderPaymentStatus.ONGOING) {
            result = TransactionStatus.PROCESSING;
        } else if (status === ProviderPaymentStatus.SOURCE_PROCESSING) {
            result = TransactionStatus.PENDING;
        }

        return result;

    }

    /**
     * @name decodeBaniReference
     * @param payload 
     * @returns 
     */
    private decodeBaniReference(payload: BaniWebhookDataDTO): { reference: string, terraRef: string, providerRef: string } {

        let result: { reference: string, terraRef: string, providerRef: string } = { reference: '', terraRef: '', providerRef: '' };

        result.reference = payload.data.transaction_ref ? payload.data.transaction_ref : payload.data.transaction_reference;
        result.terraRef = payload.data.pay_ext_ref ? payload.data.pay_ext_ref : payload.data.transaction_ext_ref ? payload.data.transaction_ext_ref : payload.data.payout_details.payout_ext_ref;
        result.providerRef = payload.data.pay_ref ? payload.data.pay_ref : payload.data.payout_details && payload.data.payout_details.payout_ref ? payload.data.payout_details.payout_ref : payload.data.transaction_ref;

        return result;
    }

    /**
     * @name createPayinTransaction
     * @param data 
     * @returns 
     */
    public async createPayinTransaction(data: CreatePayinTransactionDTO): Promise<ITransactionDoc> {

        let result: IResult = { error: false, code: 200, message: '', data: null }

        let description = '', city = '', state = '';
        const { wallet, provider, type, payload, business, event, isWebhook } = data;
        const settings: ISettingDoc = business.settings;

        if (provider.name === ProviderNameType.BANI) {

            const refs = this.decodeBaniReference(payload);
            let status = this.getPaymentStatus(payload.data.pay_status ? payload.data.pay_status : payload.data.transaction_status ? payload.data.transaction_status : payload.data.payout_details.payout_status);

            const _transaction = await Transaction.findOne({ reference: refs.reference, provider: provider._id });

            if (_transaction) {

                _transaction.status = status;
                await _transaction.save();

                result.data = _transaction;

            } else {

                if (isWebhook && event === 'payin_bank_transfer') {
                    city = business.location.city
                    state = business.location.state
                    description = `Inflow on virtual account for ${business.name} on ${dateToday(Date.now()).ISO}`;
                }

                const amount = parseFloat(payload.data.merch_amount.toString())
                const actualAmount = parseFloat(payload.data.actual_amount_paid.toString())
                const reference = this.generateRef() // reference

                /**
                 * Calculate fee to get supposed stampFee
                 * Make sure to use the actual amount paid here
                 */
                const calculatedFee = await ProviderService.calculateFee({
                    amount: actualAmount,
                    provider,
                    settings,
                    type: 'transfer',
                    category: 'inflow'
                });

                const newTxn = await Transaction.create({
                    status,
                    type: type,
                    wallet: wallet._id,
                    business: business._id,
                    provider: provider._id,
                    feature: TransactionFeatureType.BANK_ACCOUNT,
                    channel: TransactionChannelType.BANK_TRANSFER,
                    reference: reference,
                    merchantRef: reference,
                    providerRef: refs.providerRef,
                    description: description,
                    amount: actualAmount,
                    unitAmount: actualAmount * 100,
                    fee: (actualAmount - amount),
                    unitFee: (actualAmount - amount) * 100,
                    vatFee: calculatedFee.vat,
                    unitVatFee: calculatedFee.vat * 100,
                    stampFee: calculatedFee.stampFee,
                    unitStampFee: calculatedFee.stampFee * 100,
                    revenue: {
                        amount: 0,
                        unitAmount: 0
                    },
                    customer: {
                        ref: payload.data.customer_ref,
                        firstName: payload.data.holder_first_name,
                        email: business.email,
                        lastName: payload.data.holder_last_name,
                        sourceAccount: payload.data.source_account_name,
                        accountNo: payload.data.holder_account_number,
                        city: city,
                        state: state,
                    },
                    bank: {
                        name: payload.data.holder_bank_name,
                        expire: {
                            date: '',
                            hours: 0,
                            minutes: 0
                        }
                    },
                    providerData: payload.data,
                    webhook: {
                        enabled: isWebhook,
                        event: event
                    }
                })

                wallet.transactions.push(newTxn._id);
                await wallet.save();

                business.transactions.push(newTxn._id);
                await business.save();

                result.data = newTxn;

            }



        }

        return result.data;

    }

    /**
     * @name createSettledTransaction
     * @param data 
     * @returns 
     */
    public async createSettledTransaction(data: CreateSettledTransactionDTO): Promise<ITransactionDoc> {

        let result: IResult = { error: false, code: 200, message: '', data: null }
        const { wallet, provider, type, business, feature, amount, settlement, settings, isSubaccount, subaccount } = data;

        let fee = 0;
        let reference = this.generateRef();

        if (provider.name === ProviderNameType.BANI) {

            const transaction = await Transaction.create({
                status: TransactionStatus.PENDING,
                amount: amount,
                unitAmount: (amount * 100),
                fee: fee,
                unitFee: (fee * 100),
                vatFee: 0,
                unitVatFee: 0,
                revenue: {
                    amount: 0,
                    unitAmount: 0
                },
                type: type,
                wallet: wallet._id,
                business: business._id,
                provider: provider._id,
                feature: feature ? feature : TransactionFeatureType.BANK_SETTLEMENT,
                channel: TransactionChannelType.BANK_TRANSFER,
                reference: reference,
                merchantRef: reference,
                webhook: {
                    enabled: false
                },
                settlement: settlement._id,
                settle: {
                    destination: settings.settlement.settleInto
                },
                description: `settlement of NGN${amount.toLocaleString()} to ${business.name}`
            });

            if (!isSubaccount) {

                if (settings.settlement.settleInto === SettleIntoType.BANK) {
                    const bank = business.bank;
                    transaction.bank = {
                        name: bank.name,
                        accountName: bank.accountName,
                        accountNo: bank.accountNo,
                        bankCode: bank.bankCode,
                    }
                    await transaction.save()
                }

            } else if (isSubaccount && subaccount) {

                transaction.bank = {
                    name: subaccount.bank.legalName,
                    accountName: subaccount.bank.accountName,
                    accountNo: subaccount.bank.accountNo,
                    bankCode: subaccount.bank.bankCode,
                }
                await transaction.save();

                subaccount.transactions.push(transaction._id);
                await subaccount.save()

            }

            wallet.transactions.push(transaction._id);
            await wallet.save();

            business.transactions.push(transaction._id);
            await business.save();

            result.data = transaction;

        }

        if (provider.name === ProviderNameType.NINEPSB) {

            const transaction = await Transaction.create({
                status: TransactionStatus.PENDING,
                amount: amount,
                unitAmount: (amount * 100),
                fee: fee,
                unitFee: (fee * 100),
                type: type,
                wallet: wallet._id,
                business: business._id,
                provider: provider._id,
                feature: feature ? feature : TransactionFeatureType.BANK_SETTLEMENT,
                channel: TransactionChannelType.BANK_TRANSFER,
                reference: reference,
                merchantRef: reference,
                webhook: {
                    enabled: false
                },
                settlement: settlement._id,
                settle: {
                    destination: settings.settlement.settleInto
                },
                description: `settlement of NGN${amount.toLocaleString()} to ${business.name}`
            });

            if (!isSubaccount) {

                if (settings.settlement.settleInto === SettleIntoType.BANK) {
                    const bank = business.bank;
                    transaction.bank = {
                        name: bank.name,
                        accountName: bank.accountName,
                        accountNo: bank.accountNo,
                        bankCode: bank.bankCode,
                    }
                    await transaction.save()
                }

            } else if (isSubaccount && subaccount) {

                transaction.bank = {
                    name: subaccount.bank.legalName,
                    accountName: subaccount.bank.accountName,
                    accountNo: subaccount.bank.accountNo,
                    bankCode: subaccount.bank.bankCode,
                }
                await transaction.save();

                subaccount.transactions.push(transaction._id);
                await subaccount.save()

            }

            wallet.transactions.push(transaction._id);
            await wallet.save();

            business.transactions.push(transaction._id);
            await business.save();

            result.data = transaction;

        }

        return result.data;

    }

    /**
     * @name createTransferTransaction
     * @param data 
     * @returns 
     */
    public async createPayoutTransaction(data: CreatePayoutTransactionDTO): Promise<ITransactionDoc> {

        let result: IResult = { error: false, code: 200, message: '', data: null }
        const { wallet, provider, type, business, isWebhook, reference, merchantRef, feature, refund, chargeback, amount, bank, isAdmin } = data;
        const settings: ISettingDoc = business.settings;

        let calculatedFee = await ProviderService.calculateFee({
            provider, settings,
            amount: amount, admin: isAdmin,
            type: 'transfer', category: 'outflow'
        });

        if (provider.name === ProviderNameType.BANI) {

            const newTxn = await Transaction.create({
                status: 'pending',
                amount: amount,
                unitAmount: (amount * 100),
                fee: calculatedFee.fee,
                unitFee: (calculatedFee.fee * 100),
                vatFee: calculatedFee.vat,
                unitVatFee: calculatedFee.vat * 100,
                revenue: {
                    amount: calculatedFee.revenue,
                    unitAmount: calculatedFee.revenue * 100
                },
                type: type,
                wallet: wallet._id,
                business: business._id,
                provider: provider._id,
                feature: feature ? feature : TransactionFeatureType.WALLET_TRANSFER,
                channel: TransactionChannelType.BANK_TRANSFER,
                reference: reference,
                merchantRef: merchantRef ? merchantRef : reference,
                balance: {
                    initial: wallet.balance.available
                },
                webhook: {
                    enabled: isWebhook
                },
                bank: {
                    name: bank && bank.name ? bank.name : '',
                    accountName: bank && bank.accountName ? bank.accountName : '',
                    accountNo: bank && bank.accountNo ? bank.accountNo : '',
                    accountType: '',
                    bankCode: bank && bank.bankCode ? bank.bankCode : '',
                    platformCode: bank ? bank.platformCode : '',
                    bankId: '',
                    expire: {
                        date: '',
                        hours: 0,
                        minutes: 0
                    }
                },
                description: `bank transfer from ${business.name} to ${bank?.accountNo}|${bank?.accountName}`
            });

            if ((newTxn.feature === TransactionFeatureType.WALLET_REFUND || newTxn.feature === TransactionFeatureType.API_REFUND) && refund) {

                newTxn.refund = refund._id;
                await newTxn.save();

            }

            if (newTxn.feature === TransactionFeatureType.WALLET_CHARGEBACK && chargeback) {

                newTxn.chargeback = chargeback._id;
                await newTxn.save();

            }

            wallet.transactions.push(newTxn._id);
            await wallet.save();

            business.transactions.push(newTxn._id);
            await business.save();

            result.data = newTxn;

        }

        if (provider.name === ProviderNameType.NINEPSB) {

            const newTxn = await Transaction.create({
                status: 'pending',
                type: type,
                amount: amount,
                unitAmount: (amount * 100),
                fee: calculatedFee.fee,
                unitFee: (calculatedFee.fee * 100),
                vatFee: calculatedFee.vat,
                unitVatFee: calculatedFee.vat * 100,
                revenue: {
                    amount: calculatedFee.revenue,
                    unitAmount: calculatedFee.revenue * 100
                },
                wallet: wallet._id,
                business: business._id,
                provider: provider._id,
                feature: feature ? feature : TransactionFeatureType.WALLET_TRANSFER,
                channel: TransactionChannelType.BANK_TRANSFER,
                reference: reference,
                merchantRef: merchantRef ? merchantRef : reference,
                balance: {
                    initial: wallet.balance.available
                },
                webhook: {
                    enabled: isWebhook
                },
                bank: {
                    name: '',
                    accountName: '',
                    accountNo: '',
                    accountType: '',
                    bankCode: '',
                    platformCode: bank ? bank.platformCode : '',
                    bankId: '',
                    expire: {
                        date: '',
                        hours: 0,
                        minutes: 0
                    }
                },
                description: `bank transfer from ${business.name} to ${bank?.accountNo}|${bank?.accountName}`
            })

            if ((newTxn.feature === TransactionFeatureType.WALLET_REFUND || newTxn.feature === TransactionFeatureType.API_REFUND) && refund) {
                newTxn.refund = refund._id;
                await newTxn.save();
            }

            if (newTxn.feature === TransactionFeatureType.WALLET_CHARGEBACK && chargeback) {
                newTxn.chargeback = chargeback._id;
                await newTxn.save();
            }

            wallet.transactions.push(newTxn._id);
            await wallet.save();

            business.transactions.push(newTxn._id);
            await business.save();

            result.data = newTxn;

        }

        return result.data;

    }

    /**
     * @name updateTransferTransaction
     * @param data 
     * @returns 
     */
    public async updatePayoutTransaction(data: UpdatePayoutTransactionDTO): Promise<ITransactionDoc> {

        let refund: IRefundDoc | null = null;
        let chargeback: IChargebackDoc | null = null;
        const bankList = await SystemService.readBanks();

        const { business, transaction, isWebhook, payload, event, provider, wallet } = data;
        const settings: ISettingDoc = business.settings;

        if (provider.name === ProviderNameType.BANI) {

            const baniPayload: BaniWebhookDataDTO = payload;
            const baniEvent: BaniWebhookEvent = event;

            if ((transaction.feature === TransactionFeatureType.WALLET_REFUND || transaction.feature === TransactionFeatureType.API_REFUND) && transaction.refund._id) {
                refund = await Refund.findOne({ _id: transaction.refund._id }).populate([{ path: 'transaction' }]);
            } else if (transaction.feature === TransactionFeatureType.WALLET_REFUND || transaction.feature === TransactionFeatureType.API_REFUND) {
                refund = await Refund.findOne({ _id: transaction.refund }).populate([{ path: 'transaction' }]);
            }

            if (transaction.feature === TransactionFeatureType.WALLET_CHARGEBACK && transaction.chargeback._id) {
                chargeback = await Chargeback.findOne({ _id: transaction.chargeback._id }).populate([{ path: 'transaction' }]);
            } else if (transaction.feature === TransactionFeatureType.WALLET_CHARGEBACK) {
                chargeback = await Chargeback.findOne({ _id: transaction.chargeback }).populate([{ path: 'transaction' }]);
            }

            const refs = this.decodeBaniReference(baniPayload);
            let status = this.getPaymentStatus(baniPayload.data.pay_status ? baniPayload.data.pay_status : baniPayload.data.transaction_status ? baniPayload.data.transaction_status : baniPayload.data.payout_details.payout_status);

            transaction.providerRef = refs.providerRef;
            transaction.providerData = baniPayload.data;
            transaction.status = status;

            if (!transaction.description) {
                transaction.description = `bank transfer from ${business.name} to ${baniPayload.data.payout_details.receiver_account_num}|${baniPayload.data.payout_details.receiver_account_name}`;
            }

            transaction.customer = {
                ref: '',
                firstName: baniPayload.data.payout_details.receiver_account_name,
                email: '',
                lastName: baniPayload.data.payout_details.receiver_account_name,
                sourceAccount: baniPayload.data.source_account_name,
                accountNo: baniPayload.data.payout_details.receiver_account_num,
                city: baniPayload.data.payout_details.receiver_city,
                state: baniPayload.data.payout_details.receiver_state,
                phoneCode: '',
                phoneNumber: ''
            }
            transaction.bank.name = baniPayload.data.payout_details.receiver_bank_name;
            transaction.webhook = {
                enabled: transaction.webhook.enabled,
                event: baniEvent
            }

            if (wallet) {
                transaction.balance.final = wallet.balance.available;
            }

            if (transaction.feature === TransactionFeatureType.BANK_SETTLEMENT && transaction.status === TransactionStatus.SUCCESSFUL) {

                transaction.settle.status = SettlementStatus.COMPLETED;
                transaction.settle.settledAt = transaction.createdAt;

                // update refunded transaction if transaction fails
                if (transaction.linkedTransaction && transaction.linkedTransaction.reference) {
                    await this.updateFailedTransaction({ reference: transaction.linkedTransaction.reference, status: TransactionStatus.REFUNDED })
                }

            }

            await transaction.save();

            if (refund) {

                const today = dateToday(Date.now());
                const formatted = formatISO(today.ISO);

                const oldTransaction: ITransactionDoc = refund.transaction;
                oldTransaction.status = 'refunded';
                await oldTransaction.save();

                refund.status = TransactionStatus.SUCCESSFUL;
                refund.refundedTxn = transaction._id;
                refund.paidAt = {
                    day: formatted.date,
                    time: formatted.time,
                    ISO: today.ISO
                }
                await refund.save();

                await this.attachRefund(transaction, refund);

            } else if (chargeback) {

                const today = dateToday(Date.now());
                const formatted = formatISO(today.ISO);

                const oldTransaction: ITransactionDoc = chargeback.transaction;
                oldTransaction.status = 'refunded';
                await oldTransaction.save();

                chargeback.status = TransactionStatus.COMPLETED;
                chargeback.chargedTxn = transaction._id;
                chargeback.paidAt = {
                    date: formatted.date,
                    time: formatted.time,
                    ISO: today.ISO
                }
                await chargeback.save();

            }

        }

        if (provider.name === ProviderNameType.NINEPSB) {

            const psbPayload: PSBApiResponseDTO = payload;

            if (transaction.feature === TransactionFeatureType.WALLET_REFUND || transaction.feature === TransactionFeatureType.API_REFUND) {
                refund = await Refund.findOne({ _id: transaction.refund }).populate([{ path: 'transaction' }]);
            }

            if (transaction.feature === TransactionFeatureType.WALLET_CHARGEBACK) {
                chargeback = await Chargeback.findOne({ _id: transaction.chargeback }).populate([{ path: 'transaction' }]);
            }

            let status = this.getPaymentStatus(psbPayload.code === '00' ? 'success' : 'failed');
            const accountName = BankService.formatAccountName(psbPayload.customer.account.name);
            let bank = bankList.find((x) => x.code === psbPayload.customer.account.bank);

            transaction.status = status;
            transaction.providerData = psbPayload;
            transaction.providerRef = psbPayload.transaction.externalreference;
            if (!transaction.description) {
                transaction.description = `bank transfer from ${business.name} to ${psbPayload.customer.account.number}|${psbPayload.customer.account.name}`;
            }
            transaction.customer = {
                firstName: accountName.first,
                lastName: accountName.middle + ' ' + accountName.last,
                accountNo: psbPayload.customer.account.number,
                city: '',
                email: '',
                phoneCode: '',
                phoneNumber: '',
                ref: '',
                sourceAccount: psbPayload.customer.account.senderaccountnumber,
                state: '',
            }
            transaction.bank = {
                name: bank ? bank.name : '',
                accountName: psbPayload.customer.account.name,
                accountNo: psbPayload.customer.account.number,
                bankCode: bank ? bank.code : '',
                expire: {
                    date: '',
                    hours: 0,
                    minutes: 0
                }
            }
            transaction.webhook = {
                enabled: transaction.webhook.enabled,
                event: 'inflow-success'
            }

            if (transaction.feature === TransactionFeatureType.BANK_SETTLEMENT && transaction.status === TransactionStatus.SUCCESSFUL) {
                transaction.settle.status = SettlementStatus.COMPLETED;
                transaction.settle.settledAt = transaction.createdAt;

                // update refunded transaction if transaction fails
                if (transaction.linkedTransaction && transaction.linkedTransaction.reference) {
                    await this.updateFailedTransaction({ reference: transaction.linkedTransaction.reference, status: TransactionStatus.REFUNDED })
                }
            }

            await transaction.save();

            if (refund) {

                const today = dateToday(Date.now());
                const formatted = formatISO(today.ISO);

                const oldTransaction: ITransactionDoc = refund.transaction;
                oldTransaction.status = 'refunded';
                await oldTransaction.save();

                refund.status = 'successful';
                refund.refundedTxn = transaction._id;
                refund.paidAt = {
                    day: formatted.date,
                    time: formatted.time,
                    ISO: today.ISO
                }
                await refund.save();

                await this.attachRefund(transaction, refund);

            } else if (chargeback) {

                const today = dateToday(Date.now());
                const formatted = formatISO(today.ISO);

                const oldTransaction: ITransactionDoc = chargeback.transaction;
                oldTransaction.status = 'refunded';
                await oldTransaction.save();

                chargeback.status = 'completed';
                chargeback.chargedTxn = transaction._id;
                chargeback.paidAt = {
                    date: formatted.date,
                    time: formatted.time,
                    ISO: today.ISO
                }
                await chargeback.save();

            }

            // send webhook notification to corporate: only for 9PSB here
            if (business.businessType === BusinessType.CORPORATE) {

                sendWebhookNotificationJob({
                    business: business,
                    transaction: transaction,
                    type: 'failed'
                });

            }

        }

        return transaction;

    }

    /**
     * @name updateFailedTransaction
     * @param data 
     * @returns 
     */
    public async updateFailedTransaction(data: UpdateFailedTransactionDTO): Promise<ITransactionDoc | null> {

        const { reference, status } = data;

        const transaction = await TransactionRepository.findByReference(reference, false);

        if (transaction && transaction.status === TransactionStatus.FAILED) {

            if (transaction.feature === TransactionFeatureType.BANK_SETTLEMENT) {
                transaction.status = status;
                await transaction.save()
            }

            return transaction;

        } else {
            return null;
        }

    }

    /**
     * @name createRefundTransaction
     * @param data 
     * @returns 
     */
    public async createRefundTransaction(data: CreateRefundTransactionDTO): Promise<ITransactionDoc> {

        let result: IResult = { error: false, code: 200, message: '', data: null }
        const { wallet, provider, type, business, isWebhook, reference, merchantRef, refund, amount, bank, isAdmin, refundType } = data;
        const settings: ISettingDoc = business.settings;

        let calculatedFee = await ProviderService.calculateFee({
            provider, settings,
            amount: amount, admin: isAdmin,
            type: 'transfer', category: 'outflow'
        });

        let feature = refundType === 'instant' ? TransactionFeatureType.WALLET_REFUND : TransactionFeatureType.API_REFUND;

        if (provider.name === ProviderNameType.BANI) {

            const newTxn = await Transaction.create({
                status: 'pending',
                amount: amount,
                unitAmount: (amount * 100),
                fee: calculatedFee.fee,
                unitFee: (calculatedFee.fee * 100),
                vatFee: calculatedFee.vat,
                unitVatFee: calculatedFee.vat * 100,
                revenue: {
                    amount: calculatedFee.revenue,
                    unitAmount: calculatedFee.revenue * 100
                },
                type: type,
                wallet: wallet._id,
                business: business._id,
                provider: provider._id,
                refund: refund._id,
                feature: feature,
                channel: TransactionChannelType.BANK_TRANSFER,
                reference: reference,
                merchantRef: merchantRef ? merchantRef : reference,
                balance: {
                    initial: wallet.balance.available
                },
                webhook: {
                    enabled: isWebhook
                },
                bank: {
                    name: bank && bank.name ? bank.name : '',
                    accountName: bank && bank.accountName ? bank.accountName : '',
                    accountNo: bank && bank.accountNo ? bank.accountNo : '',
                    accountType: '',
                    bankCode: bank && bank.bankCode ? bank.bankCode : '',
                    platformCode: bank ? bank.platformCode : '',
                    bankId: '',
                    expire: {
                        date: '',
                        hours: 0,
                        minutes: 0
                    }
                },
                description: `Refund processed from ${business.name} to ${bank?.accountNo}|${bank?.accountName}`
            });

            wallet.transactions.push(newTxn._id);
            await wallet.save();

            business.transactions.push(newTxn._id);
            await business.save();

            result.data = newTxn;

        }

        if (provider.name === ProviderNameType.NINEPSB) {

            const newTxn = await Transaction.create({
                status: 'pending',
                type: type,
                amount: amount,
                unitAmount: (amount * 100),
                fee: calculatedFee.fee,
                unitFee: (calculatedFee.fee * 100),
                vatFee: calculatedFee.vat,
                unitVatFee: calculatedFee.vat * 100,
                revenue: {
                    amount: calculatedFee.revenue,
                    unitAmount: calculatedFee.revenue * 100
                },
                wallet: wallet._id,
                business: business._id,
                provider: provider._id,
                refund: refund._id,
                feature: feature,
                channel: TransactionChannelType.BANK_TRANSFER,
                reference: reference,
                merchantRef: merchantRef ? merchantRef : reference,
                balance: {
                    initial: wallet.balance.available
                },
                webhook: {
                    enabled: isWebhook
                },
                bank: {
                    name: bank && bank.name ? bank.name : '',
                    accountName: bank && bank.accountName ? bank.accountName : '',
                    accountNo: bank && bank.accountNo ? bank.accountNo : '',
                    accountType: '',
                    bankCode: bank && bank.bankCode ? bank.bankCode : '',
                    platformCode: bank ? bank.platformCode : '',
                    bankId: '',
                    expire: {
                        date: '',
                        hours: 0,
                        minutes: 0
                    }
                },
                description: `Refund processed from ${business.name} to ${bank?.accountNo}|${bank?.accountName}`
            })

            wallet.transactions.push(newTxn._id);
            await wallet.save();

            business.transactions.push(newTxn._id);
            await business.save();

            result.data = newTxn;

        }

        return result.data;

    }

    /**
     * @name createChargebackTransaction
     * @param data 
     * @returns 
     */
    public async createChargebackTransaction(data: CreateChargebackTransactionDTO): Promise<ITransactionDoc> {

        let result: IResult = { error: false, code: 200, message: '', data: null }
        const { wallet, provider, type, business, isWebhook, reference, merchantRef, chargeback, amount, bank, isAdmin } = data;
        const settings: ISettingDoc = business.settings;

        let calculatedFee = await ProviderService.calculateFee({
            provider, settings,
            amount: amount, admin: isAdmin,
            type: 'transfer', category: 'outflow'
        });

        if (provider.name === ProviderNameType.BANI) {

            const newTxn = await Transaction.create({
                status: 'pending',
                amount: amount,
                unitAmount: (amount * 100),
                fee: calculatedFee.fee,
                unitFee: (calculatedFee.fee * 100),
                vatFee: calculatedFee.vat,
                unitVatFee: calculatedFee.vat * 100,
                revenue: {
                    amount: calculatedFee.revenue,
                    unitAmount: calculatedFee.revenue * 100
                },
                type: type,
                wallet: wallet._id,
                business: business._id,
                provider: provider._id,
                chargeback: chargeback._id,
                feature: TransactionFeatureType.WALLET_CHARGEBACK,
                channel: TransactionChannelType.BANK_TRANSFER,
                reference: reference,
                merchantRef: merchantRef ? merchantRef : reference,
                balance: {
                    initial: wallet.balance.available
                },
                webhook: {
                    enabled: isWebhook
                },
                bank: {
                    name: bank && bank.name ? bank.name : '',
                    accountName: bank && bank.accountName ? bank.accountName : '',
                    accountNo: bank && bank.accountNo ? bank.accountNo : '',
                    accountType: '',
                    bankCode: bank && bank.bankCode ? bank.bankCode : '',
                    platformCode: bank ? bank.platformCode : '',
                    bankId: '',
                    expire: {
                        date: '',
                        hours: 0,
                        minutes: 0
                    }
                },
                description: `Chargeback refund from ${business.name} to ${bank?.accountNo}|${bank?.accountName}`
            });

            wallet.transactions.push(newTxn._id);
            await wallet.save();

            business.transactions.push(newTxn._id);
            await business.save();

            result.data = newTxn;

        }

        if (provider.name === ProviderNameType.NINEPSB) {

            const newTxn = await Transaction.create({
                status: 'pending',
                type: type,
                amount: amount,
                unitAmount: (amount * 100),
                fee: calculatedFee.fee,
                unitFee: (calculatedFee.fee * 100),
                vatFee: calculatedFee.vat,
                unitVatFee: calculatedFee.vat * 100,
                revenue: {
                    amount: calculatedFee.revenue,
                    unitAmount: calculatedFee.revenue * 100
                },
                wallet: wallet._id,
                business: business._id,
                provider: provider._id,
                chargeback: chargeback._id,
                feature: TransactionFeatureType.WALLET_CHARGEBACK,
                channel: TransactionChannelType.BANK_TRANSFER,
                reference: reference,
                merchantRef: merchantRef ? merchantRef : reference,
                balance: {
                    initial: wallet.balance.available
                },
                webhook: {
                    enabled: isWebhook
                },
                bank: {
                    name: bank && bank.name ? bank.name : '',
                    accountName: bank && bank.accountName ? bank.accountName : '',
                    accountNo: bank && bank.accountNo ? bank.accountNo : '',
                    accountType: '',
                    bankCode: bank && bank.bankCode ? bank.bankCode : '',
                    platformCode: bank ? bank.platformCode : '',
                    bankId: '',
                    expire: {
                        date: '',
                        hours: 0,
                        minutes: 0
                    }
                },
                description: `Chargeback refund from ${business.name} to ${bank?.accountNo}|${bank?.accountName}`
            })

            wallet.transactions.push(newTxn._id);
            await wallet.save();

            business.transactions.push(newTxn._id);
            await business.save();

            result.data = newTxn;

        }

        return result.data;

    }

    /**
     * @name createReversalTransaction
     * @param data 
     * @returns 
     */
    public async createReversalTransaction(data: CreateReversalTransactionDTO): Promise<ITransactionDoc> {

        let result: IResult = { error: false, code: 200, message: '', data: null }
        const { wallet, provider, type, business, isWebhook, reference, feature, transaction, status, addFee } = data;
        const settings: ISettingDoc = business.settings;

        let fee: number = addFee ? transaction.fee : 0;
        const transactionData = await TransactionRepository.findByReferenceAndSelectRevenue(transaction.reference, true)

        if (provider.name === ProviderNameType.BANI) {

            const newTxn = await Transaction.create({
                status: status,
                type: type,
                wallet: wallet._id,
                business: business._id,
                provider: provider._id,
                feature: feature ? feature : TransactionFeatureType.WALLET_REFUND,
                channel: transaction.channel,
                webhook: {
                    enabled: isWebhook
                },
                linkedTransaction: transaction._id,
                amount: transaction.amount,
                unitAmount: transaction.unitAmount,
                fee: fee,
                unitFee: (fee * 100),
                vatFee: transaction.vatFee,
                unitVatFee: transaction.unitVatFee,
                revenue: {
                    amount: 0,
                    unitAmount: 0,
                    reversed: transactionData ? transactionData.revenue.amount : 0,
                    unitReversed: transactionData ? (transactionData.revenue.amount * 100) : 0
                },
                reference: reference,
                merchantRef: transaction.merchantRef ? transaction.merchantRef : transaction.reference,
                providerData: transaction.providerData,
                providerRef: transaction.providerRef,
                currency: transaction.currency,
                description: `reversal of NGN${transaction.amount.toLocaleString()} : ${transaction.reference}`,
                vasData: transaction.vasData,
                ipAddress: transaction.ipAddress,
                card: transaction.card,
                bank: transaction.bank,
                customer: transaction.customer,
                payment: transaction.payment,
                refund: transaction.refund,
                chargeback: transaction.chargeback,
                balance: {
                    initial: wallet.balance.available
                }
            });

            // update original transaction
            transaction.linkedTransaction = newTxn._id;
            transaction.status = 'refunded';
            await transaction.save();

            wallet.transactions.push(newTxn._id);
            await wallet.save();

            business.transactions.push(newTxn._id);
            await business.save();

            result.data = newTxn;

        }

        if (provider.name === ProviderNameType.NINEPSB) {

            const newTxn = await Transaction.create({
                status: status,
                type: type,
                wallet: wallet._id,
                business: business._id,
                provider: provider._id,
                feature: feature ? feature : TransactionFeatureType.WALLET_REFUND,
                channel: transaction.channel,
                webhook: {
                    enabled: isWebhook
                },
                linkedTransaction: transaction._id,
                amount: transaction.amount,
                unitAmount: transaction.unitAmount,
                fee: fee,
                unitFee: fee * 100,
                vatFee: transaction.vatFee,
                unitVatFee: transaction.unitVatFee,
                revenue: {
                    amount: 0,
                    unitAmount: 0
                },
                reference: reference,
                merchantRef: transaction.merchantRef ? transaction.merchantRef : transaction.reference,
                providerData: transaction.providerData,
                providerRef: transaction.providerRef,
                currency: transaction.currency,
                description: `reversal of NGN${transaction.amount.toLocaleString()} : ${transaction.reference}`,
                vasData: transaction.vasData,
                ipAddress: transaction.ipAddress,
                card: transaction.card,
                bank: transaction.bank,
                customer: transaction.customer,
                payment: transaction.payment,
                refund: transaction.refund,
                chargeback: transaction.chargeback,
                balance: {
                    initial: wallet.balance.available
                }
            });

            // update original transaction
            transaction.linkedTransaction = newTxn._id;
            transaction.status = 'refunded';
            await transaction.save();

            wallet.transactions.push(newTxn._id);
            await wallet.save();

            business.transactions.push(newTxn._id);
            await business.save();

            result.data = newTxn;

        }

        return result.data;

    }

    /**
     * @name createFundTransaction
     * @param data 
     * @returns 
     */
    public async createFundTransaction(data: CreateFundTransactionDTO): Promise<ITransactionDoc> {

        //TODO: fix transaction amount here
        let result: IResult = { error: false, code: 200, message: '', data: null }
        const { business, type, provider, isWebhook, reference, feature, wallet } = data;

        if (provider.name === ProviderNameType.BANI) {

            const newTxn = await Transaction.create({
                status: 'pending',
                type: type,
                business: business._id,
                wallet: wallet._id,
                provider: provider._id,
                feature: TransactionFeatureType.BANK_TRANSFER,
                channel: TransactionChannelType.BANK_TRANSFER,
                reference: reference,
                merchantRef: reference,
                webhook: {
                    enabled: isWebhook
                },
                bank: {
                    name: '',
                    accountName: '',
                    accountNo: '',
                    accountType: '',
                    bankCode: '',
                    bankId: '',
                    expire: {
                        date: '',
                        hours: 0,
                        minutes: 0
                    }
                },
                description: `Funding: bank transfer of to user`
            });

            business.transactions.push(newTxn._id);
            await business.save();

            wallet.transactions.push(newTxn._id);
            await wallet.save()

            result.data = newTxn;

        }

        if (provider.name === ProviderNameType.NINEPSB) {

            const newTxn = await Transaction.create({
                status: 'pending',
                type: type,
                business: business._id,
                provider: provider._id,
                wallet: wallet._id,
                feature: TransactionFeatureType.BANK_ACCOUNT,
                channel: TransactionChannelType.BANK_TRANSFER,
                reference: reference,
                merchantRef: reference,
                webhook: {
                    enabled: isWebhook
                },
                bank: {
                    name: '',
                    accountName: '',
                    accountNo: '',
                    accountType: '',
                    bankCode: '',
                    bankId: '',
                    expire: {
                        date: '',
                        hours: 0,
                        minutes: 0
                    }
                },
                description: `Funding: bank transfer of to user`
            });

            business.transactions.push(newTxn._id);
            await business.save();

            wallet.transactions.push(newTxn._id);
            await wallet.save()

            result.data = newTxn;

        }

        return result.data;

    }

    /**
     * @name updateFundTransaction
     * @param data 
     * @returns 
     */
    public async updateFundTransaction(data: UpdateFundTransactionDTO): Promise<ITransactionDoc> {

        const bankList = await SystemService.readBanks();
        let { business, provider, transaction, payload } = data;
        const settings: ISettingDoc = business.settings;

        if (provider.name === ProviderNameType.BANI) {
            return transaction;
        }

        if (provider.name === ProviderNameType.NINEPSB) {

            const _response: PSBWebhookDataDTO = payload;

            let status = this.getPaymentStatus(_response.code === '00' ? 'success' : 'failed');
            const accountName = BankService.formatAccountName(_response.customer.account.name);
            let bank = bankList.find((x) => x.code === _response.customer.account.bank);
            let calculatedFee = await ProviderService.calculateFee({
                provider, settings,
                amount: parseFloat(_response.order.amount.toString()),
                type: 'transfer', category: 'inflow'
            });

            transaction.status = status;
            transaction.providerData = payload;
            transaction.webhook = {
                enabled: true,
                event: 'inflow-success',
                sessionId: _response.transaction.sessionid
            }
            transaction.description = `Incoming payment of NGN${_response.order.amount.toLocaleString()} from ${_response.customer.account.senderaccountnumber}`;
            transaction.amount = parseFloat(_response.order.amount.toString());
            transaction.unitAmount = parseFloat(_response.order.amount.toString()) * 100;
            transaction.fee = calculatedFee.fee;
            transaction.unitFee = calculatedFee.fee * 100;
            transaction.vatFee = calculatedFee.vat;
            transaction.unitVatFee = calculatedFee.vat * 100;
            transaction.revenue = {
                amount: 0,
                unitAmount: 0,
                reversed: 0,
                unitReversed: 0
            }
            transaction.customer = {
                firstName: accountName.first,
                lastName: accountName.middle + ' ' + accountName.last,
                accountNo: _response.customer.account.number,
                city: '',
                email: '',
                phoneCode: '',
                phoneNumber: '',
                ref: '',
                sourceAccount: _response.customer.account.senderaccountnumber,
                state: '',
            }
            transaction.bank = {
                name: bank ? bank.name : '',
                accountName: _response.customer.account.name,
                accountNo: _response.customer.account.number,
                bankCode: bank ? bank.code : ''
            }

            await transaction.save();

        }

        return transaction;

    }

    /**
     * @name createInternalTransaction
     * @param data 
     * @returns 
     */
    public async createInternalTransaction(data: CreateInternalTransactionDTO): Promise<ITransactionDoc> {

        let result: IResult = { error: false, code: 200, message: '', data: null }

        let description = '';
        const { wallet, provider, type, business, isWebhook, reference, amount, _account, _sender, merchantRef } = data;
        const settings: ISettingDoc = business.settings;

        if (provider.name === ProviderNameType.BANI) {

            if (type === 'credit') {
                description = `Inflow of ${amount.toLocaleString()} from ${_account.accountNo} | ${_account.accountName} on ${dateToday(Date.now()).ISO}`;
            }

            if (type === 'debit') {
                description = `Outflow of ${amount.toLocaleString()} to ${_account.accountNo} | ${_account.accountName} on ${dateToday(Date.now()).ISO}`;
            }

            const transaction = await Transaction.create({
                status: TransactionStatus.SUCCESSFUL,
                type: type,
                wallet: wallet._id,
                business: business._id,
                provider: provider._id,
                feature: type === 'credit' ? TransactionFeatureType.INTERNAL_CREDIT : TransactionFeatureType.INTERNAL_DEBIT,
                channel: TransactionChannelType.BANK_TRANSFER,
                reference: reference,
                merchantRef: merchantRef ? merchantRef : reference,
                providerRef: '',
                description: description,
                amount: amount,
                unitAmount: amount * 100,
                fee: 0,
                unitFee: (0 * 100),
                customer: type === 'credit' ? {
                    ref: _account.customer.reference,
                    firstName: _sender.name,
                    email: _sender.email,
                    lastName: '',
                    sourceAccount: _account.accountName,
                    accountNo: _account.accountNo,
                    city: _sender.location.city,
                    state: _sender.location.state,
                } : {
                    ref: _sender.accounts[0].customer.reference,
                    firstName: _sender.name,
                    email: _sender.email,
                    lastName: '',
                    sourceAccount: _sender.accounts[0].accountName,
                    accountNo: _sender.accounts[0].accountNo,
                    city: _sender.location.city,
                    state: _sender.location.state,
                },
                bank: {
                    name: business.accounts[0].bank.name
                },
                providerData: {},
                webhook: {
                    enabled: isWebhook,
                    event: 'internal.transfer'
                }
            })

            wallet.transactions.push(transaction._id);
            await wallet.save();

            business.transactions.push(transaction._id);
            await business.save();

            result.data = transaction;

        }

        if (provider.name === ProviderNameType.NINEPSB) {

            let calculatedFee: IFeeCharged = { fee: 0, providerFee: 0, revenue: 0, vat: 0, settlement: 0, stampFee: 0 };

            if (type === 'credit') {
                description = `Inflow of ${amount.toLocaleString()} from ${_account.accountNo} | ${_account.accountName} on ${dateToday(Date.now()).ISO}`;
                calculatedFee = await ProviderService.calculateFee({ provider, settings, amount, type: 'transfer', category: 'inflow' });
            }

            if (type === 'debit') {
                description = `Outflow of ${amount.toLocaleString()} to ${_account.accountNo} | ${_account.accountName} on ${dateToday(Date.now()).ISO}`;
                calculatedFee = await ProviderService.calculateFee({ provider, settings, amount, type: 'transfer', category: 'outflow' });
            }

            const transaction = await Transaction.create({
                status: TransactionStatus.SUCCESSFUL,
                type: type,
                wallet: wallet._id,
                business: business._id,
                provider: provider._id,
                feature: type === 'credit' ? TransactionFeatureType.INTERNAL_CREDIT : TransactionFeatureType.INTERNAL_DEBIT,
                channel: TransactionChannelType.BANK_TRANSFER,
                reference: reference,
                merchantRef: merchantRef ? merchantRef : reference,
                providerRef: '',
                description: description,
                amount: amount,
                unitAmount: amount * 100,
                fee: 0,
                unitFee: 0,
                vatFee: 0,
                unitVatFee: 0,
                customer: type === 'credit' ? {
                    ref: _account.customer.reference,
                    firstName: _sender.name,
                    email: _sender.email,
                    lastName: '',
                    sourceAccount: _account.accountName,
                    accountNo: _account.accountNo,
                    city: _sender.location.city,
                    state: _sender.location.state,
                } : {
                    ref: _sender.accounts[0].customer.reference,
                    firstName: _sender.name,
                    email: _sender.email,
                    lastName: '',
                    sourceAccount: _sender.accounts[0].accountName,
                    accountNo: _sender.accounts[0].accountNo,
                    city: _sender.location.city,
                    state: _sender.location.state,
                },
                bank: {
                    name: business.accounts[0].bank.name
                },
                providerData: {},
                webhook: {
                    enabled: isWebhook,
                    event: 'internal.transfer'
                },
                revenue: {
                    amount: 0,
                    unitAmount: 0
                }
            })

            wallet.transactions.push(transaction._id);
            await wallet.save();

            business.transactions.push(transaction._id);
            await business.save();

            result.data = transaction;

        }

        return result.data;

    }

    /**
     * @name createFundingTransaction
     * @param data 
     * @returns 
     */
    public async createFundingTransaction(data: CreateFundingTransactionDTO): Promise<ITransactionDoc> {

        let result: IResult = { error: false, code: 200, message: '', data: null }
        let description = '';
        const { wallet, provider, type, business, isWebhook, reference, amount, account, feature } = data;

        if (provider.name === ProviderNameType.BANI) {

            if (type === 'credit') {
                description = `Inflow of ${amount.toLocaleString()} from ${account.accountNo} | ${account.accountName} on ${dateToday(Date.now()).ISO}`;
            }

            if (type === 'debit') {
                description = `Outflow of ${amount.toLocaleString()} to ${account.accountNo} | ${account.accountName} on ${dateToday(Date.now()).ISO}`;
            }

            const transaction = await Transaction.create({
                status: TransactionStatus.SUCCESSFUL,
                type: type,
                wallet: wallet._id,
                business: business._id,
                provider: provider._id,
                feature: type === 'credit' ? TransactionFeatureType.INTERNAL_CREDIT : TransactionFeatureType.INTERNAL_DEBIT,
                channel: TransactionChannelType.BANK_TRANSFER,
                reference: reference,
                merchantRef: reference,
                providerRef: '',
                description: description,
                amount: amount,
                unitAmount: amount * 100,
                fee: 0,
                unitFee: 0,
                vatFee: 0,
                unitVatFee: 0,
                revenue: {
                    amount: 0,
                    unitAmount: 0
                },
                customer: type === 'credit' ? {
                    ref: account.customer.reference,
                    firstName: business.name,
                    email: business.email,
                    lastName: '',
                    sourceAccount: account.accountName,
                    accountNo: account.accountNo,
                    city: business.location.city,
                    state: business.location.state,
                } : {
                    ref: account.customer.reference,
                    firstName: business.name,
                    email: business.email,
                    lastName: '',
                    sourceAccount: account.accountName,
                    accountNo: account.accountNo,
                    city: business.location.city,
                    state: business.location.state,
                },
                bank: {
                    name: account.bank.name
                },
                providerData: {},
                webhook: {
                    enabled: isWebhook,
                    event: 'internal.transfer'
                }
            })

            wallet.transactions.push(transaction._id);
            await wallet.save();

            business.transactions.push(transaction._id);
            await business.save();

            result.data = transaction;

        }

        if (provider.name === ProviderNameType.NINEPSB) {

            if (type === 'credit') {
                description = `Inflow of ${amount.toLocaleString()} from ${account.accountNo} | ${account.accountName} on ${dateToday(Date.now()).ISO}`;
            }

            if (type === 'debit') {
                description = `Outflow of ${amount.toLocaleString()} to ${account.accountNo} | ${account.accountName} on ${dateToday(Date.now()).ISO}`;
            }

            const transaction = await Transaction.create({
                status: TransactionStatus.SUCCESSFUL,
                type: type,
                wallet: wallet._id,
                business: business._id,
                provider: provider._id,
                feature: type === 'credit' ? TransactionFeatureType.INTERNAL_CREDIT : TransactionFeatureType.INTERNAL_DEBIT,
                channel: TransactionChannelType.BANK_TRANSFER,
                reference: reference,
                merchantRef: reference,
                providerRef: '',
                description: description,
                amount: amount,
                unitAmount: amount * 100,
                fee: 0,
                unitFee: 0,
                vatFee: 0,
                unitVatFee: 0,
                revenue: {
                    amount: 0,
                    unitAmount: 0
                },
                customer: type === 'credit' ? {
                    ref: account.customer.reference,
                    firstName: business.name,
                    email: business.email,
                    lastName: '',
                    sourceAccount: account.accountName,
                    accountNo: account.accountNo,
                    city: business.location.city,
                    state: business.location.state,
                } : {
                    ref: account.customer.reference,
                    firstName: business.name,
                    email: business.email,
                    lastName: '',
                    sourceAccount: account.accountName,
                    accountNo: account.accountNo,
                    city: business.location.city,
                    state: business.location.state,
                },
                bank: {
                    name: account.bank.name
                },
                providerData: {},
                webhook: {
                    enabled: isWebhook,
                    event: 'internal.transfer'
                }
            })

            wallet.transactions.push(transaction._id);
            await wallet.save();

            business.transactions.push(transaction._id);
            await business.save();

            result.data = transaction;

        }

        return result.data;

    }

    /**
     * @name createVASTransaction
     * @param data 
     * @returns 
     */
    public async createVASTransaction(data: CreateVASTransactionDTO): Promise<ITransactionDoc> {

        let result: IResult = { error: false, code: 200, message: '', data: null }
        const { wallet, provider, type, business, isWebhook, reference, feature, vasRef, amount, merchantRef } = data;
        const settings: ISettingDoc = business.settings;

        let calculatedFee = await ProviderService.calculateFee({
            provider, settings,
            amount: amount,
            type: 'bill', category: 'outflow'
        });

        if (provider.name === ProviderNameType.BANI) {

            // NB: fee or vat does not apply to VAS
            const newTxn = await Transaction.create({
                status: 'pending',
                amount: amount,
                unitAmount: (amount * 100),
                fee: 0,
                unitFee: (0 * 100),
                vatFee: calculatedFee.vat,
                unitVatFee: calculatedFee.vat * 100,
                revenue: {
                    amount: 0,
                    unitAmount: 0 * 100
                },
                type: type,
                wallet: wallet._id,
                business: business._id,
                provider: provider._id,
                feature: feature ? feature : TransactionFeatureType.WALLET_VAS,
                channel: TransactionChannelType.BILLS_PAYMENT,
                reference: reference,
                merchantRef: merchantRef ? merchantRef : reference,
                webhook: {
                    enabled: isWebhook
                },
                vasData: {
                    ref: vasRef ? vasRef : ''
                },
                description: `NGN${amount.toLocaleString()} of bill purchased via ${business.name} wallet`
            })

            wallet.transactions.push(newTxn._id);
            await wallet.save();

            business.transactions.push(newTxn._id);
            await business.save();

            result.data = newTxn;

        }

        if (provider.name === ProviderNameType.ONAFRIQ) {

            // NB: fee or vat does not apply to VAS
            const newTxn = await Transaction.create({
                status: 'pending',
                amount: amount,
                unitAmount: (amount * 100),
                fee: 0,
                unitFee: (0 * 100),
                vatFee: calculatedFee.vat,
                unitVatFee: calculatedFee.vat * 100,
                revenue: {
                    amount: 0,
                    unitAmount: 0 * 100
                },
                type: type,
                wallet: wallet._id,
                business: business._id,
                provider: provider._id,
                feature: feature ? feature : TransactionFeatureType.WALLET_VAS,
                channel: TransactionChannelType.BILLS_PAYMENT,
                reference: reference,
                merchantRef: merchantRef ? merchantRef : reference,
                webhook: {
                    enabled: isWebhook
                },
                vasData: {
                    ref: vasRef ? vasRef : ''
                },
                description: `NGN${amount.toLocaleString()} of bill purchased via ${business.name} wallet`
            })

            wallet.transactions.push(newTxn._id);
            await wallet.save();

            business.transactions.push(newTxn._id);
            await business.save();

            result.data = newTxn;

        }

        if (provider.name === ProviderNameType.NINEPSB) {

            // NB: fee or vat does not apply to VAS
            const newTxn = await Transaction.create({
                status: 'pending',
                type: type,
                amount: amount,
                unitAmount: (amount * 100),
                fee: 0,
                unitFee: (0 * 100),
                vatFee: calculatedFee.vat,
                unitVatFee: calculatedFee.vat * 100,
                revenue: {
                    amount: 0,
                    unitAmount: 0 * 100
                },
                wallet: wallet._id,
                business: business._id,
                provider: provider._id,
                feature: feature ? feature : TransactionFeatureType.WALLET_VAS,
                channel: TransactionChannelType.BILLS_PAYMENT,
                reference: reference,
                merchantRef: merchantRef ? merchantRef : reference,
                webhook: {
                    enabled: isWebhook
                },
                vasData: {
                    ref: vasRef
                },
                description: `NGN${amount.toLocaleString()} of bill purchased via ${business.name} wallet`
            })

            wallet.transactions.push(newTxn._id);
            await wallet.save();

            business.transactions.push(newTxn._id);
            await business.save();

            result.data = newTxn;

        }

        return result.data;

    }

    /**
     * @name updateVASTransaction
     * @param data 
     * @returns 
     */
    public async updateVASTransaction(data: UpdateVASTransactionDTO): Promise<ITransactionDoc> {

        const { business, account, transaction, isWebhook, payload, event, provider, type, request } = data;

        if (provider.name === ProviderNameType.BANI) {

            let token: string = '';
            const _response: BaniWebhookDataDTO = payload;

            const refs = this.decodeBaniReference(_response);
            let status = this.getPaymentStatus(_response.data.pay_status ? _response.data.pay_status : _response.data.transaction_status ? _response.data.transaction_status : _response.data.payout_details.payout_status);

            if (_response.data.biller_extra_info) {
                token = _response.data.biller_extra_info.split('|')[0];
            }

            transaction.providerRef = refs.providerRef;
            transaction.providerData = _response.data;
            transaction.status = status;
            transaction.vasData = {
                ref: transaction.vasData.ref,
                type: _response.data.main_category,
                phoneNumber: _response.data.customer_phone_number,
                network: _response.data.customer_phone_network,
                billerCode: _response.data.customer_biller_code,
                billerName: _response.data.customer_biller_name,
                hasToken: token ? true : false,
                token: token
            }
            transaction.description = `${transaction.amount} ${transaction.vasData.network} ${transaction.vasData.type} purchased via ${business.name} wallet`;
            transaction.customer = {
                ref: '',
                firstName: _response.data.customer_phone_number,
                email: '',
                lastName: _response.data.customer_phone_number,
                sourceAccount: _response.data.customer_biller_name,
                accountNo: _response.data.customer_biller_code,
                city: '',
                state: '',
                phoneCode: '',
                phoneNumber: ''
            }
            transaction.bank = {
                name: ''
            }
            transaction.webhook = {
                enabled: transaction.webhook.enabled,
                event: event
            }

            await transaction.save();

        }

        if (provider.name === ProviderNameType.NINEPSB) {

            const _response: PSBApiResponseDTO = payload;

            let code = _response.responseCode ? _response.responseCode.toString() : _response.code ? _response.code.toString() : '00';
            let status = this.getPaymentStatus((code === '200' || code === '00') ? 'success' : 'failed');

            transaction.reference = transaction.reference;
            transaction.providerRef = transaction.providerRef;
            transaction.providerData = _response;
            transaction.status = status;
            transaction.vasData = {
                ref: transaction.vasData.ref,
                type: type ? type : 'N/A',
                phoneNumber: _response.recipient,
                network: _response.network ? _response.network : type!,
                billerCode: _response.dataPlan ? _response.dataPlan : 'N/A',
                billerName: 'N/A',
                hasToken: _response.isToken,
                token: _response.token
            }
            transaction.description = `NGN${transaction.amount.toLocaleString()} ${transaction.vasData.network} ${transaction.vasData.type} purchased via ${business.name} wallet`;
            transaction.customer = {
                ref: '',
                firstName: _response.recipient,
                email: '',
                lastName: 'N/A',
                sourceAccount: 'N/A',
                accountNo: '',
                city: '',
                state: '',
                phoneCode: '+234',
                phoneNumber: _response.recipient
            }
            transaction.bank = {
                name: ''
            }
            transaction.webhook = {
                enabled: transaction.webhook.enabled,
                event: event
            }

            await transaction.save();

            // send webhook notification to corporate: only for 9PSB here
            if (business.businessType === BusinessType.CORPORATE) {

                sendWebhookNotificationJob({
                    business: business,
                    transaction: transaction,
                    type: 'failed'
                });

            }

        }

        return transaction;

    }

    /**
    * @name createPaymentLinkTransferTransaction
    * @param data 
    * @returns 
    */
    public async createPaymentLinkTransaction(data: CreatePaymentLinkTransactionDTO): Promise<ITransactionDoc> {

        let result: IResult = { error: false, code: 200, message: '', data: null }
        const {
            option, wallet, provider, type, business, isWebhook, reference, feature,
            customer, bank, amount, payment, product, invoice, card, quantity
        } = data;
        const settings: ISettingDoc = business.settings;

        if (option === 'transfer') {

            if (provider.name === ProviderNameType.BANI) {

                let calculatedFee = await ProviderService.calculateFee({
                    provider, settings,
                    amount: amount, type: 'transfer',
                    category: 'inflow'
                });

                const newTxn = await Transaction.create({
                    status: 'pending',
                    type: type,
                    wallet: wallet._id,
                    business: business._id,
                    provider: provider._id,
                    feature: TransactionFeatureType.PAYMENT_LINK,
                    reference: reference,
                    merchantRef: payment.initializeRef ? payment.initializeRef : '',
                    channel: TransactionChannelType.BANK_TRANSFER,
                    payment: payment._id,
                    currency: CurrencyType.NGN,
                    amount: amount,
                    unitAmount: (amount * 100),
                    fee: calculatedFee.fee,
                    unitFee: (calculatedFee.fee * 100),
                    vatFee: calculatedFee.vat,
                    unitVatFee: calculatedFee.vat * 100,
                    revenue: {
                        amount: calculatedFee.revenue,
                        unitAmount: calculatedFee.revenue * 100
                    },
                    productQty: isDefined(quantity) ? quantity : 0,
                    webhook: {
                        enabled: isWebhook,
                        isSent: false
                    },
                    customer: {
                        firstName: customer.firstName,
                        lastName: customer.lastName,
                        email: customer.email,
                        phoneNumber: customer.phoneNumber,
                        phoneCode: customer.phoneCode
                    },
                    bank: {
                        name: bank!.name,
                        accountName: bank!.accountName,
                        accountNo: bank!.accountNo,
                        expire: bank!.expire,
                        accountType: 'temporary',
                        logo: bank?.logo
                    },
                    settle: {
                        status: SettlementStatus.PENDING,
                        amount: calculatedFee.settlement,
                        settledAt: null
                    },
                    metadata: payment.metadata,
                    invoice: payment.feature === FeatureType.INVOICE && invoice ? invoice._id : null,
                    product: payment.feature === FeatureType.PRODUCT && product ? product._id : null,
                    description: `incoming payment of NGN${amount.toLocaleString()} via payment link`
                })

                /* don't add payment-link transactions to wallet */
                // wallet.transactions.push(newTxn._id);
                // await wallet.save();

                business.transactions.push(newTxn._id);
                await business.save();

                payment.transactions.push(newTxn._id);
                await payment.save();

                if (payment.feature === FeatureType.INVOICE && invoice) {
                    await InvoiceService.attachTransaction(invoice, newTxn);
                }

                if (payment.feature === FeatureType.PRODUCT && product) {
                    await ProductService.attachTransaction(product, newTxn);
                }

                result.data = newTxn;

            }

            if (provider.name === ProviderNameType.NINEPSB) {

                let calculatedFee = await ProviderService.calculateFee({
                    provider, settings,
                    amount: amount, type: 'transfer',
                    category: 'inflow'
                });

                const newTxn = await Transaction.create({
                    status: 'pending',
                    type: type,
                    wallet: wallet._id,
                    business: business._id,
                    provider: provider._id,
                    feature: TransactionFeatureType.PAYMENT_LINK,
                    channel: TransactionChannelType.BANK_TRANSFER,
                    reference: reference,
                    merchantRef: payment.initializeRef ? payment.initializeRef : '',
                    payment: payment._id,
                    currency: CurrencyType.NGN,
                    amount: amount,
                    unitAmount: (amount * 100),
                    fee: calculatedFee.fee,
                    unitFee: (calculatedFee.fee * 100),
                    vatFee: calculatedFee.vat,
                    unitVatFee: calculatedFee.vat * 100,
                    productQty: isDefined(quantity) ? quantity : 0,
                    revenue: {
                        amount: calculatedFee.revenue,
                        unitAmount: calculatedFee.revenue * 100
                    },
                    webhook: {
                        enabled: isWebhook,
                        isSent: false
                    },
                    customer: {
                        firstName: customer.firstName,
                        lastName: customer.lastName,
                        email: customer.email,
                        phoneNumber: customer.phoneNumber,
                        phoneCode: customer.phoneCode
                    },
                    bank: {
                        name: bank!.name,
                        accountName: bank!.accountName,
                        accountNo: bank!.accountNo,
                        expire: bank!.expire,
                        accountType: 'temporary',
                        logo: bank?.logo
                    },
                    settle: {
                        status: SettlementStatus.PENDING,
                        amount: calculatedFee.settlement,
                        settledAt: null
                    },
                    metadata: payment.metadata,
                    invoice: payment.feature === FeatureType.INVOICE && invoice ? invoice._id : null,
                    product: payment.feature === FeatureType.PRODUCT && product ? product._id : null,
                    description: `incoming payment of NGN${amount.toLocaleString()} via payment link`
                })

                /* don't add payment-link transactions to wallet */
                // wallet.transactions.push(newTxn._id);
                // await wallet.save();

                business.transactions.push(newTxn._id);
                await business.save();

                payment.transactions.push(newTxn._id);
                await payment.save();

                if (payment.feature === FeatureType.INVOICE && invoice) {
                    await InvoiceService.attachTransaction(invoice, newTxn);
                }

                if (payment.feature === FeatureType.PRODUCT && product) {
                    await ProductService.attachTransaction(product, newTxn);
                }

                result.data = newTxn;

            }

        }

        if (option === 'card') {

            if (provider.name === ProviderNameType.PAYSTACK) {

                let calculatedFee = await ProviderService.calculateFee({
                    provider, settings,
                    amount: amount,
                    type: 'card',
                    category: 'outflow'
                });

                const newTxn = await Transaction.create({
                    status: 'pending',
                    type: type,
                    wallet: wallet._id,
                    business: business._id,
                    provider: provider._id,
                    feature: TransactionFeatureType.PAYMENT_LINK,
                    channel: TransactionChannelType.CARD,
                    reference: reference,
                    merchantRef: payment.initializeRef ? payment.initializeRef : '',
                    payment: payment._id,
                    currency: CurrencyType.NGN,
                    amount: amount,
                    unitAmount: (amount * 100),
                    fee: calculatedFee.fee,
                    unitFee: (calculatedFee.fee * 100),
                    vatFee: calculatedFee.vat,
                    unitVatFee: calculatedFee.vat * 100,
                    productQty: isDefined(quantity) ? quantity : 0,
                    revenue: {
                        amount: calculatedFee.revenue,
                        unitAmount: calculatedFee.revenue * 100
                    },
                    webhook: {
                        enabled: isWebhook,
                        isSent: false
                    },
                    customer: {
                        firstName: customer.firstName,
                        lastName: customer.lastName,
                        email: customer.email,
                        phoneNumber: customer.phoneNumber,
                        phoneCode: customer.phoneCode
                    },
                    settle: {
                        status: SettlementStatus.PENDING,
                        amount: calculatedFee.settlement,
                        settledAt: null
                    },
                    metadata: payment.metadata,
                    invoice: payment.feature === FeatureType.INVOICE && invoice ? invoice._id : null,
                    product: payment.feature === FeatureType.PRODUCT && product ? product._id : null,
                    description: `incoming payment of NGN${amount.toLocaleString()} via payment link`
                })

                /* don't add payment-link transactions to wallet */
                // wallet.transactions.push(newTxn._id);
                // await wallet.save();

                business.transactions.push(newTxn._id);
                await business.save();

                payment.transactions.push(newTxn._id);
                await payment.save();

                if (payment.feature === FeatureType.INVOICE && invoice) {
                    await InvoiceService.attachTransaction(invoice, newTxn);
                }

                if (payment.feature === FeatureType.PRODUCT && product) {
                    await ProductService.attachTransaction(product, newTxn);
                }

                result.data = newTxn;

            }

            if (provider.name === ProviderNameType.BLUSALT) {

                let calculatedFee = await ProviderService.calculateFee({
                    provider, settings,
                    amount: amount, type: 'card',
                    category: 'outflow'
                });

                const newTxn = await Transaction.create({
                    status: 'pending',
                    type: type,
                    wallet: wallet._id,
                    business: business._id,
                    provider: provider._id,
                    feature: TransactionFeatureType.PAYMENT_LINK,
                    channel: TransactionChannelType.CARD,
                    reference: reference,
                    merchantRef: payment.initializeRef ? payment.initializeRef : '',
                    payment: payment._id,
                    currency: CurrencyType.NGN,
                    amount: amount,
                    unitAmount: (amount * 100),
                    fee: calculatedFee.fee,
                    unitFee: (calculatedFee.fee * 100),
                    vatFee: calculatedFee.vat,
                    unitVatFee: calculatedFee.vat * 100,
                    productQty: isDefined(quantity) ? quantity : 0,
                    revenue: {
                        amount: calculatedFee.revenue,
                        unitAmount: calculatedFee.revenue * 100
                    },
                    webhook: {
                        enabled: isWebhook,
                        isSent: false
                    },
                    customer: {
                        firstName: customer.firstName,
                        lastName: customer.lastName,
                        email: customer.email,
                        phoneNumber: customer.phoneNumber,
                        phoneCode: customer.phoneCode
                    },
                    settle: {
                        status: SettlementStatus.PENDING,
                        amount: calculatedFee.settlement,
                        settledAt: null
                    },
                    metadata: payment.metadata,
                    invoice: payment.feature === FeatureType.INVOICE && invoice ? invoice._id : null,
                    product: payment.feature === FeatureType.PRODUCT && product ? product._id : null,
                    description: `incoming payment of NGN${amount.toLocaleString()} via payment link`
                })

                /* don't add payment-link transactions to wallet */
                // wallet.transactions.push(newTxn._id);
                // await wallet.save();

                business.transactions.push(newTxn._id);
                await business.save();

                payment.transactions.push(newTxn._id);
                await payment.save();

                if (payment.feature === FeatureType.INVOICE && invoice) {
                    await InvoiceService.attachTransaction(invoice, newTxn);
                }

                if (payment.feature === FeatureType.PRODUCT && product) {
                    await ProductService.attachTransaction(product, newTxn);
                }

                result.data = newTxn;

            }

        }

        return result.data;
    }

    /**
     * @name markAsSettled
     * @param transactions 
     * @param dest 
     */
    public async markAsSettled(transactions: Array<IGroupTransaction>, dest: string): Promise<void> {

        for (let i = 0; i < transactions.length; i++) {

            let transaction = await TransactionRepository.findByReference(transactions[i].reference);

            if (transaction) {

                transaction.settle = {
                    settledAt: dateToday(Date.now()).ISO,
                    status: SettlementStatus.COMPLETED,
                    destination: dest,
                    amount: transaction.settle.amount
                }

                await transaction.save();

            }


        }

    }

    /**
     * @name verifySocketTransaction
     * @param data 
     * @returns 
     */
    public async verifySocketTransaction(data: VerifySocketTxnDTO): Promise<ITransactionDoc | null> {

        let result: ITransactionDoc | null = null;

        const txn = await Transaction.findOne({ reference: data.reference });

        if (txn) {
            result = txn;
            //TODO: verify transaction by provider
        }

        return result;

    }

    /**
     * @name defineFilterQuery
     * @param data 
     * @returns 
     */
    public defineFilterQuery(data: FilterTransactionDTO): Array<any> {

        let result: Array<any> = [];

        if (!notDefined(data.business)) {
            result.push({ "business": data.business })
        }

        if (!notDefined(data.status)) {
            result.push({ "status": data.status })
        }

        if (!notDefined(data.feature)) {
            result.push({ "feature": data.feature })
        }

        if (!notDefined(data.reference)) {
            result.push({ "reference": data.reference })
        }

        return result;

    }

    /**
     * @name defineFilterDateRange
     * @param data 
     * @returns 
     */
    public async defineFilterDateRange(data: FilterTransactionDTO): Promise<IFilterDate> {

        let result: IFilterDate = { from: '', to: '', start: '', end: '', last: '', today: '', nextDay: '' }
        const { dayNumber, startDate, endDate, type } = data;

        const _now = new Date();
        const cvn = dateToday(_now);

        result.today = `${cvn.year}-${leadingNum(cvn.month)}-${leadingNum(cvn.date)}`;
        result.nextDay = `${cvn.year}-${leadingNum(cvn.month)}-${leadingNum(cvn.date + 1)}`;

        if (type === FilterType.DAY || type === FilterType.MONTH) {


            const lastDays = dayjs(_now).subtract(dayNumber, 'days');
            const cvt = dateToday(lastDays);
            result.last = `${cvt.year}-${leadingNum(cvt.month)}-${leadingNum(cvt.date)}`;

            if (dayNumber === 0) {

                result.from = `${cvn.year}-${leadingNum(cvn.month)}-${leadingNum(cvn.date)}`;
                result.to = `${cvn.year}-${leadingNum(cvn.month)}-${leadingNum(cvn.date + 1)}`;

                result.start = `${cvn.year}-${leadingNum(cvn.month)}-${leadingNum(cvn.date)}`;
                result.end = `${cvn.year}-${leadingNum(cvn.month)}-${leadingNum(cvn.date + 1)}`;

            } else if (dayNumber === 1) {

                result.from = `${cvt.year}-${leadingNum(cvt.month)}-${leadingNum(cvt.date)}`;
                result.to = `${cvn.year}-${leadingNum(cvn.month)}-${leadingNum(cvn.date)}`;

                result.start = `${cvt.year}-${leadingNum(cvt.month)}-${leadingNum(cvt.date)}`;
                result.end = `${cvn.year}-${leadingNum(cvn.month)}-${leadingNum(cvn.date + 1)}`;

            } else {

                result.from = `${cvt.year}-${leadingNum(cvt.month)}-${leadingNum(cvt.date + 1)}`;
                result.to = `${cvn.year}-${leadingNum(cvn.month)}-${leadingNum(cvn.date)}`;

                result.start = `${cvt.year}-${leadingNum(cvt.month)}-${leadingNum(cvt.date)}`;
                result.end = `${cvn.year}-${leadingNum(cvn.month)}-${leadingNum(cvn.date + 1)}`;

            }


        } else if (type === FilterType.CUSTOM_DATE && startDate && endDate) {

            const ts = dateToday(startDate.trim());
            const te = dateToday(endDate.trim());

            result.from = `${ts.year}-${leadingNum(ts.month)}-${leadingNum(ts.date)}`;
            result.to = `${te.year}-${leadingNum(te.month)}-${leadingNum(te.date)}`; // add 1 to extend and include date

            result.start = `${ts.year}-${leadingNum(ts.month)}-${leadingNum(ts.date)}`;
            result.end = `${te.year}-${leadingNum(te.month)}-${leadingNum(te.date)}`;

            result.last = `${ts.year}-${leadingNum(ts.month)}-${leadingNum(ts.date)}`; //last date

        }

        return result;

    }

    /**
     * @name defineFilterDateRange
     * @param data 
     * @returns 
     */
    public async defineExportDateRange(data: ExportTransactionDTO): Promise<IFilterDate> {

        let result: IFilterDate = { from: '', to: '', start: '', end: '', last: '', today: '', nextDay: '' }
        const { startDate, endDate } = data;

        const ts = dateToday(startDate.trim());
        const te = dateToday(endDate.trim());

        result.from = `${ts.year}-${leadingNum(ts.month)}-${leadingNum(ts.date)}`;
        result.to = `${te.year}-${leadingNum(te.month)}-${leadingNum(te.date)}`; // add 1 to extend and include date

        result.start = `${ts.year}-${leadingNum(ts.month)}-${leadingNum(ts.date)}`;
        result.end = `${te.year}-${leadingNum(te.month)}-${leadingNum(te.date)}`;

        result.last = `${ts.year}-${leadingNum(ts.month)}-${leadingNum(ts.date)}`; //last date

        return result;

    }

    /**
     * @name defineExportQuery
     * @param data 
     * @returns 
     */
    public defineExportQuery(data: ExportTransactionDTO): Array<any> {

        let result: Array<any> = [];

        if (!notDefined(data.status)) {
            result.push({ "status": data.status })
        }

        if (!notDefined(data.feature)) {
            result.push({ "feature": data.feature })
        }

        return result;

    }

    /**
     * @name generateRef
     * @description Generate vacepay transaction reference
     * @returns 
     */
    public generateRef(): string {

        let txnref: string = '';

        const split = UIID(2).split('-');
        const joined = split.join('');
        txnref = `${PrefixType.TRANSACTION}${joined.toUpperCase()}`;

        return txnref;

    }

    /**
     * @name transactionExists
     * @param data 
     * @returns 
     */
    public async transactionExists(data: TransactionExistsDTO): Promise<boolean> {

        let exists: boolean = false;
        const { type, identifier, reference } = data;

        if (type === 'reference' && reference) {

            const transaction = await TransactionRepository.findByReference(reference, false)

            if (transaction) {
                exists = true;
            }

        }

        if (type === 'identifier' && identifier) {

            const transaction = await TransactionRepository.findById(identifier, false)

            if (transaction) {
                exists = true;
            }

        }

        return exists;

    }

    /**
     * @name getOverview
     * @param user 
     * @returns 
     */
    public async getOverview(user: IUserDoc): Promise<IOverview> {

        let result: IOverview | any = {}

        if (user.userType === UserType.ADMIN || user.userType === UserType.SUPER) {

            result.total = await Transaction.countDocuments();
            result.completed = await Transaction.countDocuments({ status: TransactionStatus.COMPLETED })
            result.successful = await Transaction.countDocuments({ status: TransactionStatus.SUCCESSFUL })
            result.failed = await Transaction.countDocuments({ status: TransactionStatus.FAILED })
            result.pending = await Transaction.countDocuments({ status: TransactionStatus.PENDING })
            result.processing = await Transaction.countDocuments({ status: TransactionStatus.PROCESSING })
            result.refunded = await Transaction.countDocuments({ status: TransactionStatus.REFUNDED })
            result.paid = await Transaction.countDocuments({ status: TransactionStatus.PAID })
            result.cancelled = await Transaction.countDocuments({ status: TransactionStatus.CANCELLED })

            const _aggTotal = await TransactionRepository.aggregateTotal({ user });
            const _successTotal = await TransactionRepository.aggregateTotalByStatus({ user, status: TransactionStatus.SUCCESSFUL });
            const _failedTotal = await TransactionRepository.aggregateTotalByStatus({ user, status: TransactionStatus.FAILED });
            const _refundedTotal = await TransactionRepository.aggregateTotalByStatus({ user, status: TransactionStatus.REFUNDED });

            result.totalAmount = _successTotal.amount;
            result.value = _successTotal.amount

            result.analytics = {
                total: _aggTotal,
                successful: _successTotal,
                failed: _failedTotal,
                refunded: _refundedTotal
            }

        } else if (user.userType === UserType.BUSINESS) {

            result.total = await Transaction.countDocuments({ business: user._id });
            result.completed = await Transaction.countDocuments({ business: user._id, status: TransactionStatus.COMPLETED })
            result.successful = await Transaction.countDocuments({ business: user._id, status: TransactionStatus.SUCCESSFUL })
            result.failed = await Transaction.countDocuments({ business: user._id, status: TransactionStatus.FAILED })
            result.pending = await Transaction.countDocuments({ business: user._id, status: TransactionStatus.PENDING })
            result.processing = await Transaction.countDocuments({ business: user._id, status: TransactionStatus.PROCESSING })
            result.refunded = await Transaction.countDocuments({ business: user._id, status: TransactionStatus.REFUNDED })
            result.paid = await Transaction.countDocuments({ business: user._id, status: TransactionStatus.PAID })
            result.cancelled = await Transaction.countDocuments({ business: user._id, status: TransactionStatus.CANCELLED })

            const _aggTotal = await TransactionRepository.aggregateTotal({ user });
            const _successTotal = await TransactionRepository.aggregateTotalByStatus({ user, status: TransactionStatus.SUCCESSFUL });
            const _failedTotal = await TransactionRepository.aggregateTotalByStatus({ user, status: TransactionStatus.FAILED });
            const _refundedTotal = await TransactionRepository.aggregateTotalByStatus({ user, status: TransactionStatus.REFUNDED });

            result.totalAmount = _successTotal.amount;
            result.value = _successTotal.amount

            result.analytics = {
                total: _aggTotal,
                successful: _successTotal,
                failed: _failedTotal,
                refunded: _refundedTotal
            }

        }

        return result;

    }

    /**
     * @name exportAndSendEmail
     * @param data 
     */
    public async exportAndSendEmail(data: ExportAndSendEmailDTO): Promise<void> {

        let { business, payload, params, email } = data;

        const exported = await ExportService.exportToCSV({
            content: payload.data,
            deleteFile: false,
            upload: {
                cloud: 'gcs',
                enabled: false
            }
        });

        if (exported.filepath) {

            const csvContent = await ExportService.arrayToCSV(exported.data);
            const csvBase64 = await stringToBase64({ payload: csvContent, type: 'buffer' })

            // send email
            await EmailService.sendTransactionExportEmail({
                email: email,
                business: business,
                driver: 'zepto',
                template: 'export_transaction',
                options: {
                    subject: 'Transactions Export Successful',
                    salute: `${business.name}`,
                    count: payload.data.length,
                    startDate: params.from,
                    endDate: params.to,
                },
                attachments: [
                    {
                        filename: exported.filename,
                        content: csvBase64
                    }
                ]
            });


            // delete file 
            await fsExtra.removeSync(exported.filepath);

        }

    }

}

export default new TransactionService();