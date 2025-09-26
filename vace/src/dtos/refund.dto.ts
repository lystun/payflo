import { ObjectId } from "mongoose";
import { IAccountDoc, IBusinessDoc, IProviderDoc, IRefundDoc, ITransactionDoc, IWalletDoc, ProviderType } from "../utils/types.util";

export interface InitiateRefundDTO{
    business: IBusinessDoc,
    transaction: ITransactionDoc,
    reason: string,
    option: 'instant' | 'request',
    type: 'partial' | 'full',
    amount?: number,
    bank?: {
        accountNo: string,
        accountName: string,
        name: string,
        legalName: string,
        bankCode: string,
        platformCode: string
    }
}

export interface CreateRefundDTO{
    reference: string,
    reason: string,
    option: 'instant' | 'request',
    type: 'partial' | 'full',
    amount?: number,
    bank?: {
        accountNo: string,
        bankCode: string,
        accountName: string,
        platformCode: string
    },
    pin: string
}

export interface PayoutRefundDTO{
    refund: IRefundDoc,
    account: IAccountDoc,
    wallet: IWalletDoc,
    transaction: ITransactionDoc,
    business: IBusinessDoc,
    provider: IProviderDoc,
}

export interface FilterRefundDTO{
    status?: string,
    option?: boolean,
    type?: boolean,
    business?: ObjectId,
    transaction?: ObjectId
}

export interface RedirectRefundDTO{
    refund: IRefundDoc,
    transaction: ITransactionDoc,
    business: IBusinessDoc,
    provider: IProviderDoc,
    wallet: IWalletDoc,
}