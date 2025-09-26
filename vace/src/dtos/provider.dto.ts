import { IBusinessCharge, IBusinessDoc, IProviderDoc, ISettingDoc, ProviderType } from "../utils/types.util";
import { BaniWebhookEvent } from "./providers/bani.dto";

export interface ConfigProviderDTO{
    type: 'bank' | 'card'
}

export interface ProcessWebhookDTO{
    providerName: ProviderType
    payload: any,
    encryption?:{
        hash?: string,
        signature?: any
    }
}

export interface ResolveAccountDTO{
    provider: ProviderType, 
    type: 'nuban' | 'gb', 
    code: string,
    listCode?: string,
    countryCode?: string, 
    accountNo: string
}

export interface SwitchProviderDTO{
    name: string, 
    type: 'bank' | 'card' | 'bills' | 'directpay' | 'verve' | 'master' | 'visa',
    status: boolean
}

export interface UpdateTransactionFeeDTO{
    category: string,
    name: string, 
    type: string,
    value: number,
    capped: number,
    providerCap: number,
    markup: number,
    chargeFee: boolean,
    providerFee: number
    providerMarkup: number,
    stampDuty: number
}

export interface CalculateFeeDTO{
    settings: ISettingDoc,
    provider: IProviderDoc,
    amount: number,
    admin?: boolean
    type: 'card' | 'transfer' | 'vas' | 'bill';
    category: 'inflow' | 'outflow'
}

export interface CalculateVATFeeDTO{
    amount: number,
    charge: IBusinessCharge
}

export interface FundBankAccountDTO{
    amount: number,
    description?: string
}

export interface BankProviderDTO{
    name: string,
    code: string,
    listCode?: string,
    bankName: string,
    bankId: string,
    providers: Array<any>
}

export interface ResolveBankDTO{
    accountNo: string,
    bankCode: string,
    name: string
}

export interface ResolvedBankDTO{
    accountNo: string,
    accountName: string,
    platformCode: string,
    bankCode: string,
    bankName: string,
    bankId: string,
    providers: Array<any>
}