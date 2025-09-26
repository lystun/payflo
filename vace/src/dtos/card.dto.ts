import { IBusinessDoc, IPaymentLinkDoc, IProviderDoc, ITransactionDoc, IWalletDoc } from "../utils/types.util"

export interface CreateCardDTO {
    type: 'business' | 'transaction',
    cvv: string,
    number: string,
    name?: string,
    expiryMonth: string,
    expiryYear: string,
    pin?: string,
    transaction?: ITransactionDoc,
    business?: IBusinessDoc
}

export interface DecodeChargeNextStepDTO {
    nextStep: string,
    url?: string,
    status?: string,
    displayText?: string,
    reference: string,
    type?: 'otp' | 'pin' | 'phone' | 'url' | 'birthday' | 'address' | 'success' | 'failed',
    path?: string,
    metadata?: any,
    statusCode: number
}

export interface GetNextStepDTO {
    type: string,
    reference: string,
    message?: string,
    url?: string
}

export interface CreateChargeDTO {
    business: IBusinessDoc,
    wallet: IWalletDoc,
    provider: IProviderDoc,
    payment: IPaymentLinkDoc,
    amount: number,
    currency: string,
    callbackUrl: string,
    ipAddress?: string,
    quantity?: number,
    card: {
        cvv: string,
        number: string,
        name?: string,
        expiryMonth: string,
        expiryYear: string,
        pin?: string
    },
    customer: {
        firstName: string,
        lastName: string,
        email: string,
        phoneNumber: string,
        phoneCode?: string,
    }
}

export interface AuthorizeChargeDTO {
    transaction: ITransactionDoc,
    validateType: 'pin' | 'otp' | 'phone' | 'birthday' | 'address',
    ipAddress?: string,
    authorize: {
        pin?: string,
        otp?: string,
        phone?: string,
        birthday?: string,
        address?: {
            city: string,
            state: string,
            zipCode: string,
            address: string
        }
    },
}

export interface MappedCardDataDTO{
    cardBin: string;
    cardLast: string;
    expiryMonth: string;
    expiryYear: string;
    cardType: string,
    brand: string,
    countryCode: string
    currency: string,
    country: string,
    slug: string;
    createdAt: string;
    updatedAt: string;
}