import { UIID, arrayIncludes, dateToday, hasDecimal, isDefined, isNeg, isPrecise, isZero, notDefined, toDecimal } from '@btffamily/vacepay';
import { ProcessBaniWebhookDTO } from '../dtos/providers/bani.dto';
import { CalculateFeeDTO, CalculateVATFeeDTO, FundBankAccountDTO, ProcessWebhookDTO, ResolveAccountDTO, UpdateTransactionFeeDTO } from '../dtos/provider.dto';
import Account from '../models/Account.model';
import Provider from '../models/Provider.model';
import Transaction from '../models/Transaction.model';
import { BusinessType, FeatureType, PaymentLinkType, PrefixType, ProviderNameType, ProviderPaymentStatus, TransactionFeatureType, TransactionStatus, ValueType } from '../utils/enums.util';
import { ConfigProviderType, IAccountDoc, IBusinessCharge, IBusinessDoc, ICardDoc, IFeeCharged, IInvoiceDoc, IPaymentLinkDoc, IProductDoc, IProviderDoc, IResult, ISettingDoc, ITransactionDoc, IUserDoc, IVaceFee, IWalletDoc, ProviderType, TransactionType } from '../utils/types.util'
import AccountService from './account.service';
import EmailService from './email.service';
import BaniService from './providers/bani.service';
import PaystackService from './providers/paystack.service';
import SettlementService from './settlement.service';
import SystemService from './system.service';
import WalletService from './wallet.service';
import NinepsbService from './providers/ninepsb.service';
import { ProcessPaystackWebhookDTO } from '../dtos/providers/paystack.dto';
import { ProcessPSBWebhookDTO } from '../dtos/providers/ninepsb.dto';
import BusinessService from './business.service';
import ProductService from './product.service';
import InvoiceService from './invoice.service';
import TransactionService from './transaction.service';
import BankService from './bank.service';
import PaymentLinkService from './payment.link.service';
import Setting from '../models/Setting.model';
import TransactionRepository from '../repositories/transaction.repository';
import AccountRepository from '../repositories/account.repository';
import { sendWebhookNotificationJob } from '../queues/jobs/webhook.job';
import FeeMapper from '../mappers/fee.mapper';
import { updateVacepayRevenueJob } from '../queues/jobs/revenue.job';

class ProviderService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name validateFundAccount
     * @param data 
     * @returns 
     */
    public async validateFundAccount(data: FundBankAccountDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null };

        const { amount } = data;

        if (notDefined(amount) || isZero(amount)) {
            result.error = true;
            result.message = 'amount is required';
        } else {
            result.error = false;
            result.message = "";
        }

        return result;

    }

    /**
     * @name validateUpdateFee
     * @param data 
     * @returns 
     */
    public async validateUpdateFee(data: UpdateTransactionFeeDTO): Promise<IResult> {

        const allowed = ['percentage', 'flat']
        const categories = ['inflow', 'outflow']

        let result: IResult = { error: false, message: '', code: 200, data: null };

        const { capped, category, markup, name, type, value, providerFee, providerMarkup } = data;

        if (!name) {
            result.error = true;
            result.message = 'provider name is required';
            result.code = 400;
        } else if (!category) {
            result.error = true;
            result.message = 'fee category is required';
            result.code = 400;
        } else if (!arrayIncludes(categories, category.toString())) {
            result.error = true;
            result.message = `invalid category value. choose from ${categories.join(', ')}`;
            result.code = 400;
        } else if (!type) {
            result.error = true;
            result.message = 'fee type is required';
            result.code = 400;
        } else if (!arrayIncludes(allowed, type.toString())) {
            result.error = true;
            result.message = `invalid offer type. choose from ${allowed.join(', ')}`;
            result.code = 400;
        } else if (isNeg(providerFee)) {
            result.error = true;
            result.message = `provider fee is required and cannot be zero or negative for a ${type} type`;
            result.code = 400;
        } else if (isDefined(providerMarkup) && isNeg(providerMarkup)) {
            result.error = true;
            result.message = `provider markup is required and cannot be zero or negative for a ${type} type`;
            result.code = 400;
        } else if (isNeg(value)) {
            result.error = true;
            result.message = `fee is required and cannot be zero or negative for a ${type} type`;
            result.code = 400;
        } else if (type === ValueType.PERCENTAGE && Math.round(value) > 100) {
            result.error = true;
            result.message = `percentage fee type cannot be greater than 100`;
            result.code = 400;
        } else if (isDefined(markup) && (isNeg(markup))) {
            result.error = true;
            result.message = `invalid markup value for a ${type} type`;
            result.code = 400;
        } else if (markup && Math.round(markup) > 100) {
            result.error = true;
            result.message = 'markup value cannot be greater than 100';
            result.code = 400;
        } else if (capped && (isNeg(capped))) {
            result.error = true;
            result.message = `invalid capped value for a ${type} type`;
            result.code = 400;
        } else {
            result.error = false;
            result.message = "";
        }

        return result;

    }

    /**
     * @name mainProviderName
     * @returns 
     */
    public mainProviderName(): ProviderType {
        const providerName = (process.env.MAIN_BANK_PROVIDER || 'bani') as ProviderType;
        return providerName;
    }

    /**
     * @name configProviderName
     * @returns 
     */
    public async configProviderName(type: ConfigProviderType): Promise<ProviderType> {

        let result: any = '';

        if (type === 'bank') {

            result = ProviderNameType.BANI
            const provider = await Provider.findOne({ bankProvider: true });

            if (provider && provider.offers.banking === true) {
                result = provider.name as ProviderType;
            }

        }

        if (type === 'card' || type === 'allcard') {

            result = ProviderNameType.PAYSTACK;
            const provider = await Provider.findOne({
                cardProvider: true,
                verveProvider: true,
                masterProvider: true,
                visaProvider: true
            });

            if (provider && provider.offers.card === true) {
                result = provider.name as ProviderType;
            }

        }

        if (type === 'bills') {

            result = ProviderNameType.BANI
            const provider = await Provider.findOne({ billsProvider: true });

            if (provider && provider.offers.bills === true) {
                result = provider.name as ProviderType;
            }

        }

        if (type === 'directpay') {

            result = ProviderNameType.MONO
            const provider = await Provider.findOne({ debitProvider: true });

            if (provider && provider.offers.directDebit === true) {
                result = provider.name as ProviderType;
            }

        }

        if (type === 'verve') {

            result = ProviderNameType.INTERSWITCH
            const provider = await Provider.findOne({ verveProvider: true });

            if (provider && provider.offers.card === true) {
                result = provider.name as ProviderType;
            }

        }

        if (type === 'master') {

            result = ProviderNameType.UNIFIED
            const provider = await Provider.findOne({ masterProvder: true });

            if (provider && provider.offers.card === true) {
                result = provider.name as ProviderType;
            }

        }

        if (type === 'visa') {

            result = ProviderNameType.UNIFIED
            const provider = await Provider.findOne({ visaProvider: true });

            if (provider && provider.offers.card === true) {
                result = provider.name as ProviderType;
            }

        }

        return result;

    }

    /**
     * @name getProcessor
     * @param type 
     * @returns 
     */
    public async getProvider(type: ConfigProviderType): Promise<IProviderDoc | null> {

        let result: IProviderDoc | null = null;

        if (type === 'bank') {

            const provider = await Provider.findOne({ bankProvider: true });

            if (provider && provider.offers.banking === true) {
                result = provider;
            }

        }

        if (type === 'card' || type === 'allcard') {

            const provider = await Provider.findOne({
                cardProvider: true,
                verveProvider: true,
                masterProvider: true,
                visaProvider: true
            });

            if (provider && provider.offers.card === true) {
                result = provider;
            }

        }

        if (type === 'bills') {

            const provider = await Provider.findOne({ billsProvider: true });

            if (provider && provider.offers.bills === true) {
                result = provider;
            }

        }

        if (type === 'directpay') {

            const provider = await Provider.findOne({ debitProvider: true });

            if (provider && provider.offers.directDebit === true) {
                result = provider;
            }

        }

        if (type === 'verve') {

            const provider = await Provider.findOne({ verveProvider: true });

            if (provider && provider.offers.card === true) {
                result = provider;
            }

        }

        if (type === 'master') {

            const provider = await Provider.findOne({ masterProvder: true });

            if (provider && provider.offers.card === true) {
                result = provider
            }

        }

        if (type === 'visa') {

            const provider = await Provider.findOne({ visaProvider: true });

            if (provider && provider.offers.card === true) {
                result = provider
            }

        }

        return result;

    }

    /**
     * @name getProviderFromList
     * @param type 
     * @returns 
     */
    public async getProviderFromList(type: ConfigProviderType, providers?: Array<IProviderDoc>): Promise<IProviderDoc | null> {

        let result: IProviderDoc | null = null;
        let providerList: Array<IProviderDoc> = [];

        if (!providers || providers.length === 0) {
            providerList = await Provider.find({})
        } else {
            providerList = providers;
        }

        if (providerList.length > 0) {

            if (type === 'bank') {

                const provider = providerList.find((x) => x.bankProvider === true)

                if (provider && provider.offers.banking === true) {
                    result = provider;
                }

            }

            if (type === 'card' || type === 'allcard') {

                const provider = providerList.find((x) => {

                    if (x.cardProvider && x.verveProvider && x.masterProvider && x.visaProvider) {
                        return x;
                    }

                });

                if (provider && provider.offers.card === true) {
                    result = provider;
                }

            }

            if (type === 'bills') {

                const provider = providerList.find((x) => x.billsProvider === true)

                if (provider && provider.offers.bills === true) {
                    result = provider;
                }

            }

            if (type === 'directpay') {

                const provider = providerList.find((x) => x.debitProvider === true)

                if (provider && provider.offers.directDebit === true) {
                    result = provider;
                }

            }

            if (type === 'verve') {

                const provider = providerList.find((x) => x.verveProvider === true)

                if (provider && provider.offers.card === true) {
                    result = provider;
                }

            }

            if (type === 'master') {

                const provider = providerList.find((x) => x.masterProvider === true)

                if (provider && provider.offers.card === true) {
                    result = provider
                }

            }

            if (type === 'visa') {

                const provider = providerList.find((x) => x.visaProvider === true)

                if (provider && provider.offers.card === true) {
                    result = provider
                }

            }

        }


        return result;

    }

    /**
     * @name accountExists
     * @param provider 
     * @param business 
     * @returns 
     */
    public async accountExists(provider: IProviderDoc, business: IBusinessDoc): Promise<boolean> {

        let result: boolean = false;

        const account = await Account.findOne({ provider: provider._id, business: business._id });

        if (account && account.customer.reference && account.accountNo && account.accountName) {
            result = true;
        }

        return result;

    }

    /**
     * @name resolveAccount
     * @param data 
     * @returns 
     */
    public async resolveAccount(data: ResolveAccountDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null };

        const { provider, type, code, accountNo, listCode, countryCode } = data;

        if (provider === ProviderNameType.PAYSTACK) {

            if (type === 'nuban') {

                result = await PaystackService.verifyNuban({
                    bankCode: code,
                    accountNo: accountNo
                });

            }

        }

        if (provider === ProviderNameType.BANI) {

            if (type === 'nuban') {

                result = await BaniService.verifyNubanAccount({
                    bankCode: code,
                    accountNo: accountNo,
                    listCode: listCode!,
                    countryCode: countryCode!
                });

            }

        }

        if (provider === ProviderNameType.NINEPSB) {

            if (type === 'nuban') {

                result = await NinepsbService.verifyNuban({
                    bankCode: code,
                    accountNo
                });

            }

        }


        return result;

    }

    /**
     * @name decodeNotificationTitle
     * @param feature 
     * @returns 
     */
    public decodeNotificationTitle(feature: string): string {

        let result: string = '';

        if (feature === 'wallet-withdraw') {
            result = 'Withdrawal Successful'
        } else if (feature === 'wallet-transfer') {
            result = 'Transfer Successful'
        } else if (feature === TransactionFeatureType.WALLET_CHARGEBACK) {
            result = 'Chargeback Successful'
        } else if (feature === TransactionFeatureType.WALLET_REFUND) {
            result = 'Refund Successful'
        } else if (feature === 'wallet-data') {
            result = 'Buy Data Successful'
        } else if (feature === 'wallet-airtime') {
            result = 'Buy Airtime Successful'
        } else if (feature === 'wallet-bill') {
            result = 'Pay Bill Successful'
        } else {
            result = 'Transaction Successful'
        }

        return result;

    }

    /**
     * @name deductFee
     * @param provider 
     * @param amount 
     * @returns 
     */
    public async calculateFee(data: CalculateFeeDTO): Promise<IFeeCharged> {

        let result: IFeeCharged = { fee: 0, providerFee: 0, revenue: 0, vat: 0, settlement: 0, stampFee: 0 };
        let providerAmount: number = 0, revenue: number = 0;

        const { amount, provider, type, category, settings, admin } = data;

        // get business fees by mapping
        let charges = await FeeMapper.mapBusinessFees({ provider, settings, type, category });

        if (charges.chargeFee) {

            let platformFee = admin && admin === true ? 0 : charges.value;
            let platformMarkup = admin && admin === true ? 0 : charges.markup;

            if (charges.type === ValueType.PERCENTAGE) {

                // calculate percentage
                providerAmount = (charges.providerFee / 100) * amount;
                revenue = (platformFee / 100) * amount;

                // add provider and platform markups 
                providerAmount = providerAmount + charges.providerMarkup;
                revenue = revenue + platformMarkup;

            } else if (charges.type === ValueType.FLAT) {

                // add provider and platform markups 
                providerAmount = charges.providerFee + charges.providerMarkup
                revenue = platformFee + platformMarkup;

            }

            // check calculated fee against provider capped value
            if (charges.providerCap && providerAmount > charges.providerCap) {
                providerAmount = charges.providerCap;
            }

            // check calculated fee against platfrom capped value
            if (charges.capped && revenue > charges.capped) {
                revenue = charges.capped;
            }

            // set total transaction fee
            const transactionFee = providerAmount + revenue;

            /** 
             * Set the stamp duty fee
             * if amount is 10000 and above
             */
            if (type === 'transfer' && category === 'inflow') {

                if (amount >= 10000) {
                    result.stampFee = charges.stampDuty;

                } else {
                    result.stampFee = 0;
                }

            } else {
                result.stampFee = 0;
            }

            /**
             * caclculate and add VAT fee.
             * VAT fee is against the total transaction fee
             */
            const vatFee = await this.calculateVATFee({ amount: transactionFee, charge: charges });

            /**
             * calculate amount to be settled
             * apply this only to payment-link (collection) transactions 
             */
            const deductedFee = transactionFee + vatFee + result.stampFee;
            const settleAmount = amount - deductedFee;


            // set total fee to be charged
            result.providerFee = toDecimal(providerAmount, 2);
            result.fee = toDecimal(transactionFee, 2);
            result.vat = toDecimal(vatFee, 2);
            result.revenue = toDecimal(revenue, 2);
            result.settlement = toDecimal(settleAmount, 2);

        }

        return result;

    }

    /**
     * @name calculateVATFee
     * @param data 
     * @returns 
     */
    public async calculateVATFee(data: CalculateVATFeeDTO): Promise<number> {

        let result: number = 0;
        const { amount, charge } = data;
        const { vatType, vatValue } = charge;

        if (vatValue > 0 && amount > 0) {

            if (vatType === ValueType.PERCENTAGE) {
                const divi = (vatValue / 100);
                result = divi * amount;
            }

            if (vatType === ValueType.FLAT) {
                result = vatValue;
            }

        }

        return result;

    }

    /**
     * @name processWebhook
     * @param data 
     */
    public async processWebhook(data: ProcessWebhookDTO): Promise<void> {

        const { providerName, payload, encryption } = data;

        // BANI
        if (providerName === 'bani') {
            await this.processBaniWebhook({ payload })
        }

        // NINEPSB
        if (providerName === 'ninepsb') {
            await this.processPSBWebhook({ payload });
        }

        // PAYSTACK
        if (providerName === 'paystack' && encryption) {

            if (encryption.hash && encryption.signature) {
                await this.processPaystackWebhook({ payload: payload, hash: encryption.hash, signature: encryption.signature })
            }

        }

    }

    /**
     * @name processBaniWebhook
     * @param data 
     */
    private async processBaniWebhook(data: ProcessBaniWebhookDTO): Promise<void> {

        const { payload } = data;
        const event = payload.event;
        const payloadData = payload.data;

        if (event === 'payin_bank_transfer') {

            const existTxn = await TransactionRepository.findByReferenceAndFeature({ reference: payloadData.pay_ext_ref, feature: TransactionFeatureType.PAYMENT_LINK }, true);

            if (existTxn) {

                const business: IBusinessDoc = existTxn.business;
                const settings: ISettingDoc = business.settings;
                const user: IUserDoc = business.user;
                const wallet: IWalletDoc = business.wallet;
                const account = BusinessService.getAccontByProvider(business.accounts, existTxn.provider.name)
                const provider: IProviderDoc = existTxn.provider;

                const paymentLink: IPaymentLinkDoc = existTxn.payment;
                const invoice: IInvoiceDoc = paymentLink.invoice;
                const product: IProductDoc = paymentLink.product;

                existTxn.currency = payloadData.merch_currency ? payloadData.merch_currency : payloadData.holder_currency;
                existTxn.providerRef = payloadData.pay_ref;
                existTxn.customer.ref = payloadData.customer_ref;
                existTxn.webhook.event = event;
                existTxn.providerData = payloadData;
                existTxn.channel = payloadData.pay_method
                await existTxn.save();

                if (payloadData.pay_status === ProviderPaymentStatus.ONGOING) {

                    const collected = parseFloat(payloadData.pay_amount_collected.toString());
                    const outstanding = parseFloat(payloadData.pay_amount_outstanding.toString());

                    const calculatedFee = await this.calculateFee({
                        amount: collected,
                        provider: provider,
                        settings: settings,
                        type: 'transfer',
                        category: 'inflow'
                    })

                    // capture stamp duty if available
                    if (calculatedFee.stampFee > 0) {
                        existTxn.stampFee = calculatedFee.stampFee;
                        existTxn.unitStampFee = existTxn.stampFee * 100;
                    }

                    existTxn.amount = collected;
                    existTxn.unitAmount = collected * 100;
                    existTxn.fee = calculatedFee.fee;
                    existTxn.unitFee = calculatedFee.fee * 100;
                    existTxn.vatFee = calculatedFee.vat;
                    existTxn.unitVatFee = calculatedFee.vat * 100;
                    existTxn.settle.amount = calculatedFee.settlement;
                    existTxn.revenue = {
                        amount: calculatedFee.revenue,
                        unitAmount: calculatedFee.revenue * 100,
                        reversed: 0,
                        unitReversed: 0
                    }
                    existTxn.status = TransactionStatus.SUCCESSFUL;
                    existTxn.description = `Part payment - of NGN${existTxn.amount.toLocaleString()} to ${existTxn.bank.accountNo} via payment link`;

                    // process partial amount
                    if (paymentLink.feature === FeatureType.INVOICE && invoice) {

                        existTxn.partialAmount.collected = collected
                        existTxn.partialAmount.unitCollected = collected * 100;

                        const newAmount = invoice.summary.amountPaid + collected;

                        if (newAmount >= invoice.summary.totalAmount) {
                            existTxn.partialAmount.outstanding = 0
                            existTxn.partialAmount.unitOutstanding = 0 * 100;

                            invoice.status = TransactionStatus.PAID;
                        } else {

                            existTxn.partialAmount.outstanding = outstanding
                            existTxn.partialAmount.unitOutstanding = outstanding * 100;

                            invoice.status = TransactionStatus.PENDING;
                        }

                        invoice.summary.amountPaid = newAmount;
                        invoice.summary.paidAt = dateToday(Date.now()).ISO;
                        await invoice.save(); // save invoice

                        await InvoiceService.updateInflow(invoice, existTxn);


                    } else {

                        existTxn.partialAmount = {
                            collected: collected,
                            outstanding: outstanding,
                            unitCollected: collected * 100,
                            unitOutstanding: outstanding * 100
                        }

                    }

                    // save transaction
                    await existTxn.save();

                    paymentLink.totalAmount = paymentLink.totalAmount + existTxn.amount;
                    await paymentLink.save();

                    // update settlement inflow
                    const userWallet = await WalletService.updateSettlementInflow(wallet, existTxn);

                    // update product
                    if (paymentLink.feature === FeatureType.PRODUCT && product) {
                        await ProductService.updateInflow(product, existTxn)
                        await ProductService.updateAnalytics(product);
                    }

                    // update payment-link
                    await PaymentLinkService.updateInflow(paymentLink, existTxn);
                    await PaymentLinkService.updateAnalytics(paymentLink);

                    // create or update settlement 
                    await SettlementService.reportSettlement({ transaction: existTxn, business });

                    // run queue job that processes updating Vacepay revenue
                    updateVacepayRevenueJob(existTxn);

                    // send email
                    await WalletService.sendCreditTransferEmail({
                        account,
                        business,
                        transaction: existTxn,
                        invoice,
                        paymentLink,
                        product,
                        user,
                        wallet: userWallet
                    })

                    // send webhook notification
                    if (business.businessType === BusinessType.CORPORATE) {

                        sendWebhookNotificationJob({
                            business: business,
                            transaction: existTxn,
                            type: 'success'
                        });

                    }

                }

                if (payloadData.pay_status === ProviderPaymentStatus.PAID) {

                    let newAmount: number = 0;
                    const actual = payload.data.actual_amount_paid;
                    const merch = parseFloat(payload.data.merch_amount.toString())

                    if (actual > existTxn.amount) {

                        newAmount = actual; // make the new amount what was paid

                        const collected = parseFloat(payload.data.pay_amount_collected.toString());
                        const outstanding = parseFloat(payload.data.pay_amount_outstanding.toString())

                        existTxn.partialAmount = {
                            collected: collected,
                            outstanding: Math.abs(outstanding),
                            unitCollected: collected * 100,
                            unitOutstanding: Math.abs(outstanding) * 100
                        }

                    } else if (actual === existTxn.amount) {
                        newAmount = existTxn.amount;
                    }

                    // calculate for revenue
                    const calculatedFee = await this.calculateFee({
                        amount: newAmount,
                        provider: provider,
                        settings: settings,
                        type: 'transfer',
                        category: 'inflow'
                    })

                    // capture stamp duty if available
                    if (calculatedFee.stampFee > 0) {
                        existTxn.stampFee = calculatedFee.stampFee;
                        existTxn.unitStampFee = existTxn.stampFee * 100;
                    }

                    // update transaction
                    existTxn.status = TransactionStatus.SUCCESSFUL;
                    existTxn.amount = newAmount;
                    existTxn.unitAmount = newAmount * 100;
                    existTxn.fee = calculatedFee.fee;
                    existTxn.unitFee = calculatedFee.fee * 100;
                    existTxn.vatFee = calculatedFee.vat;
                    existTxn.unitVatFee = calculatedFee.vat * 100;
                    existTxn.settle.amount = calculatedFee.settlement;
                    existTxn.revenue = {
                        amount: calculatedFee.revenue,
                        unitAmount: calculatedFee.revenue * 100,
                        reversed: 0,
                        unitReversed: 0
                    }

                    existTxn.description = `payment of NGN${existTxn.amount.toLocaleString()} to ${existTxn.bank.accountNo} via payment link`;
                    await existTxn.save();

                    // update settlement inflow
                    const userWallet = await WalletService.updateSettlementInflow(wallet, existTxn);

                    // update invoice
                    if (paymentLink.feature === FeatureType.INVOICE && invoice) {

                        invoice.status = TransactionStatus.PAID;
                        await invoice.save();
                        await InvoiceService.updateInflow(invoice, existTxn);
                    }

                    // update product
                    if (paymentLink.feature === FeatureType.PRODUCT && product) {
                        await ProductService.updateInflow(product, existTxn)
                        await ProductService.updateAnalytics(product);
                    }

                    // update payment-link
                    await PaymentLinkService.updateInflow(paymentLink, existTxn);
                    await PaymentLinkService.updateAnalytics(paymentLink);

                    // disable payment link if it is initialized and not reuseable
                    if (paymentLink.initialized && paymentLink.reuseable === false) {
                        paymentLink.isEnabled = false;
                        await paymentLink.save();
                    }

                    // create or update settlement 
                    await SettlementService.reportSettlement({ transaction: existTxn, business });

                    // run queue job that processes updating Vacepay revenue
                    updateVacepayRevenueJob(existTxn);

                    // send email
                    await WalletService.sendCreditTransferEmail({
                        account,
                        business,
                        transaction: existTxn,
                        invoice,
                        paymentLink,
                        product,
                        user,
                        wallet: userWallet
                    })

                    // send webhook notification
                    if (business.businessType === BusinessType.CORPORATE) {

                        sendWebhookNotificationJob({
                            business: business,
                            transaction: existTxn,
                            type: 'success'
                        });

                    }

                }

            }

            else {

                // find the account using the customer reference & provider reference
                const account = await AccountRepository.findByProviderReference(payloadData.customer_ref, payloadData.pay_ref, true);

                if (account) {

                    const business: IBusinessDoc = account.business;
                    const settings: ISettingDoc = business.settings;
                    const user: IUserDoc = account.business.user;
                    const wallet: IWalletDoc = account.wallet;
                    const provider: IProviderDoc = account.provider;

                    const transaction = await TransactionService.createPayinTransaction({
                        business,
                        wallet,
                        provider,
                        type: 'credit',
                        event,
                        isWebhook: true,
                        payload
                    });

                    // update wallet and account balances
                    if (transaction.status === TransactionStatus.SUCCESSFUL || transaction.status === TransactionStatus.COMPLETED) {

                        const userWallet = await WalletService.updateBankInflow(wallet, transaction, true);
                        await AccountService.updateBankInflow(account, transaction);

                        // send email
                        await WalletService.sendCreditTransferEmail({
                            account,
                            business,
                            transaction,
                            user,
                            wallet: userWallet
                        });

                        if (business.businessType === BusinessType.CORPORATE) {

                            sendWebhookNotificationJob({
                                business: business,
                                transaction: transaction,
                                type: 'success'
                            });

                        }

                    }

                    if (transaction.status === TransactionStatus.PENDING || transaction.status === TransactionStatus.PROCESSING) { }

                    if (transaction.status === TransactionStatus.FAILED) { }

                }


            }

        }

        if (event === 'payout') {

            let ref = payloadData.payout_details.payout_ext_ref;
            let stat = TransactionStatus.PENDING;

            const transaction = await TransactionRepository.findByReferenceAndStatus(ref, stat, true);

            if (transaction && payload.data.is_done === true) {

                const business: IBusinessDoc = transaction.business;
                const wallet: IWalletDoc = transaction.wallet;
                const user: IUserDoc = business.user;
                const provider: IProviderDoc = transaction.provider;
                const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, provider.name);

                const _upTransaction = await TransactionService.updatePayoutTransaction({
                    event: event,
                    payload: payload,
                    business: business,
                    isWebhook: true,
                    transaction: transaction,
                    provider: provider,
                    wallet
                });

                // update wallet and account balances
                if (_upTransaction.status === TransactionStatus.SUCCESSFUL || _upTransaction.status === TransactionStatus.COMPLETED || _upTransaction.status === TransactionStatus.REFUNDED) {

                    // run queue job that processes updating Vacepay revenue
                    updateVacepayRevenueJob(_upTransaction);

                    if (business.businessType === BusinessType.CORPORATE) {

                        sendWebhookNotificationJob({
                            business: business,
                            transaction: _upTransaction,
                            type: 'success'
                        });

                    }

                }

                if (_upTransaction.status === TransactionStatus.PENDING || _upTransaction.status === TransactionStatus.PROCESSING) { }

                if (_upTransaction.status === TransactionStatus.FAILED) {

                    await WalletService.reverseMoneyToWallet({
                        account,
                        business,
                        isWebhook: true,
                        provider,
                        transaction,
                        wallet,
                        addFee: true
                    });

                    if (business.businessType === BusinessType.CORPORATE) {

                        sendWebhookNotificationJob({
                            business: business,
                            transaction: _upTransaction,
                            type: 'failed'
                        });

                    }

                }

            }

        }

        if (event === 'payout_reversal') {

            let ref = payloadData.payout_details.payout_ext_ref;
            let stat = TransactionStatus.PENDING;

            const transaction = await TransactionRepository.findByReferenceAndStatus(ref, stat, true);

            if (transaction) {

                const business: IBusinessDoc = transaction.business;
                const wallet: IWalletDoc = transaction.wallet;
                const user: IUserDoc = business.user;
                const provider: IProviderDoc = transaction.provider;
                const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, provider.name);

                // update original transaction
                const _upTransaction = await TransactionService.updatePayoutTransaction({
                    event: event,
                    payload: payload,
                    business: business,
                    isWebhook: true,
                    transaction: transaction,
                    provider: provider
                });

                // reverse money to wallet
                const newTransaction = await WalletService.reverseMoneyToWallet({
                    account,
                    business,
                    isWebhook: true,
                    provider,
                    transaction: _upTransaction,
                    wallet,
                    addFee: true
                });

                if (business.businessType === BusinessType.CORPORATE) {

                    sendWebhookNotificationJob({
                        business: business,
                        transaction: newTransaction,
                        type: 'failed'
                    });

                }

            }

        }

        if (event === 'vas_completed') {

            let ref = payloadData.transaction_ext_ref;
            let stat = TransactionStatus.PENDING;

            const transaction = await TransactionRepository.findByReferenceAndStatus(ref, stat, true);

            if (transaction && payloadData.transaction_status === TransactionStatus.COMPLETED) {

                const business: IBusinessDoc = transaction.business;
                const wallet: IWalletDoc = transaction.wallet;
                const user: IUserDoc = business.user;
                const provider: IProviderDoc = transaction.provider;
                const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, provider.name)

                const _upTransaction = await TransactionService.updateVASTransaction({
                    event: event,
                    payload: payload,
                    business: business,
                    isWebhook: true,
                    transaction: transaction,
                    provider: provider
                });

                // update wallet and account balances
                if (_upTransaction.status === TransactionStatus.SUCCESSFUL || _upTransaction.status === TransactionStatus.COMPLETED) {

                    // run queue job that processes updating Vacepay revenue
                    updateVacepayRevenueJob(_upTransaction);

                    if (business.businessType === BusinessType.CORPORATE) {

                        sendWebhookNotificationJob({
                            business: business,
                            transaction: _upTransaction,
                            type: 'success'
                        });

                    }

                }

                if (_upTransaction.status === TransactionStatus.PENDING || _upTransaction.status === TransactionStatus.PROCESSING) { }

                if (_upTransaction.status === TransactionStatus.FAILED) {

                    await WalletService.reverseMoneyToWallet({
                        account,
                        business,
                        isWebhook: true,
                        provider,
                        transaction,
                        wallet,
                        addFee: true
                    });

                    if (business.businessType === BusinessType.CORPORATE) {

                        sendWebhookNotificationJob({
                            business: business,
                            transaction: _upTransaction,
                            type: 'failed'
                        });

                    }

                }

            }


        }

        if (event === 'vas_failed') {

            let ref = payloadData.transaction_ext_ref;
            let stat = TransactionStatus.PENDING;

            const transaction = await TransactionRepository.findByReferenceAndStatus(ref, stat, true);

            if (transaction) {

                const business: IBusinessDoc = transaction.business;
                const wallet: IWalletDoc = transaction.wallet;
                const user: IUserDoc = business.user;
                const provider: IProviderDoc = transaction.provider;
                const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, provider.name);

                const _upTransaction = await TransactionService.updateVASTransaction({
                    event: event,
                    payload: payload,
                    business: business,
                    isWebhook: true,
                    transaction: transaction,
                    provider: provider
                });

                // reverse money to wallet
                const newTransaction = await WalletService.reverseMoneyToWallet({
                    account,
                    business,
                    isWebhook: true,
                    provider,
                    transaction: _upTransaction,
                    wallet,
                    addFee: true
                });

                if (business.businessType === BusinessType.CORPORATE) {

                    sendWebhookNotificationJob({
                        business: business,
                        transaction: newTransaction,
                        type: 'failed'
                    });

                }

            }


        }

    }

    /**
     * @name processPaystackWebhook
     * @param data 
     */
    private async processPaystackWebhook(data: ProcessPaystackWebhookDTO): Promise<void> {

        const { payload, hash, signature } = data;

        if (hash === signature) {

            let webhook = payload.data;
            let event = payload.event;

            const transaction = await TransactionRepository.findByReferenceAndSelectCard(webhook.reference, true);

            if (event === 'charge.success' && webhook.status === ProviderPaymentStatus.SUCCESS && transaction) {

                const business: IBusinessDoc = transaction.business;
                const settings: ISettingDoc = business.settings;
                const wallet: IWalletDoc = business.wallet;
                const provider: IProviderDoc = transaction.provider;
                const user: IUserDoc = business.user;
                const account: IAccountDoc = business.accounts.find((x) => x.provider.name === provider.name);
                const paymentLink: IPaymentLinkDoc = transaction.payment;
                const invoice: IInvoiceDoc = paymentLink.invoice;
                const product: IProductDoc = paymentLink.product;
                const card: ICardDoc = transaction.card;

                // process for transaction for settlements ( i.e. payment-link )
                if (transaction.feature === TransactionFeatureType.PAYMENT_LINK) {

                    // encrypt card authorization code
                    const encryptedAuthCode = await SystemService.encryptData({
                        payload: webhook.authorization.authorization_code,
                        separator: '-',
                        password: business.email
                    });

                    // update transaction
                    transaction.providerRef = webhook.reference;
                    transaction.reference = webhook.reference;
                    transaction.providerData = webhook;
                    transaction.status = TransactionService.getPaymentStatus(webhook.status);
                    transaction.channel = webhook.channel;
                    transaction.ipAddress = webhook.ip_address;
                    transaction.customer = {
                        ref: webhook.customer.customer_code,
                        accountNo: '',
                        city: '',
                        email: webhook.customer.email,
                        firstName: transaction.customer.firstName,
                        lastName: transaction.customer.lastName,
                        phoneCode: transaction.customer.phoneCode,
                        phoneNumber: transaction.customer.phoneNumber,
                        sourceAccount: '',
                        state: ''
                    }
                    transaction.description = `incoming payment of NGN${transaction.amount.toLocaleString()} to ${business.name} via payment link`;
                    await transaction.save();

                    // update card information
                    if (card) {

                        card.expiryMonth = webhook.authorization.exp_month;
                        card.brand = webhook.authorization.brand;
                        card.expiryYear = webhook.authorization.exp_year;
                        card.cardLast = webhook.authorization.last4;
                        card.authCode = encryptedAuthCode;
                        card.cardType = webhook.authorization.card_type;
                        card.countryCode = webhook.authorization.country_code;
                        await card.save()

                    }

                    if (transaction.status === TransactionStatus.SUCCESSFUL || transaction.status === TransactionStatus.COMPLETED) {

                        // update invoice
                        if (paymentLink.feature === FeatureType.INVOICE && invoice) {

                            invoice.status = 'paid';
                            await invoice.save();

                            await InvoiceService.updateInflow(invoice, transaction);
                        }
                        // update product
                        if (paymentLink.feature === FeatureType.PRODUCT && product) {
                            await ProductService.updateInflow(product, transaction);
                            await ProductService.updateAnalytics(product);
                        }

                        // update payment-link
                        await PaymentLinkService.updateInflow(paymentLink, transaction);
                        await PaymentLinkService.updateAnalytics(paymentLink);

                        // disable payment link if it is initialized and not reuseable
                        if (paymentLink.initialized && paymentLink.reuseable === false) {
                            paymentLink.isEnabled = false;
                            await paymentLink.save();
                        }

                        // update wallet inflow
                        const userWallet = await WalletService.updateSettlementInflow(wallet, transaction);

                        // create settlement 
                        await SettlementService.reportSettlement({ transaction: transaction, business });

                        // run queue job that processes updating Vacepay revenue
                        updateVacepayRevenueJob(transaction);

                        // send email
                        await WalletService.sendCreditTransferEmail({
                            account,
                            business,
                            transaction: transaction,
                            invoice,
                            paymentLink,
                            product,
                            user,
                            wallet: userWallet
                        })

                        if (business.businessType === BusinessType.CORPORATE) {

                            sendWebhookNotificationJob({
                                business: business,
                                transaction: transaction,
                                type: 'success'
                            });

                        }

                    }

                    if (transaction.status === TransactionStatus.PENDING || transaction.status === TransactionStatus.PROCESSING) { }

                    if (transaction.status === TransactionStatus.FAILED) { }

                }

            }

            if (event === 'charge.failed' && transaction) {

                const business: IBusinessDoc = transaction.business;
                const settings: ISettingDoc = business.settings;
                const provider: IProviderDoc = transaction.provider;

                // process for transaction for settlements ( i.e. payment-link )
                if (transaction.feature === TransactionFeatureType.PAYMENT_LINK) {

                    // encrypt card authorization code
                    const encryptedAuthCode = await SystemService.encryptData({
                        payload: webhook.authorization.authorization_code,
                        separator: '-',
                        password: business.email
                    });

                    // update transaction
                    transaction.providerRef = webhook.reference;
                    transaction.reference = webhook.reference;
                    transaction.providerData = webhook;
                    transaction.status = TransactionService.getPaymentStatus(webhook.status);
                    transaction.channel = webhook.channel;
                    transaction.card.expiryMonth = webhook.authorization.exp_month;
                    transaction.card.brand = webhook.authorization.brand;
                    transaction.card.expiryYear = webhook.authorization.exp_year;
                    transaction.card.cardLast = webhook.authorization.last4;
                    transaction.card.authCode = encryptedAuthCode;
                    transaction.card.cardType = webhook.authorization.card_type;
                    transaction.card.countryCode = webhook.authorization.country_code;
                    transaction.ipAddress = webhook.ip_address;
                    transaction.customer = {
                        ref: webhook.customer.customer_code,
                        accountNo: '',
                        city: '',
                        email: webhook.customer.email,
                        firstName: transaction.customer.firstName,
                        lastName: transaction.customer.lastName,
                        phoneCode: transaction.customer.phoneCode,
                        phoneNumber: transaction.customer.phoneNumber,
                        sourceAccount: '',
                        state: ''
                    }
                    transaction.description = `failed: incoming payment of NGN${transaction.amount.toLocaleString()}`;
                    await transaction.save();

                    if (business.businessType === BusinessType.CORPORATE) {

                        sendWebhookNotificationJob({
                            business: business,
                            transaction: transaction,
                            type: 'failed'
                        });

                    }

                }

            }

        }

    }

    /**
     * @name processPSBWebhook
     * @description this webhook only works for paystack notifications
     * @param data 
     */
    private async processPSBWebhook(data: ProcessPSBWebhookDTO): Promise<void> {

        const { payload } = data;

        const transaction = await Transaction.findOne({ "bank.accountNo": payload.customer.account.number }).populate([
            {
                path: 'business', populate: [
                    { path: 'wallet' },
                    { path: "user" },
                    { path: 'accounts' },
                    { path: 'wallet' },
                    { path: 'settings' }
                ]
            },
            { path: "provider" },
            {
                path: 'payment', populate: [
                    { path: 'product' },
                    { path: 'invoice' }
                ]
            }
        ])

        if (transaction) {

            // if transaction exists, this means funding was done via API or internal

            const business: IBusinessDoc = transaction.business;
            const settings: ISettingDoc = business.settings;
            const user: IUserDoc = business.user;
            const wallet: IWalletDoc = business.wallet;
            const provider: IProviderDoc = transaction.provider;
            const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, provider.name);

            if (transaction.feature === TransactionFeatureType.BANK_ACCOUNT) {

                // update transaction
                let upTransaction = await TransactionService.updateFundTransaction({
                    business,
                    payload,
                    provider,
                    transaction
                });

                if (upTransaction.status === TransactionStatus.SUCCESSFUL || upTransaction.status === TransactionStatus.COMPLETED) {

                    // TODO: update user wallet

                    // send email
                    await WalletService.sendCreditTransferEmail({
                        account,
                        business,
                        transaction: upTransaction,
                        user
                    })

                    if (business.businessType === BusinessType.CORPORATE) {

                        sendWebhookNotificationJob({
                            business: business,
                            transaction: transaction,
                            type: 'success'
                        });

                    }

                }

                if (upTransaction.status === TransactionStatus.PENDING || upTransaction.status === TransactionStatus.PROCESSING) { }

                if (upTransaction.status === TransactionStatus.FAILED) { }

            }

            if (transaction.feature === TransactionFeatureType.PAYMENT_LINK) {

                const paymentLink: IPaymentLinkDoc = transaction.payment;
                const invoice: IInvoiceDoc = paymentLink.invoice;
                const product: IProductDoc = paymentLink.product;

                // update transaction
                let status = TransactionService.getPaymentStatus(payload.code === '00' ? 'success' : 'failed');
                let calculatedFee = await this.calculateFee({
                    provider, settings,
                    amount: parseFloat(payload.order.amount.toString()),
                    type: 'transfer',
                    category: 'outflow'
                });

                transaction.status = status;
                transaction.providerData = payload;
                transaction.webhook = {
                    enabled: true,
                    event: 'inflow-success',
                    sessionId: payload.transaction.sessionid
                }
                transaction.channel = 'bank-transfer';
                transaction.description = `Incoming payment of NGN${payload.order.amount.toLocaleString()} via payment link`;
                transaction.amount = parseFloat(payload.order.amount.toString());
                transaction.unitAmount = parseFloat(payload.order.amount.toString()) * 100;
                transaction.fee = calculatedFee.fee;
                transaction.unitFee = (calculatedFee.fee * 100);
                transaction.vatFee = calculatedFee.vat;
                transaction.unitVatFee = calculatedFee.vat * 100;
                await transaction.save();

                // update settlement inflow
                const userWallet = await WalletService.updateSettlementInflow(wallet, transaction);

                // update invoice
                if (paymentLink.feature === FeatureType.INVOICE && invoice) {

                    invoice.status = 'paid';
                    await invoice.save();

                    await InvoiceService.updateInflow(invoice, transaction);

                }
                // update product
                if (paymentLink.feature === FeatureType.PRODUCT && product) {
                    await ProductService.updateInflow(product, transaction)
                    await ProductService.updateAnalytics(product);
                }

                // update payment-link
                await PaymentLinkService.updateInflow(paymentLink, transaction);
                await PaymentLinkService.updateAnalytics(paymentLink);

                // disable payment link if it is initialized and not reuseable
                if (paymentLink.initialized && paymentLink.reuseable === false) {
                    paymentLink.isEnabled = false;
                    await paymentLink.save();
                }

                // create or update settlement 
                await SettlementService.reportSettlement({ transaction, business });

                if (transaction.status === TransactionStatus.SUCCESSFUL || transaction.status === TransactionStatus.COMPLETED) {

                    // send email
                    await WalletService.sendCreditTransferEmail({
                        account,
                        business,
                        transaction: transaction,
                        invoice,
                        paymentLink,
                        product,
                        user,
                        wallet: userWallet
                    })

                    if (business.businessType === BusinessType.CORPORATE) {

                        sendWebhookNotificationJob({
                            business: business,
                            transaction: transaction,
                            type: 'failed'
                        });

                    }

                }

                if (transaction.status === TransactionStatus.PENDING || transaction.status === TransactionStatus.PROCESSING) { }

                if (transaction.status === TransactionStatus.FAILED) { }

            }


        } else {

            const account = await AccountRepository.findByAcccountNo(payload.customer.account.number, true)

            if (account) {

                // if account exists, then it is an inflow into the 'static' business account

                const business: IBusinessDoc = account.business;
                const user: IUserDoc = business.user;
                const wallet: IWalletDoc = business.wallet;
                const provider: IProviderDoc = account.provider;

                // create the transaction
                const txnref = TransactionService.generateRef(); // vacepay reference
                const transaction = await TransactionService.createFundTransaction({
                    type: 'debit',
                    provider: account.provider,
                    isWebhook: false,
                    reference: txnref,
                    business,
                    wallet
                });

                // save references quickly
                transaction.providerRef = payload.transaction.externalreference ? payload.transaction.externalreference : txnref;
                await transaction.save();

                // update the fund transaction
                let upTransaction = await TransactionService.updateFundTransaction({
                    business,
                    payload,
                    provider,
                    transaction: transaction
                });

                if (upTransaction.status === TransactionStatus.SUCCESSFUL || upTransaction.status === TransactionStatus.COMPLETED) {

                    const userWallet = await WalletService.updateBankInflow(wallet, transaction);
                    await AccountService.updateBankInflow(account, transaction);

                    // send email
                    await WalletService.sendCreditTransferEmail({
                        account,
                        business,
                        transaction: upTransaction,
                        user,
                        wallet: userWallet
                    })

                    // send webhook to business
                    if (business.businessType === BusinessType.CORPORATE) {

                        sendWebhookNotificationJob({
                            business: business,
                            transaction: upTransaction,
                            type: 'success'
                        });

                    }

                }

                if (upTransaction.status === TransactionStatus.PENDING || upTransaction.status === TransactionStatus.PROCESSING) { }

                if (upTransaction.status === TransactionStatus.FAILED) { }

            }

        }

    }


}

export default new ProviderService();