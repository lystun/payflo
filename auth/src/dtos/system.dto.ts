import { LogType } from "../utils/types.util";

export interface LogRequestDTO{
    className?: string,
    type?: LogType
}

export interface UpdateNotificationsDTO{
    sms: boolean,
    email: boolean,
    push: boolean,
    dashboard: boolean
}

export interface TestSMSDTO{
    phoneNumber: string,
    driver: string,
    message: string
}

export interface EncryptDataDTO{
    payload: any,
    password: string,
    separator: string
}

export interface DecryptDataDTO{
    payload: any,
    password: string,
    separator: string
}