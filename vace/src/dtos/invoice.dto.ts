import { IBusinessDoc, IInvoiceItem, IInvoiceVAT, IPaymentLinkDoc } from "../utils/types.util";

export interface FilterInvoiceDTO{
    business?: IBusinessDoc,
    isEnabled?: string,
    status?: string
}

export interface CreateInvoiceDTO{
    business: IBusinessDoc,
    description: string,
    partial: number,
    name: string,
    number: string,
    dueAt: string,
    vat: {
        type: string,
        title: string,
        value: number
    },
    recipient: {
        type: string,
        businessName: string,
        firstName: string,
        lastName: string,
        email: string,
        phoneNumber: string,
        phoneCode: string,
        countryCode: string,
        address: string,
        city: string,
        state: string
    }
    items: Array<InvoiceItemDTO>
    isLink: boolean
}


export interface InvoiceItemDTO{
    label: string,
    name: string,
    price: number,
    quantity: number
}

export interface CalculateSummaryDTO{
    items: Array<IInvoiceItem>
    VAT: IInvoiceVAT,
    partial: number,
}

export interface CalculateVATDTO{
    subtotal: number,
    VAT: IInvoiceVAT
}

export interface InvoiceExistsDTO{
    business: IBusinessDoc,
    name?: string,
    number?: string,
    check: 'name' | 'number'
}

export interface CreateInvoiceRequestDTO{
    description: string,
    partial: number,
    name: string,
    number: string,
    dueAt: string,
    vat: {
        type: string,
        title: string,
        value: number
    },
    recipient: {
        type: string,
        businessName: string,
        firstName: string,
        lastName: string,
        email: string,
        phoneNumber: string,
        phoneCode: string,
        countryCode: string,
        address: string,
        city: string,
        state: string
    }
    items: Array<InvoiceItemDTO>
    isLink: boolean
}

export interface UpdateInvoiceDTO{
    description: string,
    partial: number,
    name: string,
    number: string,
    dueAt: string,
    vat: {
        type: string,
        title: string,
        value: number
    },
    recipient: {
        type: string,
        businessName: string,
        firstName: string,
        lastName: string,
        email: string,
        phoneNumber: string,
        phoneCode: string,
        countryCode: string,
        address: string,
        city: string,
        state: string
    }
    items: Array<InvoiceItemDTO>,
   
}