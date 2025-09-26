import { IBusinessDoc } from "../utils/types.util";

export interface CreateSubaccountDTO{
    business: IBusinessDoc,
    split: {
        type: string,
        value: number
    },
    name: string,
    description?: string,
    phoneNumber: string,
    phoneCode: string,
    email: string,
    bank: {
        accountNo: string, 
        accountName: string,
        bankCode: string,
        platformCode: string,
        name: string,
        legalName: string
    }
}

export interface CreateSubaccountRequestDTO{
    split: {
        type: string,
        value: number
    },
    name: string,
    description?: string,
    phoneNumber: string,
    phoneCode: string,
    email: string,
    accountNo: string,
    bankCode: string
}

export interface UpdateSubaccountDTO{
    split: {
        type: string,
        value: number
    },
    name: string,
    description?: string,
    phoneNumber: string,
    phoneCode: string,
    email: string,
    accountNo: string,
    bankCode: string
}

export interface FilterSubaccountDTO{
    business?: IBusinessDoc,
    isEnabled?: string,
    type?: string
}