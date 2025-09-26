import { ISettingDoc, IUserDoc } from "../utils/types.util"

export interface DecodeAPIKeyDTO{
    apikey: string,
    type: 'secret' | 'public'
}
export interface CheckDomainDTO{
    user: IUserDoc,
    settings: ISettingDoc
}
export interface AccountActiveDTO{
    user: IUserDoc,
    settings: ISettingDoc
}
export interface FireAuthChecksDTO{
    type: 'protect' | 'authorize',
    apiKey: boolean,
    user: IUserDoc,
    settings: ISettingDoc
}
export interface MatchPasswordDTO {
    user: IUserDoc,
    password: string
}