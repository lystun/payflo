import { IUserDoc } from "../utils/types.util";

export interface CreateDeviceDTO{
    user: IUserDoc,
    source: string
}