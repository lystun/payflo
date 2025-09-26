import { ObjectId } from "mongoose";
import { IAccountDoc, IBusinessDoc, IInvoiceDoc, IPaymentLinkDoc, IProductDoc, IProviderDoc, ISettingDoc, ITransactionDoc, IUserDoc, IWalletDoc, ProviderType } from "../utils/types.util";

export interface CreateWalletDTO{
    business: IBusinessDoc,
    currency?: string,
}

export interface CheckBalanceDTO{
    type: 'card' | 'transfer' | 'vas' | 'bill',
    category: 'inflow' | 'outflow'
    amount: number,
    frequency?: number,
    wallet: IWalletDoc,
    provider: IProviderDoc,
    settings: ISettingDoc
}

export interface GetWalletSocketDTO{
    businessId: string
    walletId?: string
}

export interface SendMoneyDTO{
    amount: number,
    pin: string,
    users?: Array<ObjectId | string>,
    bank?: {
        accountNo: string,
        bankCode: string,
        accountName: string
    },
    type: 'vacepay' | 'account',
    reference?: string,
    saveBank?: boolean
}

export interface WithdrawMoneyDTO{
    amount: number,
    pin: string,
    bank: {
        accountNo: string,
        bankCode: string,
        accountName: string,
    }
    reference?: string,
    saveBank?: boolean
}

export interface WithdrawRevenueDTO{
    amount: number,
    password: string,
    bank: {
        accountNo: string,
        bankCode: string,
        accountName: string,
    }
    saveBank?: boolean
}

export interface WithdrawMoneyCorpDTO{
    amount: number,
    pin: string,
    accountNo: string,
    reference?: string,
    saveBank?: boolean
}

export interface BuyAirtimeDTO{
    amount: number,
    network: string,
    phoneNumber: string,
    phoneCode: string,
    reference: string,
    narration:string,
    pin: string
    
}

export interface BuyDataeDTO{
    amount: number,
    dataId: number | string,
    network: string,
    phoneNumber: string,
    phoneCode: string,
    reference: string,
    narration:string,
    pin: string
}

export interface ProcessInternalTransferDTO{
    business: IBusinessDoc,
    wallet: IWalletDoc,
    account: IAccountDoc,
    provider: IProviderDoc,
    providerName: ProviderType,
    recipients: Array<ObjectId>,
    amount: number,
    reference?: string
}

export interface ProcessInternalFundingDTO{
    providerName: ProviderType,
    recipients: Array<ObjectId>,
    amount: number,
    adminBusiness: IBusinessDoc,
    adminWallet: IWalletDoc,
    adminProvider: IProviderDoc,
    adminAccount: IAccountDoc
}

export interface ReverseMoneyToWalletDTO {
    business: IBusinessDoc,
    transaction: ITransactionDoc,
    wallet: IWalletDoc,
    account: IAccountDoc,
    provider: IProviderDoc,
    isWebhook: boolean,
    addFee: boolean
}

export interface SendInternalEmail{
    transaction: ITransactionDoc,
    paymentLink?: IPaymentLinkDoc,
    invoice?: IInvoiceDoc,
    product?: IProductDoc,
    business: IBusinessDoc,
    wallet?: IWalletDoc,
    user?: IUserDoc,
    account: IAccountDoc,
    recipientAccount?: IAccountDoc
}

export interface WalletGraphDTO{
    user: IUserDoc,
    startDate?: string
    endDate?: string
}