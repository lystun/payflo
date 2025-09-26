import { ObjectId } from "mongoose";
import { IBusinessDoc, ITransactionDoc, IWalletDoc } from "../utils/types.util";

export interface FundBusinessWalletDTO{
    amount: number,
    email: string,
    password: string,
}

export interface UpdatePlatformRevenueDTO{
    transaction: ITransactionDoc,
    wallet: IWalletDoc,
    business: IBusinessDoc
}

export interface UpdateWalletRevenueDTO{
    transaction: ITransactionDoc,
    wallet: IWalletDoc,
    business: IBusinessDoc
}

export interface SwapRevenueFundsDTO{
    fromBalance: string,
    toBalance: string,
    amount: number,
    password: string
}