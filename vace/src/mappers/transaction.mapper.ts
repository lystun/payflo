import { capitalize, dateToday, formatISO, toDecimal } from '@btffamily/vacepay';
import { MappedCardDTO } from '../dtos/corporate.dto';
import { IGPLFee, IResult, ITransactionDoc } from '../utils/types.util'
import { CurrencyType, DomainType, TransactionFeatureType, TransactionStatus } from '../utils/enums.util';
import Transaction from '../models/Transaction.model';
import ENV from '../utils/env.util';
import Card from '../models/Card.model';
import { TransactionExportMappedDTO, TransactionMappedDTO } from '../dtos/export.dto';

class TransactionMapper {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name mapTransactionData
     * @param transaction 
     * @returns 
     */
    public async mapTransactionData(transaction: ITransactionDoc): Promise<TransactionMappedDTO> {

        let predom = ENV.isProduction() ? DomainType.LIVE : DomainType.TEST;
        let domain = transaction.business.settings && transaction.business.settings.domain ? transaction.business.settings.domain : predom;
        const card = await this.mapCardData(transaction.card);

        let result: TransactionMappedDTO = {
            status: transaction.status,
            type: transaction.type,
            domain: domain,
            reference: transaction.reference,
            merchantRef: transaction.merchantRef ? transaction.merchantRef : '',
            amount: toDecimal(transaction.amount, 2),
            fee: transaction.fee,
            vat: transaction.vatFee,
            feature: transaction.feature,
            ipAddress: transaction.ipAddress,
            currency: transaction.currency ? transaction.currency : CurrencyType.NGN,
            description: transaction.description,
            vasData: transaction.vasData,
            metadata: transaction.metadata,
            bank: {
                name: transaction.bank.name,
                accountName: transaction.bank.accountName,
                accountNo: transaction.bank.accountNo,
                bankCode: transaction.bank.platformCode ? transaction.bank.platformCode : transaction.bank.bankCode
            },
            customer: {
                firstName: transaction.customer.firstName,
                lastName: transaction.customer.lastName,
                email: transaction.customer.email,
                phoneNumber: transaction.customer.phoneNumber,
                phoneCode: transaction.customer.phoneCode,
                city: transaction.customer.city,
                state: transaction.customer.state,
                accountNo: transaction.customer.accountNo,
                sourceAccount: transaction.customer.sourceAccount
            },
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt
        }

        if (card) {
            result.card = card;
        }

        if (transaction.feature === TransactionFeatureType.PAYMENT_LINK) {

            if (transaction.payment && transaction.payment.invoice) {
                result.invoiceCode = transaction.payment.invoice.code
            } else if (transaction.payment && transaction.payment.product) {
                result.productCode = transaction.payment.product.code
            }

        } else if (transaction.feature === TransactionFeatureType.WALLET_CHARGEBACK && transaction.chargeback) {
            result.chargebackCode = transaction.chargeback.code;
        } else if (transaction.feature === TransactionFeatureType.WALLET_REFUND && transaction.refund) {
            result.chargebackCode = transaction.refund.code;
        }

        return result;

    }

    /**
     * @name mapTransactionList
     * @param data 
     * @returns 
     */
    public async mapTransactionList(data: Array<ITransactionDoc>): Promise<Array<TransactionMappedDTO>> {

        let result: Array<TransactionMappedDTO> = [];

        for (let i = 0; i < data.length; i++) {

            let transaction = data[i];
            let mapped = await this.mapTransactionData(transaction);

            result.push(mapped);

        }

        return result;

    }

    /**
     * @name mapExportType
     */
    private async mapExportType(transaction: ITransactionDoc): Promise<string> {

        let result: string = 'Web';

        if (transaction.feature === TransactionFeatureType.BANK_ACCOUNT ||
            transaction.feature === TransactionFeatureType.BANK_TRANSFER ||
            transaction.feature === TransactionFeatureType.INTERNAL_CREDIT ||
            transaction.feature === TransactionFeatureType.INTERNAL_TRANSFER ||
            transaction.feature === TransactionFeatureType.WALLET_TRANSFER ||
            transaction.feature === TransactionFeatureType.INTERNAL_DEBIT ||
            transaction.feature === TransactionFeatureType.WALLET_CHARGEBACK ||
            transaction.feature === TransactionFeatureType.WALLET_REFUND ||
            transaction.feature === TransactionFeatureType.WALLET_WITHDRAW) {
            result = 'Bank Transfer'
        } else if (transaction.feature === TransactionFeatureType.BANK_SETTLEMENT) {
            result = 'Settlement'
        } else if (transaction.feature === TransactionFeatureType.WALLET_REVERSAL) {
            result = 'Reversal'
        } else if (transaction.feature === TransactionFeatureType.WALLET_DATA ||
            transaction.feature === TransactionFeatureType.WALLET_BILL ||
            transaction.feature === TransactionFeatureType.WALLET_DATA ||
            transaction.feature === TransactionFeatureType.WALLET_VAS ||
            transaction.feature === TransactionFeatureType.WALLET_AIRTIME) {
            result = 'VAS'
        } else if (transaction.feature === TransactionFeatureType.PAYMENT_LINK ||
            transaction.feature === TransactionFeatureType.API_REFUND) {
            result = transaction.channel ? capitalize(transaction.channel) : 'Link'
        }

        return result;

    }

    /**
     * @name mapExportReason
     * @param transaction 
     * @returns 
     */
    private async mapExportReason(transaction: ITransactionDoc): Promise<string> {

        let result: string = 'Successful';

        if (transaction.status === TransactionStatus.CANCELLED) {
            result = 'Transaction was cancelled'
        } else if (transaction.status === TransactionStatus.COMPLETED || transaction.status === TransactionStatus.SUCCESSFUL) {
            result = 'Transaction is successful'
        } else if (transaction.status === TransactionStatus.FAILED) {
            result = 'Could not process transaction'
        } else if (transaction.status === TransactionStatus.PENDING) {
            result = 'Transaction not completed'
        } else if (transaction.status === TransactionStatus.REFUNDED) {
            result = 'Refund transaction'
        }

        return result;

    }

    /**
     * @name mapExportTransactionData
     * @param transaction 
     * @returns 
     */
    public async mapExportTransactionData(transaction: ITransactionDoc): Promise<Partial<TransactionExportMappedDTO>> {

        let result: Partial<TransactionExportMappedDTO> = {}
        let predom = ENV.isProduction() ? DomainType.LIVE : DomainType.TEST;
        let domain = transaction.business.settings && transaction.business.settings.domain ? transaction.business.settings.domain : predom;

        const card = await this.mapCardData(transaction.card);
        const type = await this.mapExportType(transaction);
        const reason = await this.mapExportReason(transaction)

        const formatCreated = formatISO(dateToday(transaction.createdAt).ISO);
        const formatUpdated = formatISO(dateToday(transaction.updatedAt).ISO);
        const settleDate = transaction.settle.settledAt ? formatISO(dateToday(transaction.settle.settledAt).ISO) : formatISO(dateToday(Date.now()).ISO);
        const settledAt = transaction.settle.settledAt ? `${settleDate.date} ${settleDate.time}` : '---'
        const settlement = transaction.feature === TransactionFeatureType.PAYMENT_LINK ? transaction.settle.status : '---'

        result = {
            domain: domain,
            channel: transaction.channel ? transaction.channel : 'web',
            merchant_name: transaction.business.name,
            merchant_id: transaction.business.merhcantID,
            merchant_business_address: transaction.business.location ? transaction.business.location.address : '---',
            transaction_ref: transaction.reference,
            provider_ref: transaction.providerRef ? transaction.providerRef : '---',
            merchant_ref: transaction.merchantRef ? transaction.merchantRef : '---',
            currency: transaction.currency ? transaction.currency : CurrencyType.NGN,
            transaction_type: type,
            status: capitalize(transaction.status),
            status_reason: reason,
            amount: '\t' + `${toDecimal(transaction.amount, 2)}`,
            fee: '\t' + `${toDecimal(transaction.fee, 2)}`,
            vat_fee: '\t' + `${toDecimal(transaction.vatFee, 2)}`,
            masked_pan: card && card.cardBin && card.cardLast ? `${card.cardBin}******${card.cardLast}` : '---',
            settlement_status: settlement,
            settlement_date: settledAt,
            refund_status: transaction.refund ? transaction.refund.status : '---',
            chargeback_status: transaction.chargeback ? transaction.chargeback.status : '---'
        }

        if (transaction.feature === TransactionFeatureType.PAYMENT_LINK) {

            if (transaction.payment && transaction.payment.invoice) {
                result.invoice = transaction.payment.invoice.code
            } else if (transaction.payment && transaction.payment.product) {
                result.product = transaction.payment.product.code
                result.product_qty = '\t' + `${transaction.productQty}`
            }

        } else if (transaction.feature === TransactionFeatureType.WALLET_CHARGEBACK && transaction.chargeback) {
            result.chargeback = transaction.chargeback.code;
        } else if (transaction.feature === TransactionFeatureType.WALLET_REFUND && transaction.refund) {
            result.refund = transaction.refund.code;
        }


        return result;

    }

    /**
     * @name mapExportTransactionList
     * @param data 
     * @returns 
     */
    public async mapExportTransactionList(data: Array<ITransactionDoc>): Promise<Array<Partial<TransactionExportMappedDTO>>> {

        let result: Array<Partial<TransactionExportMappedDTO>> = [];

        for (let i = 0; i < data.length; i++) {

            let transaction = data[i];
            let mapped = await this.mapExportTransactionData(transaction);

            result.push(mapped);

        }

        return result;

    }

    /**
     * @name mapCardData
     * @param card 
     * @returns 
     */
    public async mapCardData(card: any): Promise<MappedCardDTO | null> {

        let result: MappedCardDTO | null = null;

        let cardId: any = '';

        if (card && card._id) {
            cardId = card._id;
        } else {
            cardId = card
        }

        const cardData = await Card.findOne({ _id: cardId });

        if (cardData) {

            result = {
                brand: cardData.brand,
                cardBin: cardData.cardBin,
                cardLast: cardData.cardLast,
                expiryMonth: cardData.expiryMonth,
                expiryYear: cardData.expiryYear,
                createdAt: cardData.createdAt,
                updatedAt: cardData.updatedAt,
                authCode: cardData.authorization.authCode
            }

        }

        return result;

    }

    /**
     * @name mapGPLFee
     * @param aggregated 
     * @returns 
     */
    public async mapGPLFee(aggregated: Array<any>): Promise<IGPLFee> {

        let gplFee: IGPLFee = {
            amount: 0, count: 0, fee: 0, revenue: 0, vat: 0
        }

        if (aggregated[0]) {

            const data = aggregated[0];

            gplFee.amount = parseFloat(data.amount.toString())
            gplFee.count = parseInt(data.count.toString())
            gplFee.fee = parseFloat(data.fee.toString())
            gplFee.revenue = parseFloat(data.revenue.toString())
            gplFee.vat = parseFloat(data.vat.toString())

        }

        return gplFee;

    }

}

export default new TransactionMapper();