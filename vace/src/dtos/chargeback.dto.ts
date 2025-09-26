import { ObjectId } from "mongoose";
import { IAccountDoc, IBusinessDoc, IChargebackDoc, IProviderDoc, ITransactionDoc, IUserDoc, IWalletDoc } from "../utils/types.util";

export interface CreateChargebackDTO{
    reference: string,
    dueDate: string,
    timeline: string,
    message: string,
    level: string,
    bank: {
        accountNo: string,
        bankCode: string,
        accountName: string
    }
}

export interface UpdateChargebackDTO{
    status?: string,
    dueDate?: string,
    timeline?: string,
    message?: string,
    level?: string,
    reason?: string,
    evidence?: string,
    bank?: {
        accountNo: string,
        bankCode: string
    }
}

export interface LogChargebackDTO{
    user: IUserDoc,
    bizUser?: IUserDoc
    transaction: ITransactionDoc,
    business: IBusinessDoc,
    dueDate: string,
    timeline: string,
    message: string,
    level: string,
    bank: {
        accountNo: string,
        accountName: string,
        name: string,
        legalName: string,
        bankCode: string,
        platformCode: string
    }
}

export interface FilterChargebackDTO{
    status?: string,
    level?: boolean,
    date?: boolean,
    business?: ObjectId,
    transaction?: ObjectId
}

export interface PayoutChargebackTO{
    chargeback: IChargebackDoc,
    wallet: IWalletDoc,
    account: IAccountDoc,
    transaction: ITransactionDoc,
    business: IBusinessDoc,
    provider: IProviderDoc
}

export interface DeclineChargebackDTO{
    reason: string,
    evidence: string
}