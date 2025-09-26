import { IUserDoc, EmailDriver, VerifyOTPType, IBusinessDoc, ITransactionDoc, IAccountDoc, IWalletDoc, IChargebackDoc } from "../utils/types.util";


export interface SendgridEmailDataDTO{
    email: string,
    fromName: string,
    template: string,
    preheaderText?: string,
    code?: string,
    emailTitle: string,
    emailSalute: string,
    bodyOne: string,
    bodyTwo?: string,
    bodyThree?: string,
    loginEmail?: string,
    loginPassword?: string,
    buttonUrl?: string,
    buttonText?: string,
    eventTitle?: string,
    eventDescription?: string,
    startDate?: string,
    endDate?: string,
    count?: number,
    transaction?:{
        description: string,
        reference: string,
        amount: string,
        fee: string,
        status: string,
        stamp?: string,
        date: string,
        balance?: string,
        paymentName?: string,
        token?: string
    },
    chargeback?:{
        level: string,
        reference: string,
        amount: string,
        status: string,
        date: string
    },
    attachments?: Array<{
        filename: string,
        content: any,
        contentId?: string
    }>
}

export interface ZeptoEmailDataDTO{
    email: string,
    fromName: string,
    template: string,
    preheaderText?: string,
    code?: string,
    emailTitle: string,
    emailSalute: string,
    bodyOne: string,
    bodyTwo?: string,
    bodyThree?: string,
    loginEmail?: string,
    loginPassword?: string,
    buttonUrl?: string,
    buttonText?: string,
    eventTitle?: string,
    eventDescription?: string,
    startDate?: string,
    endDate?: string,
    count?: number,
    transaction?:{
        description: string,
        reference: string,
        amount: string,
        fee: string,
        status: string,
        stamp?: string,
        date: string,
        balance?: string,
        paymentName?: string,
        token?: string
    },
    chargeback?:{
        level: string,
        reference: string,
        amount: string,
        status: string,
        date: string
    },
    attachments?: Array<{
        filename: string,
        content: any,
        contentId?: string
    }>
}

export interface SendEmailDTO{
    email?: string,
    business: IBusinessDoc,
    account?: IAccountDoc,
    wallet?: IWalletDoc, 
    driver: EmailDriver,
    transaction?: ITransactionDoc,
    chargeback?: IChargebackDoc,
    code?: string,
    template?: string,
    options?: {
        subject?: string,
        salute?: string,
        startDate?: string,
        endDate?: string,
        count?: number,
        buttonUrl?: string,
        buttonText?: string,
        bodyOne?: string,
        bodyTwo?: string,
        bodyThree?: string,
        otpType?: string,
        reason?: string
    },
    attachments?: Array<{
        filename: string,
        content: any,
        contentId?: string
    }>
}