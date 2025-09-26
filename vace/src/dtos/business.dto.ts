import { IBusinessDoc, ISettingDoc, IUserDoc } from "../utils/types.util"

export interface CreateBusinessDTO {
    type: string,
    name: string,
    tier: string,
    limit: {
        label: string,
        value: number
    }
}

export interface CreateSettingsDataDTO {
    business: IBusinessDoc,
    user: IUserDoc
}

export interface UpdateSettlementTimelineDTO {
    settings: ISettingDoc,
    days: number
}

export interface UpdateBusinessChargesDTO {
    settings: ISettingDoc,
    type: 'card' | 'bills' | 'transfer' | 'inflow'
    charges: SettingFeeRequestDTO
}

export interface UpdateBillsSettingsDTO {
    settings: ISettingDoc,
    airtime: string,
    data: string,
    cable: string,
    electricity: string
}

export interface UpdateWalletSettingsDTO {
    settings: ISettingDoc,
    inflow?: string,
    outflow?: string
}

export interface UpdatePaymentSettingsDTO {
    settings: ISettingDoc,
    request?: string,
    product?: string,
    invoice?: string
}

export interface UpdateResourceSettingsDTO {
    settings: ISettingDoc,
    refund?: string,
    product?: string,
    invoice?: string
}

export interface FilterBusinessDTO {
    type?: string
}

export interface UpdateSettingsDTO {
    settlement?: {
        days: number,
        settleInto: string
    },
    paymentLink?: {
        request: string,
        product: string,
        invoice: string
    },
    invoice?:string,
    product?:string,
    refund?:string,
    wallet?: {
        inflow: string,
        outflow: string
    },
    bills?: {
        airtime: string,
        data: string,
        cable: string,
        electricity: string
    }
    incognito?: boolean,
    domain?: string,
    chargeVat?: boolean
}

export interface SettingFeeRequestDTO {
    vatType: string,
    vatValue: number,
    chargeFee: boolean,
    providerFee: number,
    providerMarkup: number,
    type: string,
    value: number,
    capped: number,
    providerCap: number
    markup: number,
    stampDuty: number
}

export interface SetBusinessChargesDTO {
    card?: SettingFeeRequestDTO,
    bills?: SettingFeeRequestDTO,
    transfer?: SettingFeeRequestDTO
    inflow?: SettingFeeRequestDTO
}

export interface AddBeneficiaryDTO {
    business: IBusinessDoc,
    bank: {
        platformCode: string,
        bankCode: string,
        name: string,
        legalName: string,
        providers: Array<any>
    },
    accountNo: string,
    accountName: string,
}

export interface CreateBusinessBankDTO {
    bankCode: string,
    accountNo: string,
    accountName: string
}

export interface UpdateSettlementBankDTO {
    bankCode: string,
    accountNo: string,
    accountName: string
}
