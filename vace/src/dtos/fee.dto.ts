import { IBusinessDoc, IProviderDoc, ISettingDoc } from "../utils/types.util";

export interface MapBusinessFeeDTO{
    provider: IProviderDoc,
    settings: ISettingDoc,
    type: string,
    category: string
}