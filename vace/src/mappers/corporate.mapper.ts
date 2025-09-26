import { isDefined, isObject, toDecimal } from '@btffamily/vacepay';
import { MappedBankDTO, MappedBeneficiaryDTO, MappedBusinessDetailsDTO, MappedCardDTO, MappedInvoiceDTO, MappedPaymetLinkDTO, MappedProductDTO, MappedRefundDTO, MappedSubaccountDTO, MappedTransactionDTO, MappedTransferDTO, MappedValidateBillDTO, MappedValidateBillerDTO, MappedValidateTopupDTO, MappedWalletDTO } from '../dtos/corporate.dto';
import { IBankDoc, IBeneficiaryDoc, IBusinessDoc, IInvoiceDoc, IPaymentLinkDoc, IProductDoc, IRefundDoc, IResult, ISubaccountDoc, ITransactionDoc, IWalletDoc } from '../utils/types.util'
import { CurrencyType, DomainType, FeatureType, TransactionFeatureType } from '../utils/enums.util';
import Transaction from '../models/Transaction.model';
import Product from '../models/Product.model';
import Invoice from '../models/Invoice.model';
import ENV from '../utils/env.util';
import Card from '../models/Card.model';

class CorporateMapper {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name mapAccountDetails
     * @param business 
     * @returns 
     */
    public async mapAccountDetails(business: IBusinessDoc): Promise<MappedBusinessDetailsDTO> {

        const socials = business.socials.map((x) => {
            return {
                name: x.name,
                url: x.url,
                username: x.username
            }
        })

        let result: MappedBusinessDetailsDTO = {
            tier: business.tier,
            dailyTransaction: business.dailyTransaction,
            name: business.name,
            email: business.email,
            phoneNumber: business.phoneNumber,
            officialEmail: business.officialEmail,
            profile: business.profile,
            staffStrength: business.staffStrength,
            industry: business.industry,
            category: business.category,
            logo: business.logo,
            cover: business.cover,
            socials: socials,
            country: {
                name: business.location.country.name,
                code: business.location.country.code2,
                phoneCode: business.location.country.phoneCode
            },
            location: {
                address: business.location.address,
                city: business.location.city,
                postalCode: business.location.postalCode,
                state: business.location.state
            },
            bank: business.bank
        }

        return result;

    }

    /**
     * @name mapGetBanks
     * @param data 
     * @returns 
     */
    public async mapGetBanks(data: Array<IBankDoc>): Promise<Array<MappedBankDTO>> {

        let result: Array<MappedBankDTO> = [];

        for (let i = 0; i < data.length; i++) {

            let bank = data[i];

            result.push({
                accountName: bank.accountName,
                accountNo: bank.accountNo,
                code: bank.platformCode ? bank.platformCode : bank.code,
                country: bank.country,
                currency: bank.currency,
                name: bank.legalName,
                type: bank.type
            })

        }

        return result;

    }

    /**
     * @name mapBankData
     * @param data 
     * @returns 
     */
    public async mapBankData(data: IBankDoc): Promise<MappedBankDTO> {

        let result: MappedBankDTO = {
            accountName: data.accountName,
            accountNo: data.accountNo,
            code: data.platformCode ? data.platformCode : data.code,
            country: data.country,
            currency: data.currency,
            name: data.legalName,
            type: data.type
        }

        return result;

    }

    /**
     * @name mapGetBeneficiaries
     * @param data 
     * @returns 
     */
    public async mapGetBeneficiaries(data: Array<IBeneficiaryDoc>): Promise<Array<MappedBeneficiaryDTO>> {

        let result: Array<MappedBeneficiaryDTO> = [];

        for (let i = 0; i < data.length; i++) {

            let beneficiary = data[i];

            result.push({
                accountName: beneficiary.accountName,
                accountNo: beneficiary.accountNo,
                code: beneficiary.code,
                bankName: beneficiary.bank.legalName,
                bankCode: beneficiary.bank.platformCode ? beneficiary.bank.platformCode : beneficiary.bank.bankCode
            })

        }

        return result;

    }

    /**
     * @name mapGetWallet
     * @param wallet 
     * @returns 
     */
    public async mapGetWallet(wallet: IWalletDoc): Promise<MappedWalletDTO> {

        let result: MappedWalletDTO = {
            walletID: wallet.walletID,
            balance: wallet.balance,
            currency: wallet.currency,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
            analytics: {
                inflow: wallet.inflow,
                outflow: wallet.outflow,
                transfer: wallet.transfer,
                withdrawal: wallet.withdrawal
            }
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

        if(card && card._id){
            cardId = card._id;
        }else {
            cardId = card
        }

        const cardData = await Card.findOne({ _id: cardId });

        if(cardData){

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
     * @name mapTransactionData
     * @param transaction 
     * @returns 
     */
    public async mapTransactionData(transaction: ITransactionDoc): Promise<MappedTransactionDTO> {

        let predom = ENV.isProduction() ? DomainType.LIVE : DomainType.TEST;
        let domain = transaction.business.settings && transaction.business.settings.domain ? transaction.business.settings.domain : predom;
        const card = await this.mapCardData(transaction.card);

        let result: MappedTransactionDTO = {
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

        if(card){
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
    public async mapTransactionList(data: Array<ITransactionDoc>): Promise<Array<MappedTransactionDTO>> {

        let result: Array<MappedTransactionDTO> = [];

        for (let i = 0; i < data.length; i++) {

            let transaction = data[i];
            let mapped = await this.mapTransactionData(transaction);

            result.push(mapped);

        }

        return result;

    }

    /**
     * @name mapInternalTransferData
     * @param data 
     * @returns 
     */
    public async mapInternalTransferData(data: any): Promise<MappedTransferDTO> {

        let source: ITransactionDoc = data.sourceTransaction;
        let recipient: ITransactionDoc = data.recipientTransaction;

        let result: MappedTransferDTO = {
            amount: toDecimal(data.amount, 2),
            reference: source.merchantRef,
            accountName: data.accountName ? data.accountName : 'N/A',
            accountNo: data.accountNo ? data.accountNo : 'N/A',
        }

        return result;

    }

    /**
     * @name mapInternalTransferList
     * @param data 
     * @returns 
     */
    public async mapInternalTransferList(data: Array<any>): Promise<Array<MappedTransferDTO>> {

        let result: Array<MappedTransferDTO> = [];

        for (let i = 0; i < data.length; i++) {

            let transfer = data[i];
            let mapped = await this.mapInternalTransferData(transfer);

            result.push(mapped);

        }

        return result;

    }

    /**
     * @name mapValidateBiller
     * @param data 
     * @returns 
     */
    public async mapValidateBiller(data: any): Promise<MappedValidateBillerDTO> {

        let result: MappedValidateBillerDTO = {
            status: data.status,
            billerCode: data.billerCode,
            billerItem: data.billerItem,
            customer: data.customer,
            currency: data.currency
        }

        return result;

    }

    /**
     * @name mapGetTopupStatus
     * @param data 
     * @returns 
     */
    public async mapGetTopupStatus(data: any): Promise<MappedValidateTopupDTO> {

        let result: MappedValidateTopupDTO = {
            reference: data.reference,
            status: data.status,
            billerCode: data.billerCode,
            billerName: data.billerName,
            hasToken: data.hasToken,
            token: data.token,
            network: data.network,
            phoneNumber: data.phoneNumber,
            type: data.type
        }

        return result;

    }

    /**
     * @name mapGetBillStatus
     * @param data 
     * @returns 
     */
    public async mapGetBillStatus(data: any): Promise<MappedValidateBillDTO> {

        let result: MappedValidateBillDTO = {
            reference: data.reference,
            status: data.status,
            amount: data.amount,
            billerCode: data.billerCode,
            billerName: data.billerName,
            token: data.token,
            customer: {
                id: data.id,
                name: data.name,
                network: data.network,
                phoneNumber: data.phoneNumber,
            },
            category: data.category,
            createdAt: data.createdAt,
            vasType: data.vasType
        }

        return result;

    }

    /**
     * @name mapProductData
     * @param data 
     * @returns 
     */
    public async mapProductData(data: IProductDoc): Promise<MappedProductDTO> {

        let result: MappedProductDTO = {
            avatar: data.avatar,
            code: data.code,
            description: data.description,
            isEnabled: data.isEnabled,
            name: data.name,
            price: data.price,
            slug: data.slug,
            inflow: data.inflow,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        }

        return result;

    }

    /**
     * @name mapProductList
     * @param data 
     * @returns 
     */
    public async mapProductList(data: Array<IProductDoc>): Promise<Array<MappedProductDTO>> {

        let result: Array<MappedProductDTO> = [];

        for (let i = 0; i < data.length; i++) {

            let product = data[i];
            let mapped = await this.mapProductData(product)
            result.push(mapped)

        }

        return result;

    }

    /**
     * @name mapSubaccountData
     * @param data 
     * @returns 
     */
    public async mapSubaccountData(data: ISubaccountDoc): Promise<MappedSubaccountDTO> {

        let result: MappedSubaccountDTO = {
            code: data.code,
            description: data.description,
            isEnabled: data.isEnabled,
            name: data.name,
            email: data.email,
            phoneNumber: data.phoneNumber,
            phoneCode: data.phoneCode,
            inflow: data.inflow,
            split: data.split,
            bank: {
                accountNo: data.bank.accountNo,
                acccountName: data.bank.accountName,
                bankCode: data.bank.platformCode ? data.bank.platformCode : data.bank.bankCode,
                name: data.bank.legalName
            },
            slug: data.slug,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        }

        return result;

    }

    /**
     * @name mapSubaccountList
     * @param data 
     * @returns 
     */
    public async mapSubaccountList(data: Array<ISubaccountDoc>): Promise<Array<MappedSubaccountDTO>> {

        let result: Array<MappedSubaccountDTO> = [];

        for (let i = 0; i < data.length; i++) {

            let subaccount = data[i];
            let mapped = await this.mapSubaccountData(subaccount)
            result.push(mapped)

        }

        return result;

    }

    /**
     * @name mapInvoiceData
     * @param data 
     * @returns 
     */
    public async mapInvoiceData(data: IInvoiceDoc | any): Promise<MappedInvoiceDTO> {

        let items: Array<any> = [];
        let paymentLink: string = '';

        items = data.items.map((x: any) => {
            return {
                label: x.label,
                name: x.name,
                price: x.price,
                quantity: x.quantity,
                total: x.total,
            }
        })

        if (data.paymentLink) {
            paymentLink = data.paymentLink
        } else {
            paymentLink = data.payment && data.payment.link ? data.payment.link : '';
        }

        let result: MappedInvoiceDTO = {
            code: data.code,
            name: data.name,
            number: data.number,
            status: data.status,
            link: data.link,
            VAT: data.VAT,
            summary: data.summary,
            description: data.description,
            isEnabled: data.isEnabled,
            inflow: data.inflow,
            items: items,
            dueAt: data.dueAt,
            issuedAt: data.issuedAt,
            paymentLink: paymentLink,
            recipient: data.recipient,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        }

        return result;

    }

    /**
     * @name mapInvoiceList
     * @param data 
     * @returns 
     */
    public async mapInvoiceList(data: Array<IInvoiceDoc>): Promise<Array<MappedInvoiceDTO>> {

        let result: Array<MappedInvoiceDTO> = [];

        for (let i = 0; i < data.length; i++) {

            let invoice = data[i];
            let mapped = await this.mapInvoiceData(invoice)
            result.push(mapped)

        }

        return result;

    }

    /**
     * @name mapRefundData
     * @param data 
     * @returns 
     */
    public async mapRefundData(data: IRefundDoc): Promise<MappedRefundDTO> {

        let result: MappedRefundDTO = {
            code: data.code,
            amount: data.amount,
            option: data.option,
            reason: data.reason,
            status: data.status,
            type: data.type,
            paidAt: data.paidAt,
            bank: {
                accountName: data.bank.accountName,
                accountNo: data.bank.accountNo,
                bankCode: data.bank.platformCode ? data.bank.platformCode : data.bank.bankCode,
                name: data.bank.legalName
            },
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        }

        if (data.transaction.reference) {

            const mapped = await this.mapTransactionData(data.transaction);

            result.transaction = {
                reference: mapped.reference,
                amount: mapped.amount,
                fee: mapped.fee,
                feature: mapped.feature,
                createdAt: mapped.createdAt
            }

        } else if (isDefined(data.transaction)) {

            const transaction = await Transaction.findOne({ _id: data.transaction });

            if (transaction) {

                const mapped = await this.mapTransactionData(transaction);

                result.transaction = {
                    reference: mapped.reference,
                    amount: mapped.amount,
                    fee: mapped.fee,
                    feature: mapped.feature,
                    createdAt: mapped.createdAt
                }

            }

        }

        return result;

    }

    /**
     * @name mapRefundList
     * @param data 
     * @returns 
     */
    public async mapRefundList(data: Array<IRefundDoc>): Promise<Array<MappedRefundDTO>> {

        let result: Array<MappedRefundDTO> = [];

        for (let i = 0; i < data.length; i++) {

            let refund = data[i];
            let mapped = await this.mapRefundData(refund)
            result.push(mapped)

        }

        return result;

    }

    /**
     * @name mappedPaymentLinkData
     * @param data 
     * @returns 
     */
    public async mapPaymentLinkData(data: IPaymentLinkDoc): Promise<MappedPaymetLinkDTO> {

        let result: MappedPaymetLinkDTO = {
            name: data.name,
            slug: data.slug,
            link: data.link,
            qrcode: data.qrcode,
            redirectUrl: data.redirectUrl,
            feature: data.feature,
            type: data.type,
            reuseable: data.reuseable,
            isEnabled: data.isEnabled,
            message: data.message,
            description: data.description,
            amount: data.amount,
            totalAmount: data.totalAmount,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            options: data.options,
            metadata: data.metadata ? data.metadata : []
        }

        if(data.initializeRef){
            result.merchantRef = data.initializeRef
        }

        if (data.feature === FeatureType.PRODUCT && data.product) {

            if (isObject(data.product)) {

                const mapped = await this.mapProductData(data.product);
                result.product = {
                    code: mapped.code,
                    name: mapped.name,
                    price: mapped.price
                }

            } else if (isDefined(data.product)) {

                const product = await Product.findOne({ _id: data.product })
                if (product) {
                    const mapped = await this.mapProductData(product);
                    result.product = {
                        code: mapped.code,
                        name: mapped.name,
                        price: mapped.price
                    }
                }

            }

        }

        if (data.feature === FeatureType.INVOICE && data.invoice) {

            if (isObject(data.invoice)) {

                const mapped = await this.mapInvoiceData(data.invoice);
                result.invoice = {
                    code: mapped.code,
                    name: mapped.name,
                    number: mapped.number,
                    summary: mapped.summary
                }

            } else if (isDefined(data.invoice)) {

                const invoice = await Invoice.findOne({ _id: data.invoice })
                if (invoice) {
                    const mapped = await this.mapInvoiceData(data.invoice);
                    result.invoice = {
                        code: mapped.code,
                        name: mapped.name,
                        number: mapped.number,
                        summary: mapped.summary
                    }
                }

            }

        }

        return result;

    }

    /**
     * @name mapPaymentLinkList
     * @param data 
     * @returns 
     */
    public async mapPaymentLinkList(data: Array<IPaymentLinkDoc>): Promise<Array<MappedPaymetLinkDTO>> {

        let result: Array<MappedPaymetLinkDTO> = [];

        for (let i = 0; i < data.length; i++) {

            let paymentLink = data[i];
            let mapped = await this.mapPaymentLinkData(paymentLink)
            result.push(mapped)

        }

        return result;

    }

}

export default new CorporateMapper();