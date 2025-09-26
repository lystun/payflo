import { IAccountDoc, IBusinessDoc, IProviderDoc, ProviderType } from "../utils/types.util";

export interface CreateAccountDataDTO{
    providerName: ProviderType,
    business: IBusinessDoc,
    type: string
}

export interface UpdateAccountDetailsDTO{
    account: IAccountDoc, 
    response: any,
    provider: ProviderType,
    note?: string
}

export interface CreateBankDTO{
    code: string,
    accountName: string,
    accountNo: string,
    business: IBusinessDoc,
    provider: IProviderDoc
}