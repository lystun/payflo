import { ObjectId, Document, Model } from 'mongoose'

export type LogType = 'info' | 'warning' | 'error' | 'success' | 'any';
export type PTAccountType = 'permanent' | 'temporary';
export type SDAccountType = 'static' | 'dynamic';
export type EmailDriver = 'sendgrid' | 'aws' | 'mailtrap' | 'zepto';
export type VerifyOTPType = 'register' | 'password-reset' | 'change-password' | 'login' | 'gneric'
export type AuditType = 'undefined' | 'error' | 'success';
export type ExtractLatest = 'business' | 'plan';
export type SubStatus = 'active' | 'inactive' | 'none';
export type ProviderType = 'bani' | 'paystack' | 'payaza' | 'ninepsb' | 'netmfb' | 'mono' | 'onafriq' | 'interswitch' | 'unified' | 'blusalt';
export type ConfigProviderType = 'bank' | 'card' | 'bills' | 'verve' | 'master' | 'visa' | 'directpay' | 'allcard';
export type TransactionType = 'default' | 'credit' | 'debit';
export type ConditionSplitType = 'percentage' | 'flat';
export type TransactionFeature = 'bank-account' | 'bank-settlement' | 'bank-transfer' | 'wallet-transfer' | 'wallet-withdraw' | 'wallet-vas' | 'wallet-airtime' | 'wallet-data' | 'wallet-bill' | 'wallet-refund' | 'api-refund' | 'wallet-reversal' | 'wallet-chargeback' | 'payment-link' | 'internal-credit' | 'internal-debit' | 'internal-transfer';
export type InternalProcessType = 'internal-wallet' | 'internal-funding';
export type WebhookEvent = 'payin.success' | 'payin.failed' | 'payin.link.success' | 'payin.link.failed' | 'payout.success' | 'payout.failed' | 'vas.success' | 'vas.failed' | 'refund.success' | 'refund.failed' | 'chargeback.success' | 'chargeback.failed';
export type WebhookStatus = 'success' | 'failed' | 'processed';
export type APIMethodType = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface IBankDoc extends Document {

    accountName: string,
    accountNo: string,
    name: string;
    legalName: string,
    code: string;
    platformCode: string,
    isEnabled: boolean;
    country: string;
    currency: string;
    type: string;
    slug: string;
    providers: Array<IBankProvider>

    business: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // props
    findByCode(code: string): IBankDoc;
}

export interface IUserDoc extends Document {

    firstName: string;
    lastName: string;
    middleName: string;
    avatar: string;
    userId: ObjectId;
    savedPassword: string,
    email: string;
    phoneNumber: string;
    phoneCode: string
    userType: string;
    businessType: string;
    identity: {
        basic: string,
        ID: string,
        face: string,
        address: string,
        bvn: string,
        kyb: string,
        kyc: string,
        ninLimit: number,
        bvnLimit: number
    },
    security: IQuestion,
    cacData: ICACData,
    bvnData: IBvnData,
    ninData: INinData
    slug: string;

    apiKey: IAPIKey
    keys: Array<IAPIKey>
    webhook: IWebhook,
    roles: Array<ObjectId | any>
    permissions: Array<IUserPermission>

    // relationsships
    business: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAllUsers(): IUserDoc

}

export interface IUserPermission {
    entity: string,
    actions: Array<string>
}

export interface IQuestion {
    label: string,
    question: string,
    answer: string,
    isSubmitted: boolean
}

export interface IBvnData {
    firstName: string,
    lastName: string,
    middleName: string,
    phoneNumber: string,
    dob: string,
    gender: string,
    customer: string
}

export interface INinData {
    firstName: string,
    lastName: string,
    middleName: string,
    phoneNumber: string,
    gender: string,
    customer: string,
    photo: string
}

export interface ICACData {
    rcNumber: string,
    companyName: string,
    address: string,
    regDate: string,
}

export interface IAPIKey {
    secret: string,
    public: string,
    token: string,
    publicToken: string,
    domain: string,
    isActive: boolean,
    updatedAt: string
}

export interface IWebhook {
    url: string,
    header: string,
    domain: string,
    isActive: boolean,
    createdAt: string
}

export interface ICustomerDoc extends Document {

    code: string,
    customerID: string,
    firstName: string,
    lastName: string,
    email: string,
    phoneNumber: string,
    phoneCode: string,
    country: string

    shippings: Array<ObjectId | any>
    slug: string;

    // relationsships
    user: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAll(): ICustomerDoc

}

export interface IBusinessDoc extends Document {

    tier: string,
    merhcantID: string,
    dailyTransaction: {
        limit: number,
        label: string
    },
    legal: {
        bvnNumber: string,
        ninNumber: string
    }
    emailCode: string | undefined,
    emailCodeExpire: Date | number | undefined,
    transactionPin: string,
    code: string,
    businessID: string,
    owner: IBusinessOwner,
    name: string,
    email: string,
    phoneNumber: string,
    phoneCode: string,
    officialEmail: string,
    businessType: string,
    displayName: string,
    description: string,
    profile: string,
    staffStrength: string,
    industry: string,
    category: string,
    location: {
        address: string,
        city: string,
        state: string,
        postalCode: string,
        country: {
            id: ObjectId | any,
            name: string,
            code2: string,
            phoneCode: string
        }
    },
    onboard: {
        step: number
        stage: string
    },
    card: ObjectId | any
    cards: Array<ObjectId | any>
    logo: string,
    cover: string,
    socials: Array<IBusinessSocial>,
    bank: IBusinessBank,
    banks: Array<ObjectId | any>,
    slug: string;

    // relationsships
    user: ObjectId | any;
    settings: ObjectId | any;
    accounts: Array<ObjectId | any>,
    transactions: Array<ObjectId | any>,
    products: Array<ObjectId | any>
    refunds: Array<ObjectId | any>
    wallet: ObjectId | any;
    beneficiaries: Array<ObjectId | any>,
    payments: Array<ObjectId | any>;
    invoices: Array<ObjectId | any>;
    subaccounts: Array<ObjectId | any>;
    settlements: Array<ObjectId | any>;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAllBusinesses(): IBusinessDoc

}

export interface IBusinessOwner {
    firstName: string,
    middleName: string,
    lastName: string,
    name: string,
    dob: string,
    nationality: string
    idCard: string,
    utilityDoc: string,
    address: string,
    bvn: string
}

export interface IProviderDoc extends Document {

    type: string,
    name: string,
    bankProvider: boolean,
    billsProvider: boolean,
    cardProvider: boolean,
    verveProvider: boolean,
    masterProvider: boolean,
    debitProvider: boolean,
    visaProvider: boolean,
    legalName: string,
    code: string,
    description: string,
    fee: {
        percent: number,
        flat: number,
        capped: number
    }
    vaceInflow: IVaceFee,
    vaceOutflow: IVaceFee,
    offers: IProviderOffer
    slug: string,
    isEnabled: boolean

    // relationships
    user: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getProviders(): IProviderDoc

}

export interface IVaceFee {
    chargeFee: boolean,
    type: string
    capped: number,
    markup: number,
    value: number,
    providerFee: number
    providerMarkup: number,
    providerCap: number,
    stampDuty: number
}

export interface IBusinessCharge {
    chargeFee: boolean,
    type: string
    capped: number,
    markup: number,
    value: number,
    providerFee: number
    providerMarkup: number,
    providerCap: number
    vatType: string
    vatValue: number,
    stampDuty: number
}

export interface IFeeCharged {
    fee: number
    providerFee: number
    vat: number,
    revenue: number,
    settlement: number,
    stampFee: number
}

export interface IProviderOffer {
    card: boolean,
    bankTransfer: boolean,
    mobileMoney: boolean,
    eWallet: boolean,
    ussd: boolean,
    crypto: boolean,
    ngResolve: boolean,
    gbResolve: boolean,
    phoneResolve: boolean,
    banks: boolean,
    banking: boolean,
    refund: boolean,
    chargeback: boolean,
    kyc: boolean,
    QRCode: boolean,
    bills: boolean,
    directDebit: boolean
}

export interface IWalletDoc extends Document {

    walletID: string,
    currency: string,
    email: string,
    balance: {
        available: number,
        locked: number,
        settlement: number,
        ledger: number,
        paystack: number
    }
    inflow: {
        value: number,
        count: number,
        updatedAt: string
    }
    reversal: {
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
    slug: string

    // relationships
    transactions: Array<ObjectId | any>
    business: ObjectId | any;
    account: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getWallets(): IWalletDoc

}

export interface ITransactionDoc extends Document {

    type: string,
    reference: string;
    feature: string,
    providerRef: string,
    providerName: string,
    description: string,
    amount: number
    unitAmount: number,
    fee: number
    unitFee: number,
    vatFee: number
    unitVatFee: number,
    stampFee: number
    unitStampFee: number,
    productQty: number,
    revenue: {
        amount: number
        unitAmount: number,
        reversed: number,
        unitReversed: number,
    },
    refundData: {
        refundType: string,
        amount: number
    }
    partialAmount: {
        collected: number,
        unitCollected: number,
        outstanding: number,
        unitOutstanding: number
    }
    status: string,
    narration: string,
    settle: {
        destination: string
        status: string
        settledAt: any,
        amount: number
    },
    merchantRef: string,
    currency: string,
    vasData: {
        ref: string,
        type: string
        network: string
        phoneNumber: string
        billerCode: string
        billerName: string,
        hasToken: boolean
        token: string
    },
    customer: {
        ref: string,
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
        expire?: {
            hours: number,
            minutes: number,
            date: string
        },
        logo?: string,
        accountType?: string,
        bankCode?: string,
        platformCode?: string,
        bankId?: string
    }
    ipAddress: string,
    providerData: any,
    webhook: {
        enabled: boolean,
        event: string,
        sessionId?: string,
        isSent?: boolean
    },
    balance: {
        initial: number,
        final: number
    },
    metadata: Array<any>
    channel: string,
    source: string,
    slug: string

    // relationships
    business: ObjectId | any;
    wallet: ObjectId | any;
    provider: ObjectId | any;
    payment: ObjectId | any;
    product: ObjectId | any;
    invoice: ObjectId | any;
    settlement: ObjectId | any;
    chargeback: ObjectId | any,
    refunds: Array<ObjectId | any>;
    refund: ObjectId | any;
    linkedTransaction: ObjectId | any;
    subaccount: ObjectId | any;
    card: ObjectId | any,

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getTransactions(): ITransactionDoc

}

export interface IAccountDoc extends Document {

    code: string,
    currency: string,
    accountNo: string,
    accountName: string,
    accountType: string,
    description: string,
    balance: number,
    isEnabled: boolean,
    slug: string,
    limits: Array<IAccountLimit>
    customer: {
        reference: string,
        note: string
    }
    bank: {
        legalName: string
        name: string,
        bankType: string
        bankCode: string,
    }
    providerRef: string,

    // relationships
    business: ObjectId | any;
    provider: ObjectId | any;
    wallet: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getProviders(): IProviderDoc

}

export interface IAccountLimit {
    name: string,
    label: string,
    value: number
}

export interface IBusinessBank {
    accountNo: string,
    accountName: string,
    name: string,
    bankCode: string,
    platformCode: string
    updatedAt: any
}

export interface IKYBBank {
    accountNo: string,
    accountName: string,
    details: ObjectId | any
    bankName: string,
    bankCode: string
}

export interface IBusinessSocial {
    name: string,
    url?: string,
    username?: string,
    description?: string
}

export interface IBeneficiaryDoc extends Document {

    isEnabled: boolean,
    code: string,
    accountNo: string,
    accountName: string,
    bank: {
        bankId: string
        bankCode: string,
        platformCode: string,
        name: string
        legalName: string
    },
    providers: Array<IBankProvider>
    slug: string

    business: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAll(): Array<IBeneficiaryDoc>

}

export interface IProductDoc extends Document {

    analytics: any,
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

    // relationships
    business: ObjectId | any;
    payments: Array<ObjectId | any>;
    transactions: Array<ObjectId | any>;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getProducts(): IProductDoc

}

export interface ISubaccountDoc extends Document {

    analytics: any,
    code: string,
    name: string,
    isEnabled: boolean,
    description: string,
    phoneNumber: string,
    phoneCode: string,
    email: string,
    split: {
        type: string,
        value: number,
    },
    bank: {
        accountNo: string,
        accountName: string,
        bankCode: string,
        name: string,
        platformCode: string,
        legalName: string
    },
    inflow: {
        value: number,
        count: number
    },
    slug: string;

    // relationships
    business: ObjectId | any;
    transactions: Array<ObjectId | any>;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getSubaccounts(): Array<ISubaccountDoc>

}

export interface IPaymentLinkDoc extends Document {
    analytics: {
        amount: number,
        totalAmount: number,
        revenue: number,
        vat: number,
        providerFee: number,
        count: number,
        today: number
    },
    link: string,
    qrcode: string,
    redirectUrl: string
    message: string,
    type: string,
    feature: string,
    name: string,
    isEnabled: boolean,
    description: string,
    amount: number,
    totalAmount: number
    slug: string;
    initialized: boolean,
    initializeRef: string,
    reuseable: boolean,
    metadata: Array<any>,
    options: {
        card: boolean,
        transfer: boolean,
        bank: boolean,
        ussd: boolean,
        bankQR: boolean
    },
    customer: {
        email: string,
        firstName?: string,
        lastName?: string,
        phoneNumber?: string,
        phoneCode?: string
    }

    // relationships
    business: ObjectId | any;
    product: ObjectId | any;
    invoice: ObjectId | any;
    transactions: Array<ObjectId | any>;
    subaccounts: Array<ObjectId | any>

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getPaymentLinks(): IPaymentLinkDoc

}

export interface IChargeCard {
    cvv: string,
    number: string,
    expMonth: string,
    expYear: string
}

export interface ISubscriptionTrial {
    hasEnded: boolean,
    hasStarted: boolean,
    dueDate: string,
}

export interface ICardDoc extends Document {

    cardHolder: string,
    cardBin: string;
    cardLast: string;
    expiryMonth: string;
    expiryYear: string;
    cardType: string,
    brand: string,
    authCode: string,
    cardData: string,
    countryCode: string
    currency: string,
    country: string,
    redirectUrl: string
    slug: string;
    authorization: {
        token: string,
        authCode: string,
        step: string,
        extUrl: string
    },
    metadata: {
        reference: string,
        status: string
    },

    //relationships
    business: ObjectId | any;
    transaction: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAll(): Array<ICardDoc>

}

export interface IInvoiceDoc extends Document {

    name: string,
    number: string,
    description: string,
    code: string,
    link: string,
    status: string,
    recipient: IInvoiceRecipient
    items: Array<IInvoiceItem>
    isEnabled: boolean,
    slug: string,
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

    //relationships
    business: ObjectId | any;
    payment: ObjectId | any;
    transactions: Array<ObjectId | any>;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAll(): Array<IInvoiceDoc>

}

export interface IInvoiceRecipient {
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

export interface IInvoiceItem {
    label: string
    name: string,
    variant: string,
    price: number,
    quantity: number,
    total: number,
    reduce?: any
}

export interface IInvoiceVAT {
    title: string,
    type: string,
    value: number
}

export interface IInvoiceSummary {
    subtotal: number,
    partialAmount: number,
    totalAmount: number,
    amountPaid: number,
    paidAt: any
}

export interface IRefundDoc extends Document {

    option: string,
    type: string,
    code: string,
    reason: string,
    status: string,
    slug: string,
    bank: {
        accountNo: string,
        accountName: string,
        bankCode: string,
        legalName: string,
        name: string,
        platformCode: string
    },
    paidAt: {
        day: string,
        time: string,
        ISO: string
    },
    amount: number,
    reference: string,
    providerRef: string,

    business: ObjectId | any;
    transaction: ObjectId | any;
    refundedTxn: ObjectId | any;
    provider: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAll(): Array<IRefundDoc>

}

export interface ISettlementHistoryDoc extends Document {

    amountSettled: number,
    amountShared: number,
    currency: string,

    groups: Array<ISettlementLump>
    settledBy: ObjectId | any;
    settlement: ObjectId | any;
    businesses: Array<ObjectId | any>;
    transactions: Array<ObjectId | any>;
    payments: Array<ObjectId | any>;
    subaccounts: Array<ObjectId | any>;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAll(): Array<ISettlementHistoryDoc>

}

export interface IChargebackDoc extends Document {

    amount: number,
    dueDate: string,
    timeline: string,
    providerRef: string,
    reference: string,
    message: string,
    code: string,
    status: string,
    level: string,
    slug: string,
    initiated: {
        date: string,
        time: string,
        ISO: string
    },
    paidAt: {
        date: string,
        time: string,
        ISO: string
    },
    response: {
        message: string,
        evidence: string,
    },
    bank: {
        accountNo: string,
        accountName: string,
        bankCode: string,
        legalName: string,
        name: string,
        platformCode: string
    }
    receipt: string

    business: ObjectId | any;
    transaction: ObjectId | any;
    chargedTxn: ObjectId | any;
    provider: ObjectId | any;
    user: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAll(): Array<IChargebackDoc>

}

export interface ISettlementDoc extends Document {

    code: string,
    description: string,
    totalAmount: number,
    isSettled: boolean,
    isRunning: boolean,
    status: string,
    slug: string
    created: {
        date: string,
        time: string,
        ISO: string,
    }
    updated: {
        date: string,
        time: string,
        ISO: string,
    }
    settledAt: {
        date: string,
        time: string,
        ISO: string,
    }
    lastRunAt: {
        date: string,
        time: string,
        ISO: string,
    }
    payouts: Array<ISettlementPayout>,
    analytics: ISettlementAnalytics
    overview: ISettlementOverview
    groups: Array<ISettlementGroup>

    //relationships
    transactions: Array<ObjectId | any>
    businesses: Array<ObjectId | any>
    subaccounts: Array<ObjectId | any>
    paymentLinks: Array<ObjectId | any>
    histories: Array<ObjectId | any>
    settledBy: ObjectId | any

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAll(): Array<ISettlementDoc>

}

/** for settlement payout */
export interface ISettlementPayout {
    date: any,
    business: ObjectId | any
}

/** for settlement groups */
export interface ISettlementGroup {
    business: ObjectId | any,
    paymentLinks: Array<IGroupPaymentLink>
}

export interface IGroupPaymentLink {
    payment: ObjectId | any,
    subaccounts: Array<IGroupSubaccount>,
    transactions: Array<IGroupTransaction>
}

export interface IGroupTransaction {
    _id: ObjectId | any,
    reference: string,
    amount: number,
    amountToSettle: number,
    fee: number,
    vat: number,
    revenue: number,
}

export interface IGroupSubaccount {
    _id: ObjectId | any,
    payment: ObjectId | any,
    code: string,
    accountNo: string,
    accountName: string,
    bankCode: string,
    bankName: string,
    splitType: string,
    splitValue: number,
    amount: number
}

/** for settlement analytics */
export interface ISettlementAnalytics {
    businesses: number,
    paymentLinks: number,
    subaccounts: number
    transactions: number,
    settled: {
        amount: number,
        shared: number,
        businesses: Array<ObjectId | any>
        subaccounts: Array<ObjectId | any>
    }
    updatedAt: any,
}

export interface ISettlementOverview {
    businesses: number,
    totalAmount: number,
    amount: number,
    totalVat: number,
    revenue: number,
    totalFee: number,
    dueToday: {
        amount: number,
        businesses: number
    },
    pastDue: {
        amount: number,
        businesses: number
    }
}

/** for running settlement */
export interface IGroupPaymentSum {
    payment: ObjectId | any,
    subaccounts: Array<IGroupSubaccount>,
    transactions: Array<IGroupTransaction>
    totalAmount: number,
    totalFee: number,
    totalVat: number,
    totalRevenue: number,
    lumpAmount: number,
    sharedAmount: number,
    amountToSettle: number
}

export interface ISettlementLump {
    business: IBusinessDoc,
    subaccounts: Array<IGroupSubaccount>
    transactions: Array<IGroupTransaction>
    paymentLinks: Array<ObjectId | any>
    linksHasSub: Array<ObjectId | any>
    linksNoSub: Array<ObjectId | any>
    totalAmount: number,
    totalFee: number,
    totalVat: number,
    totalRevenue: number,
    lumpAmount: number,
    sharedAmount: number,
    amountToSettle: number,
    chargebackAmount?: number

}

export interface ISettingDoc extends Document {

    settlement: ISettlementSettings,
    feeInflow: IBusinessCharge,
    feeOutflow: IBusinessCharge,
    cardFee: IBusinessCharge,
    billsFee: IBusinessCharge,
    transferFee: IBusinessCharge,
    inflowFee: IBusinessCharge
    incognito: boolean,
    chargeVat: boolean,
    paymentLink: {
        request: string,
        product: string,
        invoice: string
    },
    invoice:string,
    product:string,
    refund:string,
    wallet: {
        inflow: string,
        outflow: string
    },
    bills: {
        airtime: string,
        data: string,
        cable: string,
        electricity: string
    }
    domain: string,
    account: string

    // relationships
    business: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getSettings(): ISettingDoc

}

export interface ISettlementSettings {
    currency: string,
    label: string,
    days: number,
    nextPayout: any,
    settleInto: string
}

export interface IPagination {
    total: number,
    count: number,
    pagination: {
        next: { page: number, limit: number },
        prev: { page: number, limit: number },
    },
    data: Array<any>
}

export interface IExportResult {
    filename: string,
    filepath: string,
    content: any,
    data: Array<any>,
    gcs: {
        publicUrl: string
    }
}

export interface IResult {
    error: boolean,
    message: string,
    data: any,
    code?: number
}

export interface ISearchQuery {
    model: Model<any>,
    ref: string | null | undefined,
    value: any | null | undefined,
    data: any,
    query: any,
    queryParam: any,
    populate: Array<any>,
    operator: string | null;
}

export interface IPopulateQuery {
    model: Model<any>,
    submodel: Model<any>,
    ref: string,
    value: any,
    path: any,
    queryParam: any,
    populate: Array<any>,
    paginate?: 'absolute' | 'relative'
}

export interface IGeoSearchQuery {
    model: Model<any>,
    ref: string | null | undefined,
    value: any | null | undefined,
    data: any,
    query: {
        address: string,
        location: string,
        minDistance: number,
        maxDistance: number,
        geoData: {
            longitude: number,
            latitude: number
        },
        radius: number
        radiusUnit: string,
        coordinates: Array<any>
    },
    queryParam: any,
    populate: Array<any>,
    operator: string;
}

export interface ISubaccount {
    businessName: string,
    bankCode: string,
    accountNo: string,
    perCharge: number,
    meta: {
        createdOn: any,
        description: string,
        createdBy: any
    }
}

export interface IPayData {
    perPage: string | number,
    page: string,
    customer: string,
    status: string,
    txnId: string,
    email: string,
    amount: number,
    currency: string,
    channels: Array<string>,
    reference: string,
    callbackUrl: string,
    planCode: string,
    invoiceLimit: string,
    metadata: any,
    subaccountCode: string,
    txnCharge: number,
    payBearer: string,
    authCode: string,
    nextStep: string,
    url: string,
    displayText: string,
    type: string,
    statusCode: number,
    accountNo: string,
    bankCode: string,
    merchantName: string,
    description: string,
    source: string,
    recipientCode: string,
    transferCode: string,
    reason: string,
    pin: string,
    otp: string,
    phone: string,
    birthday: string,
    address: string,
    city: string,
    state: string,
    zipCode: string,
    businessName: string,
    perCharge: number,
    bvn: string,
    cardBin: string,
    customerReason: string,
    merchantReason: string,
    planName: string,
    interval: string,
    plan: string,
    planId: string,
    customerCode: string,
    customerId: string,
    startDate: string,
    subId: string,
    subCode: string,
    emailToken: string,
    transferType: string,
    country: 'nigeria' | 'ghana',
    useCursor: boolean,
    card: {
        cvv: string,
        number: string,
        expiry_month: string,
        expiry_year: string
    }
}

export interface IFileUpload {
    name: string,
    data: any,
    size: number,
    parsedSize: number,
    encoding: string,
    path: string,
    mime: string
}

export interface IUploadProgress {
    id: any,
    progress: number,
    consumed: number,
    size: number,
    completed: boolean
}

export interface ICountry {
    name: string;
    code2: string;
    code3: string;
    capital: string;
    region: string;
    subRegion: string;
    currencyCode: string;
    currencyImage: string;
    phoneCode: string;
    flag: string;
    states: Array<object | any>;
    slug: string;
    timezones: Array<object | any>;
}
export interface IBank {
    name: string;
    legalName: string,
    code: string;
    platformCode: string,
    listCode?: string,
    isEnabled: boolean;
    country: string;
    currency: string;
    type: string;
    provider?: IBankProvider,
    providers: Array<IBankProvider>
}

export interface IBankProvider {
    id: string,
    name: string,
    bankCode: string,
    longCode: string,
    active: boolean,
    metadata: {
        payWithBank: boolean,
        isDeleted: boolean,
        createdAt: string | null,
        updatedAt: string | null
    },
    production: {
        name: string,
        code: string,
        list: string,
    }
}

export interface IFilterDate {
    from: string,
    to: string,
    start: string,
    end: string,
    last: string,
    today: string,
    nextDay: string
}

export interface IOverview {
    paymentLinks?: {
        total: number, active: number, inactive: number, inflow: { total: number, today: number }
    },
    subaccounts?: {
        total: number, active: number, inactive: number, inflow: number
    },
    products?: {
        total: number,
        active: number,
        inactive: number,
        inflow: {
            total: number,
            today: number,
        },
        transactions: number
    }
    settlements?: {
        total: number,
        completed: number,
        pending: number,
        transactions: number,
        value: number
    },
    chargebacks?: {
        total: number,
        completed: number,
        pending: number,
        preArbitration: number,
        arbitration: number
        value: number,
        graph: {
            latest: Array<any>
        }
    },
    refunds?: {
        total: number,
        completed: number,
        pending: number,
        successful: number,
        failed: number,
        value: number
    },
    transactions?: {
        total: number,
        completed: number,
        pending: number,
        successful: number,
        failed: number,
        processing: number,
        refunded: number,
        paid: number,
        cancelled: number,
        totalAmount: number
        value: number
    },
    wallet?: {
        balance: number,
        settlement: number,
        locked: number,
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
        },
        graph: {
            income: Array<IYearGraphData>,
            transactions: Array<IYearGraphData>
        },
        analytics: {
            revenue: {
                amount: number,
                count: number,
                totalAmount: number,
            },
            inflow: {
                amount: number,
                count: number,
                totalAmount: number,
            },
            expenses: {
                amount: number,
                count: number,
                totalAmount: number,
            }
        }
    },

    invoices?: {
        total: number,
        active: number,
        inactive: number,
        inflow: number,
        transactions: number,
        pending: number,
        paid: number,
        overdue: number
    }
}

export interface IGraphData {
    wallet?: {
        income: Array<IYearGraphData>,
        transactions: Array<IYearGraphData>
    }
}

export interface IYearGraphData {
    label: string,
    name: string,
    index: string,
    year: number | string,
    count: number,
    total: number,
    data: Array<any>
}

export interface ICustomField {
    displayName: string,
    variableName: string,
    value: string
}
export interface IJobData {
    data: any;
    name?: string,
    delay?: number;
}

export interface IAmountCount {
    amount: number,
    totalAmount: number,
    settlementAmount?: number,
    revenue: number,
    vat: number,
    providerFee: number,
    fee?: number
    count: number
}

export interface IBalanceCount {
    balance: number,
    locked: number,
    settlement: number,
    count: number,
    data?: any
}

export interface IGPLFee {
    amount: number,
    revenue: number,
    vat: number,
    fee: number
    count: number
}