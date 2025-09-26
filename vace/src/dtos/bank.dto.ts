import { IBankDoc, IBeneficiaryDoc, ISubaccountDoc } from "../utils/types.util"

export interface FindByAccountNoAndCodeDTO{
    accountNo: string, 
    bankCode: string, 
    businessId: any, 
    populate: boolean
}

export interface MapReplaceBankCodeDTO{
    type: 'bank' | 'beneficiary' | 'subaccount',
    beneficiary?: IBeneficiaryDoc,
    bank?: IBankDoc,
    subaccount?: ISubaccountDoc
}

export interface MapReplaceBankCodeListDTO{
    type: 'bank' | 'beneficiary' | 'subaccount',
    beneficiaries?: Array<IBeneficiaryDoc>,
    banks?: Array<IBankDoc>,
    subaccounts?: Array<ISubaccountDoc>
}

export interface MapReplaceCodeListDTO{
    beneficiaries: Array<IBeneficiaryDoc>,
    banks: Array<IBankDoc>,
    subaccounts: Array<ISubaccountDoc>
}