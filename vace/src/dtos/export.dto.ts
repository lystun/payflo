import { IBusinessDoc, IFilterDate, IPagination } from "../utils/types.util"
import { MappedCardDTO } from "./corporate.dto";

export interface IExportToCSVDTO{
    content: Array<any>,
    deleteFile: boolean,
    upload: {
        enabled: boolean,
        cloud: 'gcs'| 'aws' | 'cloudinary'
    }
}

export interface ExportTransactionDTO {
    status?: string,
    feature?: string,
    startDate: string,
    endDate: string,
    providerName?: string,
}

export interface TransactionExistsDTO {
    type: 'reference' | 'identifier',
    reference?: string,
    identifier?: any
}

export interface ExportAndSendEmailDTO {
    payload: IPagination,
    business: IBusinessDoc,
    email?: string,
    params: IFilterDate
}

export interface TransactionMappedDTO {

    type: string,
    domain: string,
    reference: string;
    merchantRef: string;
    feature: string,
    description: string,
    amount: number
    fee: number,
    vat: number,
    status: string,
    currency: string,
    metadata: Array<any>
    vasData: {
        type: string
        network: string
        phoneNumber: string
        billerCode: string
        billerName: string,
        hasToken: boolean
        token: string
    },
    customer: {
        firstName: string,
        email: string,
        lastName: string,
        accountNo: string,
        sourceAccount: string,
        city: string,
        state: string,
        phoneNumber: string,
        phoneCode: string,
    },
    bank: {
        name: string,
        accountNo?: string,
        accountName?: string,
        bankCode?: string,
    }
    ipAddress: string,
    card?: MappedCardDTO,
    invoiceCode?: string,
    productCode?: string,
    chargebackCode?: string
    refundCode?: string,
    createdAt: string;
    updatedAt: string;

}

export interface TransactionExportMappedDTO {

    merchant_name: string,
    merchant_id: string,
    merchant_business_address: string,
    transaction_type: string,
    domain: string,
    transaction_ref: string;
    channel: string;
    merchant_ref: string;
    provider_ref: string,
    feature: string,
    amount: string
    fee: string,
    vat_fee: string,
    status: string,
    status_reason: string,
    stamp_durty_fee: string,
    time: string,
    currency: string,
    bill_token: string,
    masked_pan: string,
    invoice: string,
    product: string,
    chargeback: string
    refund: string,
    settlement_date: string,
    settlement_status: string,
    refund_status: string,
    chargeback_status: string,
    product_qty: string,

}