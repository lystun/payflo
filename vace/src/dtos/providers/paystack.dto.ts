export type PaystackWebhookEvent = 'charge.success' | 'charge.failed' | 'refund.failed' | 'refund.pending' | 'refund.processed' | 'refund.processing' ;

export interface MapPSKResponseDTO{
    type: 'success' | 'error',
    payload: any
}

export interface ProcessPaystackWebhookDTO{
    hash: string,
    signature: string,
    payload: PaystackWebhookResponseDTO
}

export interface PaystackResponseDTO{
    url: string,
    bin: string,
    brand: string,
    sub_brand: string,
    country_code: string,
    country_name: string,
    card_type: string,
    bank: string,
    currency: string,
    linked_bank_id: number,
    id: number,
    domain: string,
    status: string,
    reference: string,
    receipt_number: string,
    amount: number,
    message: string,
    gateway_response: string,
    paid_at: string,
    created_at: string,
    channel: string,
    ip_address: string,
    metadata: any,
    log: any,
    fees: number,
    fees_split: string,
    authorization: {
        authorization_code: string,
        bin: string,
        last4: string,
        exp_month: string,
        exp_year: string,
        channel: string,
        card_type: string ,
        bank: string,
        country_code: string,
        brand: string,
        reusable: boolean,
        signature: string,
        account_name: string
    },
    customer: {
        id: number,
        first_name: string,
        last_name: string,
        email: string,
        customer_code: string,
        phone: string,
        metadata: string,
        risk_action: string,
        international_format_phone: string
    },
    plan: any,
    split: any,
    order_id: string,
    paidAt: string,
    createdAt: string,
    requested_amount: number,
    pos_transaction_data: any,
    source: any,
    fees_breakdown: any,
    transaction_date: string,
    plan_object: any,
    subaccount: any
}

export interface PaystackWebhookResponseDTO{
    event: PaystackWebhookEvent,
    data: {
        currency: string,
        id: number,
        domain: string,
        status: string,
        reference: string,
        receipt_number: string,
        amount: number,
        message: string,
        gateway_response: string,
        paid_at: string,
        created_at: string,
        channel: string,
        ip_address: string,
        metadata: any,
        log: any,
        fees: number,
        fees_split: string,
        authorization: {
            authorization_code: string,
            bin: string,
            last4: string,
            exp_month: string,
            exp_year: string,
            channel: string,
            card_type: string ,
            bank: string,
            country_code: string,
            brand: string,
            reusable: boolean,
            signature: string,
            account_name: string
        },
        customer: {
            id: number,
            first_name: string,
            last_name: string,
            email: string,
            customer_code: string,
            phone: string,
            metadata: string,
            risk_action: string,
            international_format_phone: string
        },
        plan: any,
        split: any,
        order_id: string,
        paidAt: string,
        createdAt: string,
        requested_amount: number,
        pos_transaction_data: any,
        source: {
            type: string,
            source: string,
            entry_point: string,
            identifier: any
        },
        fees_breakdown: any,
        transaction_date: string,
        plan_object: any,
        subaccount: any
    }
}
