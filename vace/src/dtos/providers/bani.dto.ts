export type BaniWebhookEvent = 'payin_mobile_money' | 'payin_bank_transfer' | 'payout' | 'payout_reversal' | 'collection_service_status' | 'vas_completed' | 'vas_failed';

export interface MapBaniResponseDTO {
    type: 'success' | 'error',
    payload: any
}

export interface BaniRequestDTO {
    customer_first_name?: string;
    customer_last_name?: string;
    customer_phone?: string;
    customer_email?: string;
    customer_address?: string;
    customer_state?: string;
    customer_city?: string;
    alternate_name?: string,
    bank_name?: string,
    pay_va_step?: string;
    country_code?: string;
    pay_currency?: string;
    holder_account_type?: string;
    customer_ref?: string;
    pay_ext_ref?: string;
    pay_ref?: string;
    customer_note?: string;
    customer_name_only?: boolean,
    payout_step?: string,
    receiver_currency?: string,
    receiver_amount?: string,
    transfer_method?: string,
    transfer_receiver_type?: string,
    receiver_account_num?: string,
    receiver_country_code?: string,
    receiver_account_name?: string,
    receiver_sort_code?: string,
    sender_amount?: string,
    sender_currency?: string,
    transfer_ext_ref?: string,
    transfer_note?: string,
    list_code?: string,
    bank_code?: string,
    account_number?: string,
    customer_phone_number?: string,
    amount?: number,
    network?: string,
    transaction_ext_ref?: string,
    narration?: string
    phone_network_name?: string,
    data_id?: number,
    biller_category_id?: number
    biller_item_id?: number,
    biller_customer_item?: string,
    biller_item_amount?: number,
    biller_currency?: string
    customer_name?: string,
    customer_biller_code?: string,
    customer_biller_name?: string,
    transaction_ref?: string,
    biller_sub_category_name?: string,
    holder_legal_number?: string,
    pay_amount?: number
}

export interface BaniResponseDTO {
    message: string,
    status: boolean | string,
    status_code: number,
    payment_reference: string,
    holder_account_number: number | string,
    holder_bank_name: string,
    amount: number,
    payment_ext_reference: string,
    account_type: string,
    account_name: string,
    custom_data: any,
    customer_ref: string,
    bank_logo: string,
    transfer_ext_ref: string,
    payout_ref: string,
    list_code: string,
    bank_code: string,
    country_code: string,
    account_number: string,
    bank_name: string,
    biller_currency: string,
    biller_sub_category_name: string,
    customer_validation_required: boolean,
    amount_validation_required: boolean,
    has_biller_item_details: boolean,
    biller_category_name: string,
    biller_category_id: number,
    biller_item_details: {
        biller_item_name: string,
        biller_item_amount: string,
        biller_item_id: number
    },
    biller_item_id: number,
    data_bundle: string,
    data_validity: string,
    data_amount: string,
    data_currency: string,
    data_network: string,
    data_id: number,
    vas_code: string,
    biller_customer_item: string,
    customer_name: string,
    biller_item_amount: string,
    customer_biller_code: string,
    customer_biller_name: string,
    vas_type: string,
    customer_phone_number: string,
    currency: string,
    transaction_ext_ref: string,
    customer_phone_network: string,
    transaction_status: string,
    main_category: string,
    sub_category: string,
    biller_extra_info: string,
    vas_item_name: string,
    transaction_ref: string,
    pub_date: string
}

export interface BaniPaymentBanksDTO {
    countryCode: string
}


export interface CreateBaniCustomerDTO {
    firstName: string,
    lastName: string,
    phoneNumber: string,
    email: string,
    address: string,
    state: string,
    city: string,
    note?: string
}

export interface GenerateBaniAccountDTO {
    step: string;
    countryCode: string;
    currency: string;
    accountType: 'temporary' | 'permanent';
    customerRef: string;
    amount?: number,
    reference: string;
    nameOnly: boolean,
    accountName?: string,
    bvnNumber?: string
    bankName?: string
}

export interface VerifyBaniWebookDTO {
    baniHook: any,
    body: Buffer,
}

export interface BaniVerifyStatusDTO {
    reference?: string,
    providerRef?: string
}

export interface BaniTransactionDTO {

    pay_ref: string,
    pay_ext_ref: string,
    holder_first_name: string,
    holder_last_name: string,
    custom_data: any,
    pay_amount: string,
    pay_method: string,
    holder_phone: any,
    holder_phone_carrier: string,
    till_number: string,
    order_details: any,
    holder_currency: string,
    holder_country_code: string,
    pay_status: string,
    pub_date: string,
    modified_date: string,
    merch_currency: string,
    merch_amount: string,
    holder_account_number: string,
    holder_bank_name: string,
    pay_amount_collected: string,
    pay_amount_outstanding: string

}

export interface BaniWebhookDataDTO {
    event: BaniWebhookEvent,
    data: {
        pay_ref: string,
        pay_ext_ref: string,
        payment_ext_reference: string,
        holder_first_name: string,
        holder_last_name: string,
        custom_data: any,
        amount: string,
        pay_amount: number,
        pay_method: string,
        holder_phone: string,
        holder_phone_carrier: string,
        order_details: any,
        holder_currency: string,
        holder_country_code: string,
        pay_status: string,
        holder_account_number: string,
        pub_date: string,
        modified_date: string,
        holder_bank_name: string,
        customer_ref: string,
        merch_currency: string,
        merch_amount: number,
        pay_amount_collected: number,
        pay_amount_outstanding: string,
        holder_account_type: string,
        transaction_ref: string,
        transaction_reference: string,
        is_done: boolean,
        source_account_name: string,
        actual_amount_paid: number,
        narration: string,
        va_perm_type: string,
        biller_customer_item: string,
        customer_biller_code: string,
        customer_biller_name: string,
        vas_type: string,
        customer_phone_number: string,
        currency: string,
        transaction_ext_ref: string,
        customer_phone_network: string,
        transaction_status: string,
        main_category: string,
        sub_category: string,
        biller_extra_info: string,
        vas_item_name: string,
        fiat_amount: string,
        coin_amount: string,
        payout_details: {
            payout_method: string,
            receiver_amount: string,
            receiver_phone: string,
            receiver_sort_code: number,
            payout_status: string,
            payout_ref: string,
            payout_ext_ref: string,
            payout_receiver_type: string,
            receiver_account_name: string,
            receiver_account_num: string,
            receiver_account_type: string,
            receiver_address: string,
            receiver_bank_name: string,
            receiver_city: string,
            receiver_currency: string,
            receiver_personal_num: string,
            receiver_postcode: string,
            receiver_state: string,
            receiver_country_code: string,
            receiver_bank_branch: string,
            receiver_first_name: string,
            receiver_last_name: string,
            pub_date: string,
            modified_date: string,
            is_beneficiary: boolean
        }
    }
}

export interface ProcessBaniWebhookDTO {
    payload: BaniWebhookDataDTO;
}

export interface BankTransferWithBaniDTO {
    amount: number,
    receiverType: 'personal' | 'company',
    accountNo: string,
    accountName: string,
    bankCode: string,
    currency: string,
    reference: string,
    narration: string,
}

export interface VerifyBaniNubanDTO {
    listCode: string,
    bankCode: string,
    countryCode: string,
    accountNo: string
}
export interface BuyAirtimeWithBaniDTO {
    phoneNumber: string,
    network?: string,
    amount: number,
    reference: string,
    narration: string
}
export interface BuyDataWithBaniDTO {
    phoneNumber: string,
    amount: number,
    dataId: number,
    reference: string,
    narration: string,
}
export interface ValidateBillerWithBaniDTO {
    itemId: number,
    customerItem: string,
    amount: number,
    currency?: string,
}

export interface ValidateBaniBillDTO {
    reference?: string,
    vaceRef: string
}
export interface PayBillsDTO {
    itemId: number,
    customerId: string,
    billerId: string,
    amount: number,
    phoneNumber: string,
    phoneCode: string,
    pin: string,
    type: string,
    addons?: Array<string>
    reference?: string
}
export interface PayBillsWithBaniDTO {
    itemId: number,
    customerItem: string,
    amount: number,
    billerCode?: string,
    customerName?: string,
    phoneNumber?: string,
    reference: string,
    narration: string,
}

export interface ListBaniMobileDataDTO {
    countryCode: string,
    network: string
}



