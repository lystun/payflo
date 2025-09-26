import { IBusinessBank, IBusinessSocial, IInvoiceItem, IInvoiceRecipient, IInvoiceSummary, IInvoiceVAT } from "../utils/types.util"

export interface MappedBusinessDetailsDTO {
    tier: string,
    name: string,
    email: string,
    phoneNumber: string,
    officialEmail: string,
    profile: string,
    staffStrength: string,
    industry: string,
    category: string,
    logo: string,
    cover: string,
    socials: Array<IBusinessSocial>
    dailyTransaction: {
        label: string,
        limit: number
    },
    country: {
        name: string,
        code: string,
        phoneCode: string
    },
    location: {
        city: string,
        address: string,
        state: string,
        postalCode: string
    },
    bank: IBusinessBank

}
export interface MappedBankDTO {
    accountName: string,
    accountNo: string,
    name: string;
    code: string;
    country: string;
    currency: string;
    type: string;
}
export interface MappedBeneficiaryDTO {
    code: string,
    accountNo: string,
    accountName: string,
    bankCode: string
    bankName: string
}
interface IWalletAnalyticsDTO {
    inflow: {
        value: number,
        count: number,
        updatedAt: string
    }
    outflow: {
        value: number,
        count: number,
        updatedAt: string
    }
    transfer: {
        value: number,
        count: number,
        updatedAt: string
    }
    withdrawal: {
        value: number,
        count: number,
        updatedAt: string
    }
}
export interface MappedWalletDTO {
    walletID: string,
    currency: string,
    balance: {
        available: number,
        locked: number,
        settlement: number
    },
    analytics: IWalletAnalyticsDTO,
    createdAt: any,
    updatedAt: any
}
export interface MappedCardDTO {
    cardBin: string
    cardLast: string
    expiryMonth: string
    expiryYear: string
    brand: string,
    authCode: string,
    createdAt: string,
    updatedAt: string,
}
export interface MappedTransactionDTO {

    type: string,
    domain: string,
    reference: string;
    merchantRef: string,
    feature: string,
    description: string,
    amount: number
    fee: number,
    vat: number,
    status: string,
    currency: string,
    vasData: {
        type: string
        network: string
        phoneNumber: string
        billerCode: string
        billerName: string,
        hasToken: boolean
        token: string
    },
    customer: {
        firstName: string,
        email: string,
        lastName: string,
        accountNo: string,
        sourceAccount: string,
        city: string,
        state: string,
        phoneNumber: string,
        phoneCode: string,
    },
    bank: {
        name: string,
        accountNo?: string,
        accountName?: string,
        bankCode?: string,
    }
    metadata: Array<any>,
    ipAddress: string,
    card?: MappedCardDTO,
    invoiceCode?: string,
    productCode?: string,
    chargebackCode?: string
    refundCode?: string,
    createdAt: string;
    updatedAt: string;

}
export interface MappedTransferDTO {
    accountName?: string,
    accountNo?: string,
    reference: string,
    amount: number
}
export interface MappedValidateBillerDTO {
    status: boolean,
    currency: string,
    billerCode: string,
    billerItem: {
        itemId: number | string,
        amount: number,
        name: string
    },
    customer: {
        id: string,
        name: string,
        network: string,
        phoneNumber: string
    }
}
export interface MappedValidateTopupDTO {
    status: string,
    reference: string,
    type: string,
    network: string,
    phoneNumber: string,
    billerCode: string,
    billerName: string,
    hasToken: boolean,
    token: string
}
export interface MappedValidateBillDTO {
    reference: string,
    amount: number,
    status: string,
    billerCode: string,
    billerName: string,
    createdAt: string,
    vasType: string,
    token: string,
    customer: {
        id: string,
        name: string,
        network: string,
        phoneNumber: string
    },
    category: {
        mainCategory: string,
        subCategory: string,
        categoryId: string | number,
        name: string
    }
}
export interface MappedProductDTO {
    code: string,
    name: string,
    isEnabled: boolean,
    description: string,
    avatar: string,
    price: number,
    inflow: {
        value: number,
        count: number
    },
    slug: string;
    createdAt: string;
    updatedAt: string;
}
export interface MappedSubaccountDTO {
    code: string,
    name: string,
    isEnabled: boolean,
    description: string,
    phoneNumber: string,
    phoneCode: string,
    email: string,
    inflow: {
        value: number,
        count: number
    },
    split: {
        value: number,
        type: string
    },
    bank: {
        accountNo: string,
        acccountName: string,
        bankCode: string,
        name: string
    }
    slug: string;
    createdAt: string;
    updatedAt: string;
}
export interface MappedInvoiceDTO {
    name: string,
    number: string,
    description: string,
    code: string,
    link: string,
    paymentLink?: string,
    status: string,
    recipient: IInvoiceRecipient
    items: Array<{
        label: string,
        name: string,
        price: number,
        quantity: number,
        total: number
    }>
    isEnabled: boolean,
    VAT: IInvoiceVAT
    dueAt: {
        date: string,
        time: string,
        ISO: string
    },
    issuedAt: {
        date: string,
        time: string,
        ISO: string
    }
    inflow: {
        value: number,
        count: number
    },
    summary: IInvoiceSummary
    createdAt: string;
    updatedAt: string;
}
export interface MappedRefundDTO {
    option: string,
    type: string,
    code: string,
    reason: string,
    status: string,
    bank: {
        accountNo: string,
        accountName: string,
        bankCode: string,
        name: string,
    },
    paidAt: {
        day: string,
        time: string,
        ISO: string
    },
    amount: number,
    transaction?: {
        reference: string,
        amount: number,
        fee: number,
        feature: string,
        createdAt: string
    };
    createdAt: string;
    updatedAt: string;
}
export interface MappedPaymetLinkDTO {
    link: string,
    slug: string,
    qrcode: string,
    redirectUrl: string
    reuseable: boolean,
    message: string,
    type: string,
    feature: string,
    name: string,
    isEnabled: boolean,
    description: string,
    amount: number,
    totalAmount: number
    options: {
        card: boolean,
        transfer: boolean,
        bank: boolean,
        ussd: boolean,
        bankQR: boolean
    }
    product?: {
        code: string,
        price: number,
        name: string
    },
    invoice?: {
        code: string,
        name: string,
        number: string,
        summary: IInvoiceSummary
    },
    merchantRef?: string
    metadata: Array<any>,
    createdAt: string;
    updatedAt: string;
}