import { IUserDoc, EmailDriver, VerifyOTPType } from "../utils/types.util";


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
    password?: string,
    buttonUrl?: string,
    buttonText?: string,
    eventTitle?: string,
    eventDescription?: string,
    startDate?: string,
    endDate?: string
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
    password?: string,
    buttonUrl?: string,
    buttonText?: string,
    eventTitle?: string,
    eventDescription?: string,
    startDate?: string,
    endDate?: string
}

export interface SendEmailDTO{
    user: IUserDoc,
    driver: EmailDriver,
    template?: string,
    code?: string,
    metadata?:any,
    options?: {
        subject?: string,
        salute?: string,
        buttonUrl?: string,
        buttonText?: string,
        emailBody?: string,
        emailBodies?: Array<string>,
        bodyOne?: string,
        bodyTwo?: string,
        bodyThree?: string,
        otpType?: VerifyOTPType,
        status?: string
    }
}