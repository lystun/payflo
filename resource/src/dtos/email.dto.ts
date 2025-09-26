import { EmailDriver, VerifyOTPType } from "../utils/types.util";


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
    loginEmail?: string,
    loginPassword?: string,
    buttonUrl?: string,
    buttonText?: string,
    eventTitle?: string,
    eventDescription?: string,
    startDate?: string,
    endDate?: string,
}

export interface SendEmailDTO{
    user: any,
    driver: EmailDriver,
    code?: string,
    options?: {
        subject?: string,
        buttonUrl?: string,
        buttonText?: string,
        emailBody?: string,
        emailBodies?: Array<string>,
        otpType?: VerifyOTPType,
    }
}