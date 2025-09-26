import { IResult } from "../../utils/types.util"

export enum PSBAmountType{
    EXACT = 'EXACT',
    ANY = 'ANY',
    HIGHEROREXACT = 'HIGHEROREXACT',
    LOWEROREXACT = 'LOWEROREXACT'
}
export enum PSBAccountType{
    STATIC = 'STATIC',
    DYNAMIC = 'DYNAMIC',
}

export interface ComposePSBHashDTO {
    type: 'fund-normal' | 'fund-with-fee' | 'webhook-hash',
    reference?: string,
    amount: number,
    senderAcccountNo: string,
    recipientAccountNo: string,
    bankCode: string,
    fee?: number
}

export interface PSBAuthDTO{
    type: 'virtual-account' | 'vas-api' | 'funds-transfer',
    credentials: {
        public?: string,
        private?: string,
        username?: string,
        password?: string
    },
}

export interface PSBMapAPIResponseDTO{
    type: 'success' | 'error',
    payload: any,
    token?: string
}

export interface PSBGenerateAccountDTO{
    reference: string,
    amount: number,
    amountType: 'any' | 'exact' | 'higher-exact' | 'lower-exact',
    currency?: string,
    description?: string,
    country?: string,
    accountType: 'static' | 'dynamic',
    customer: {
        firstName: string,
        lastName: string
    }
}

export interface PSBDisableAccountDTO{
    reference: string,
    accountNo: string
}

export interface PSBEnableAccountDTO{
    reference: string,
    accountNo: string
}

export interface PSBVerifyFundingDTO{
    reference: string,
    accountNo: string,
    amount?: number
}

export interface PSBLedgerBalanceDTO{
    accountNo: string
}

export interface PSBVerifyNubanDTO{
    accountNo: string,
    bankCode: string
}

export interface PSBFundAccountDTO{
    type: 'fund-normal' | 'with-fee',
    reference: string,
    amount: number,
    currency?: string,
    description?: string,
    country?: string,
    sender: {
        accountNo: string,
        accountName: string
    },
    recipient: {
        accountName: string,
        bankCode: string,
        accountNo: string
    }
}

export interface PSBTopUpDTO{
    phone?: string,
    reference?: string
}

export interface PSBAirtimeTopupDTO{
    phone: string,
    reference: string,
    network: string,
    accountNo: string,
    amount: number
}

export interface PSBDataTopupDTO{
    phone: string,
    reference: string,
    network: string,
    accountNo: string,
    amount: number,
    productId: string
}

export interface PSBBillCategoriesDTO{
}

export interface PSBSubCategoriesDTO{
    categoryId: string | number
}

export interface PSBBillerInputDTO{
    billerId: string | number
}

export interface PSBValidateInputDTO{
    billerId: string | number,
    customerId: string,
    itemId: string,
    amount: number,
    firstName: string,
    lastName: string
}

export interface PSBPayBillDTO{
    billerId: string | number,
    itemId: string,
    customerId: string,
    phoneNumber: string,
    name: string,
    metadata: any,
    amount: number,
    accountNo: string,
    reference: string
}

export interface ValidateBillerWithPSBDTO{
    itemId: string, 
    customerId: string, 
    amount: number, 
    billerId: string
    currency?: string,
    phoneNumber: string
}

export interface ProcessPSBWebhookDTO{
    payload: PSBWebhookDataDTO
}

export interface PSBRequestDTO{
    reference?: string,
    sessionid?: string,
    amount?: number | string,
    accountnumber?: string,
    publickey?: string,
    privatekey?: string,
    username?: string,
    password?: string,
    productId?: string,
    hash?: string,
    phone?: string,
    phoneNumber?: string,
    network?: string,
    categoryId?: string | number,
    billerId?: string | number,
    customerId?: string,
    itemId?: string,
    firstname?: string,
    lastname?: string,
    customerName?: string,
    customerPhone?: string,
    otherField?: any,
    debitAccount?: string,
    transactionReference?: string
    transReference?: string
    transaction?: {
        reference?: string
    },
    order?: {
        amount?: number,
        currency?: string,
        description?: string
        country?: string,
        amounttype?: string
    },
    customer?: {
        account?: {
            name?: string,
            type?: string,
            number?: string
            bank?: string,
            senderaccountnumber?: string,
            sendername?: string,
            expiry?: {
                hours: number,
                date: string
            }
        }
    },
    account?: {
        accountnumber?: string
    },
    beneficiarytocredit?: {
        accountnumber: string,
        bankcode: string,
        feeamount: number
    }
}

export interface PSBApiResponseDTO{
    amount: string,
    recipient: string,
    network: string,
    dataPlan: string,
    otherField: any,
    customerName: string,
    isToken: boolean,
    token: string,
    access_token: string,
    accessToken: string,
    expires_in: number | string,
    expiresIn: number | string,
    code: string,
    message: string,
    status: string,
    transactionStatus: string,
    description: string,
    responseCode: string,
    transaction: {
        reference: string,
        linkingreference: string,
        externalreference: string,
        date: string
    }
    transactions: Array<{
        transaction: {
            reference: string,
            sessionid: string,
            date: string,
        },
        order:{
            amount: number,
            currency: string,
            description: string
        },
        customer: {
            account: {
                name: string,
                senderbankname: string,
                senderaccountnumber: string,
                senderbankcode: string,
                number: string,
                bank: string,
                sendername: string
            }
        },
    }>,
    reference: string,
    customer: {
        account: {
            name: string,
            type: string,
            expiry: {
                hours: number,
                date: string | number
            },
            number: string,
            bank: string,
            senderaccountnumber: string,
            sendername: string,
            kyc: any
        }
    },
    order: {
        amount: number,
        currency: string,
        description: string
        country: string,
        amounttype: string
    },
    beneficiarytocredit: {
        accountnumber: string,
        bankcode: string,
        feeamount: number
    },
    account?: {
        accountnumber?: string,
        accountbalance?: string,
        ledgerbalance?: string,
        minimumbalance?: string
    },

}

export interface PSBDataResponseDTO{
    productId: string,
    dataBundle: string,
    amount: string,
    validity: string
}

export interface PSBBillInputResponseDTO{
    fieldName: string,
    fieldDescription: string,
    validation: string,
    isSelectData: string,
    items: Array<{
        itemId: string,
        itemName: string,
        amount: number | string
    }>
}

export interface PSBCategoryResponseDTO{
    id: string,
    name: string
}

export interface PSBSubCategoryResponseDTO{
    id: string,
    name: string
}

export interface PSBWebhookDataDTO{
    Hash: string,
    code: string,
    message: string,
    transaction: {
        reference: string,
        linkingreference: string,
        externalreference: string,
        sessionid: string,
        date: string
    },
    customer: {
        account: {
            name: string,
            type: string,
            expiry: number,
            number: string,
            bank: string,
            senderbankcode: string,
            senderaccountnumber: string,
            sendername: string,
            kyc: any
        }
    },
    order: {
        amount: number,
        currency: string,
        description: string
        country: string,
        amounttype: string
    }
}