import { IBusinessDoc } from "../utils/types.util";

export interface CreateProductDTO{
    business: IBusinessDoc,
    name: string,
    code?: string,
    description?: string,
    price: number,
    avatar?: string,
    isLink: boolean
}

export interface UpdateProductDTO{
    name?: string,
    description?: string,
    price?: number,
    avatar?: string
}

export interface FilterProductDTO{
    business?: IBusinessDoc,
    isEnabled?: string,
}