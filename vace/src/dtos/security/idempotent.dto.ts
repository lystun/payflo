
export interface StoreRequestKeyDTO{
    payload: any,
    key: string,
    user: any,
    transaction: any
}

export interface CheckRequestKeyDTO{
    payload: any,
    key: string,
    user: any
}

export interface CheckRequestTimeDTO{
    type: 'payload-time' | 'user-time'
    payload: any,
    user: any,
}