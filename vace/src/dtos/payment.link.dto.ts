import { ObjectId } from "mongoose";
import { IAccountDoc, IBusinessDoc, IPaymentLinkDoc, IProviderDoc, IWalletDoc } from "../utils/types.util";

export interface CreatePaymentLinkDTO{
    business: IBusinessDoc,
    feature: string,
    name: string,
    description?: string,
    type: string,
    amount?: number
    slug?: string,
    redirectUrl?: string,
    message?: string,
    productId?: ObjectId,
    invoiceId?: ObjectId,
    splits?: Array<string>,
    initialized?: boolean,
    initializeRef?: string,
    reuseable?: boolean,
    metadata?: Array<any>
    customer?: {
        email: string,
        firstName?: string,
        lastName?: string,
        phoneNumber?: string,
        phoneCode?: string
    }
}

export interface UpdatePaymentLinkDTO{
    name?: string,
    description?: string,
    type?: string,
    amount?: number
    slug?: string,
    redirectUrl?: string,
    message?: string,
    feature?: string,
    splits?: Array<string>
}

export interface AttachLinkResourceDTO{
    type: string,
    code: string
}

export interface CreateTransferTransactionDTO{
    firstName: string, 
    lastName: string,
    phoneNumber: string,
    phoneCode?: string, 
    amount?: number, 
    email: string,
    quantity: number,
}

export interface ChargeCardTransactionDTO{
    amount?: number,
    chargeType: 'card' | 'validate',
    validateType?: 'pin' | 'otp' | 'phone' | 'birthday' | 'address',
    reference?: string,
    callbackUrl: string,
    quantity: number,
    card: {
        cvv: string,
        number: string,
        name: string,
        expiryMonth: string,
        expiryYear: string
    },
    authorize: {
        pin: string, 
        otp: string, 
        phone: string, 
        birthday: string, 
        address: {
            city: string,
            state: string, 
            zipCode: string,
            address: string
        }
    },
    customer: {
        firstName: string, 
        lastName: string, 
        email: string, 
        phoneNumber: string, 
        phoneCode: string,
    }
}

export interface FilterPaymentLinkDTO{
    business?: IBusinessDoc,
    isEnabled?: string,
    feature?: string,
    type?: string
}

export interface UpdateLinkQRDTO{
    payment: IPaymentLinkDoc,
    newLink?: string,
    oldLink?: string
}

export interface ChargeLinkCardDTO{
    business: IBusinessDoc,
    wallet: IWalletDoc,
    provider: IProviderDoc,
    payment: IPaymentLinkDoc,
    chargeType: 'card' | 'validate',
    validateType?: 'pin' | 'otp' | 'phone' | 'birthday' | 'address',
    card?: {
        cvv: string,
        number: string,
        expiryMonth: string,
        expiryYear: string,
        name: string
    },
    authorize?: {
        pin?: string, 
        otp?: string, 
        phone?: string, 
        birthday?: string, 
        address?: {
            address?: string,
            city?: string,
            state?: string
            zipCode?: string
        }
    },
    customer: {
        firstName: string, 
        lastName: string, 
        email: string, 
        phoneNumber: string, 
        phoneCode?: string,
    }
    reference?: string,
    callbackUrl: string,
    amount?: number,
    quantity?: number
}
