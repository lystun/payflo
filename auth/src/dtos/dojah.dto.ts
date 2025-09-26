export type DojahWebhookService = 'sms' | 'ngn_wallet' | 'kyc_widget' | 'address' | 'AML Monitoring';

export interface DojahLookupBVNDTO{
    bvn: string,
    firstName?: string,
    lastName?: string,
    dob?: string
}

export interface DojahValidateWebhookDTO{
    signature: any,
    payload: any
}

export interface DojahLookupNINDTO{
    nin: string,
    firstName?: string,
    lastName?: string,
    dob?: string
}

export interface DojahLookupCACDTO{
    rcNumber: string,
    companyName?: string
}

export interface DojahSubscribeToWebhookDTO{
    webhookUrl: string,
    service: DojahWebhookService
}

export interface MapDojahResponseDTO{
    type: 'error' | 'success', 
    payload: any
}

export interface DojahRequestDTO{
    bvn?: string,
    nin?: string,
    first_name?: string,
    last_name?: string,
    dob?: string,
    webhook?: string,
    service?: string,
    rc_number?: string,
    company_name?: string;
}

export interface DojahAPIResponseDTO{
    entity: {
        bvn: string,
        date_of_birth: string,
        first_name: string,
        last_name: string,
        gender: string,
        image: string,
        middle_name: string,
        phone_number1: string,
        phone_number2: string,
        phone_number: string,
        customer: string,
        status: string | number,
        rc_number: string,
        company_name: string,
        address: string,
        date_of_registration: string,
        photo: string
    }
}