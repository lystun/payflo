import { ObjectId } from "mongoose";
import { IAccountDoc, IBusinessDoc, IGroupSubaccount, IPaymentLinkDoc, IProviderDoc, ISettingDoc, ISettlementAnalytics, ISettlementDoc, ISettlementLump, ISettlementPayout, ISubaccountDoc, ITransactionDoc, IWalletDoc } from "../utils/types.util";

export interface CreateSettlementDTO {
    transactions?: Array<ObjectId>
    date?: string,
    description?: string,
    business: IBusinessDoc
}

export interface UpdateSettlementReportDTO {
    settlement: ISettlementDoc,
    transactions?: Array<ObjectId>
    date?: string,
    business: IBusinessDoc
}

export interface CreateRunHistoryDTO {
    groups: Array<ISettlementLump>,
    analytics: ISettlementAnalytics,
    settlement: ISettlementDoc
}

export interface UpdateSettlementPayoutDTO {
    settlement: ISettlementDoc,
    transaction: ITransactionDoc,
    business: IBusinessDoc
}

export interface UpdateSettlementOverviewDTO {
    settlement: ISettlementDoc,
    transaction: ITransactionDoc
}

export interface UpdateSettlementGroupDTO {
    settlement: ISettlementDoc,
    transaction: ITransactionDoc
}

export interface RefreshSettlementReportDTO {
    settlement: ISettlementDoc
}

export interface GetDueSettlementOverviewDTO {
    type: 'today' | 'past'
    settlement: ISettlementDoc,
    date?: string
}

export interface ReportSettlementDTO {
    transaction: ITransactionDoc,
    business: IBusinessDoc
}

export interface FilterSettlementDTO {
    status?: string,
    isSettled?: boolean,
    isRunning?: boolean,
}

export interface FilterBusinessTransactionDTO{
    businessId: any,
    settlementId: any
}

export interface RunSettlementDTO {
    type: string,
    businessId?: any,
    forceRun?: boolean,
    addPast?: boolean
}

export interface ProcessGroupsDTO {
    type: 'bulk' | 'single'
    settlement: ISettlementDoc,
    provider: IProviderDoc,
    forceRun: boolean,
    addPast: boolean,
    businessId?: ObjectId | any
}

export interface ProcessRunSettlementDTO {
    settlement: ISettlementDoc,
    groups: Array<ISettlementLump>,
    provider: IProviderDoc
}
export interface RunLumpSettlementDTO{
    settlementId: any,
    forceRun: boolean,
    addPast: boolean
}
export interface RunBusinessSettlementDTO{
    settlementId: ObjectId | any, 
    businessId: ObjectId | any,
    forceRun: boolean
}
export interface SettleLumpSumDTO {
    amount: number,
    settlement: ISettlementDoc,
    business: IBusinessDoc,
    provider: IProviderDoc,
    analytics: ISettlementAnalytics,
    group: ISettlementLump
}

export interface SettleSubaccountsDTO {
    subaccounts: Array<IGroupSubaccount>,
    settlement: ISettlementDoc,
    business: IBusinessDoc,
    provider: IProviderDoc,
    analytics: ISettlementAnalytics,
}

export interface MarkAsSettledDTO {
    settlement: ISettlementDoc,
    business: IBusinessDoc
    group: ISettlementLump
}