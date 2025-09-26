import { APIMethodType } from "../utils/types.util";

export interface CallAxiosDTO {
    method: APIMethodType,
    path: string,
    body?: any,
    headers: object
}