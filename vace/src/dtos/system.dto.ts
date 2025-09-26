import { LogType } from "../utils/types.util";

export interface LogRequestDTO{
    className?: string,
    type?: LogType
}

export interface GenerateQRCodeDTO{
    qrData: string,
    options?: {
        errorCorrection?: string,
        type?: string,
        quality?: number,
        margin?: number,
        width?: number,
        color?: {
            dark?: string,
            light?: string
        }
    }
}

export interface CreateHashDataDTO{
    type: 'sha512' | 'sha256',
    payload: string | object
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