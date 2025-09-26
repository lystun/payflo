import { Model, ObjectId } from "mongoose";
import { IAccountDoc, IBusinessDoc, IChargebackDoc, IFilterDate, IInvoiceDoc, IPaymentLinkDoc, IProductDoc, IProviderDoc, IRefundDoc, ISettingDoc, ISettlementDoc, ISubaccountDoc, ITransactionDoc, IUserDoc, IWalletDoc, InternalProcessType, TransactionFeature, TransactionType } from "../utils/types.util";
import { BaniWebhookDataDTO, BaniWebhookEvent } from "./providers/bani.dto";

export interface InitTransactionRequestDTO{
    type: string,
    amount?: number,
    description?: string,
    redirectUrl?: string,
    subaccounts?: Array<string>,
    message?: string,
    reuseable?: boolean,
    metadata?: Array<any>,
    reference?: string,
    customer: {
        email: string,
        firstName?: string,
        lastName?: string,
        phoneNumber?: string,
        phoneCode?: string
    }
}

export interface InitializeTransactionDTO{
    type: string,
    amount: number,
    business: IBusinessDoc,
    description?: string,
    redirectUrl?: string,
    subaccounts: Array<string>,
    message?: string,
    reuseable?: boolean,
    metadata?: Array<any>
    reference?: string
    enableLink?: boolean,
    customer: {
        email: string,
        firstName?: string,
        lastName?: string,
        phoneNumber?: string,
        phoneCode?: string
    }
}

export interface CreatePayinTransactionDTO {
    wallet: IWalletDoc,
    business: IBusinessDoc,
    provider: IProviderDoc,
    type: TransactionType,
    payload: BaniWebhookDataDTO,
    event: BaniWebhookEvent,
    isWebhook: boolean,
    feature?: TransactionFeature,
}

export interface CreatePayoutTransactionDTO {
    wallet: IWalletDoc,
    business: IBusinessDoc,
    provider: IProviderDoc,
    type: TransactionType,
    isWebhook: boolean
    reference: string,
    merchantRef?: string,
    feature?: TransactionFeature,
    refund?: IRefundDoc,
    chargeback?: IChargebackDoc,
    amount: number,
    isAdmin?: boolean,
    bank?: {
        name: string,
        bankCode: string,
        accountNo: string,
        accountName: string,
        platformCode: string
    }
}

export interface CreateSettledTransactionDTO {
    isSubaccount: boolean,
    subaccount?: ISubaccountDoc,
    wallet: IWalletDoc,
    settlement: ISettlementDoc,
    business: IBusinessDoc,
    settings: ISettingDoc,
    provider: IProviderDoc,
    type: TransactionType,
    feature?: TransactionFeature,
    amount: number
}

export interface CreateReversalTransactionDTO {
    wallet: IWalletDoc,
    business: IBusinessDoc,
    provider: IProviderDoc,
    type: TransactionType,
    isWebhook: boolean
    reference: string,
    feature?: TransactionFeature,
    transaction: ITransactionDoc,
    status: string,
    addFee: boolean
}

export interface CreateFundTransactionDTO {
    business: IBusinessDoc,
    wallet: IWalletDoc,
    type: TransactionType,
    isWebhook: boolean
    reference: string,
    feature?: TransactionFeature,
    provider: IProviderDoc
}

export interface UpdateFundTransactionDTO {
    business: IBusinessDoc,
    transaction: ITransactionDoc,
    payload: any
    provider: IProviderDoc
}

export interface UpdatePayoutTransactionDTO {
    business: IBusinessDoc,
    wallet?: IWalletDoc,
    transaction: ITransactionDoc,
    isWebhook: boolean,
    payload: any,
    event: any,
    provider: IProviderDoc,
}

export interface UpdateFailedTransactionDTO {
    status: string,
    reference: string
}

export interface CreateRefundTransactionDTO {
    refundType: 'instant' | 'request',
    wallet: IWalletDoc,
    business: IBusinessDoc,
    provider: IProviderDoc,
    type: TransactionType,
    isWebhook: boolean
    reference: string,
    merchantRef?: string,
    refund: IRefundDoc,
    amount: number,
    isAdmin?: boolean,
    bank?: {
        name: string,
        bankCode: string,
        accountNo: string,
        accountName: string,
        platformCode?: string
    }
}

export interface CreateChargebackTransactionDTO {
    wallet: IWalletDoc,
    business: IBusinessDoc,
    provider: IProviderDoc,
    type: TransactionType,
    isWebhook: boolean
    reference: string,
    merchantRef?: string,
    chargeback: IChargebackDoc,
    amount: number,
    isAdmin?: boolean,
    bank?: {
        name: string,
        bankCode: string,
        accountNo: string,
        accountName: string,
        platformCode?: string
    }
}

export interface CreateInternalTransactionDTO {
    wallet: IWalletDoc,
    business: IBusinessDoc,
    _sender: IBusinessDoc,
    provider: IProviderDoc,
    type: TransactionType,
    isWebhook: boolean,
    reference: string,
    merchantRef?: string,
    amount: number,
    _account: IAccountDoc,
    feature?: TransactionFeature,
}

export interface CreateFundingTransactionDTO {
    wallet: IWalletDoc,
    business: IBusinessDoc,
    provider: IProviderDoc,
    type: TransactionType,
    isWebhook: boolean,
    reference: string,
    amount: number,
    account: IAccountDoc,
    feature?: TransactionFeature,
}

export interface CreateVASTransactionDTO {
    wallet: IWalletDoc,
    business: IBusinessDoc,
    provider: IProviderDoc,
    type: TransactionType,
    isWebhook: boolean
    reference: string,
    merchantRef?: string,
    vasRef?: string,
    feature?: TransactionFeature,
    amount: number
}

export interface UpdateVASTransactionDTO {
    business: IBusinessDoc,
    account?: IAccountDoc,
    provider: IProviderDoc,
    transaction: ITransactionDoc,
    isWebhook: boolean,
    payload: any,
    event: any,
    amount?: string | number,
    request?: {
        amount?: number,
        network?: string,
        phoneNumber?: string,
        plan?: string,
        dataId?: string,
        addons?: Array<string>,
        itemId?: string,
        billerId?: string,
    },
    type?: 'airtime-topup' | 'data-topup' | 'cable-bill' | 'utility-bill'
}

export interface CreatePaymentLinkTransactionDTO {
    option: 'card' | 'transfer',
    wallet: IWalletDoc,
    business: IBusinessDoc,
    provider: IProviderDoc,
    type: TransactionType,
    isWebhook: boolean
    reference: string,
    feature?: TransactionFeature,
    customer: {
        firstName?: string,
        lastName?: string,
        email?: string,
        phoneNumber?: string,
        phoneCode?: string
    }
    bank?: {
        name: string,
        accountName: string,
        accountNo: string,
        expire: {
            hour: number,
            date: string | number
        },
        logo?: string
    },
    card?: {
        cardBin: string,
        cardLast: string,
        brand?: string,
        expiryMonth: string,
        expiryYear: string
        cardType?: string,
        country?: string,
        countryCode?: string
    },
    quantity?: number,
    currency?: string,
    amount: number,
    payment: IPaymentLinkDoc,
    invoice?: IInvoiceDoc,
    product?: IProductDoc
}

export interface VerifySocketTxnDTO {
    reference: string
}

export interface FilterTransactionDTO {
    business?: IBusinessDoc,
    status?: string,
    reference?: string,
    feature?: string,
    startDate?: string,
    endDate?: string,
    providerName?: string,
    type: string,
    dayNumber: number
}

export interface sendNotificationDTO {
    type: 'send-payout' | 'send-vas' | 'send-payin',
    update: boolean,
    reference: string,
    payload: any,
    provider: IProviderDoc
}

export interface AggregateTotalBySBSDTO {
    settlement: ISettlementDoc,
    business: IBusinessDoc,
    status: string
}

export interface AggSettlementAnalyticsDTO {
    settlement: ISettlementDoc,
    business: IBusinessDoc
}

export interface AggregateTotalDTO {
    user: IUserDoc,
    status?: string
}
export interface AggregateGraphDataDTO {
    user: IUserDoc,
    dates?: {
        from: string,
        to: string,
    }
}
export interface AggregateFilterAnalyticsDTO {
    user: IUserDoc,
    model?: any
    dates: IFilterDate
}
export interface AggregateAnalyticsByProviderDTO {
    user: IUserDoc,
    provider: IProviderDoc
    dates: IFilterDate
}
