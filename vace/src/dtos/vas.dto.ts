import { ITransactionDoc, ProviderType } from "../utils/types.util"
import { BaniResponseDTO } from "./providers/bani.dto"

export interface ValidateBillerDTO{
    itemId: number | string,
    billerId: string,
    customerId: string,
    amount: number
}

export interface GetVASInputFields{
    categories: Array<{ billerId: string, name: string, categoryId: string }>,
    providerName: ProviderType
}

export interface FormatVASInputValidation{
    customer: boolean, 
    amount: boolean, 
    hasDetails: boolean, 
    select: boolean,
    items: Array<any>
}

export interface VASInputResponseDTO{
    fields: Array<{
        fieldName: string,
        fieldDescription: string,
        validation: string,
        isSelectData: string,
        items: Array<{
            itemId: string,
            itemName: string,
            amount: number | string
        }>
    }>,
    category: {
        billerId: string,
        name: string,
        id: string
    }
}

export interface MapVASResponseDTO{
    providerName: ProviderType,
    itemId?: string,
    billerId?: string,
    customerId?: string,
    categoryId?: string,
    amount?: string | number,
    transaction?: ITransactionDoc,
    response: any,
    type: 'data-plans' | 'list-billers' | 'sub-categories' | 'validate-biller' | 
    'bill-transaction' | 'find-biller' | 'format-sub-category' | 'format-products' | 'format-addons' 
}

export interface VasResponseDTO{
    label?: string,
    logo?: string,
    amount: string,
    itemId: number | string,
    billerCode: string,
    billerName?: string,
    vasType: string,
    vasCode: string
    currency: string,
    countryCode: string,
    status: string | boolean,
    reference: string,
    createdAt: string,
    token: string,
    customer: {
        id: string,
        name: string,
        phoneNumber: string,
        network: string,
    }
    dataBundle: {
        bundle: string,
        validity: string,
        amount: string,
        currency: string,
        network: string,
        dataId: number | string
    }
    category: {
        categoryId: number | string,
        name: string,
        mainCategory: string,
        subCategory: string
    }
    billerId: string,
    billerItem: {
        name: string,
        itemId: number | string,
        code?: string,
        amount: string | number
    },
    billerItems: Array<{
        name: string,
        itemId: number | string,
        amount: string | number
    }>,
    validation:{
        customer: boolean,
        amount: boolean,
        hasBillerDetails: boolean,
        select?: boolean
    },
    metadata?: any
}