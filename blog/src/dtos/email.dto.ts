import { IUserDoc, EmailDriver, VerifyOTPType, ISubscriberDoc } from "../utils/types.util";

export interface SendgridEmailDataDTO{
    title?:string,
    email: string,
    fromName: string,
    template: string,
    preheaderText?: string,
    code?: string,
    emailTitle: string,
    emailSalute: string,
    bodyOne: string,
    bodyTwo?: string,
    loginEmail?: string,
    loginPassword?: string,
    buttonUrl?: string,
    buttonText?: string,
    eventTitle?: string,
    eventDescription?: string,
    startDate?: string,
    endDate?: string,
    sections?: Array<any>,
    createdAt?: string,
    isHandlebar?: boolean
}

export interface SendEmailDTO{
    user: IUserDoc,
    driver: EmailDriver,
    code?: string,
    template?: string,
    options?: {
        subject?: string,
        buttonUrl?: string,
        buttonText?: string,
        emailBody?: string,
        emailBodies?: Array<string>,
        otpType?: VerifyOTPType,
    }
}

export interface SendCampainEmailDTO{
    driver: EmailDriver,
    code: string,
    template?: string,
    title: string,
    sections: Array<any>,
    createdAt: string,
    subber?: ISubscriberDoc,
    guest?: string,
    subject: string
    buttonUrl?: string,
    buttonText?: string,
    isHandlebar: boolean
}