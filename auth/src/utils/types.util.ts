import { ObjectId, Document, Model } from 'mongoose'
import { IUserOverviewDTO } from '../dtos/user.dto';

export type LogType = 'info' | 'warning' | 'error' | 'success' | 'any';
export type EmailDriver = 'sendgrid' | 'aws' | 'mailtrap' | 'zepto' | 'brevo';
export type SMSDriver = 'africas-talking' | 'termii';
export type VerifyOTPType = 'register' | 'password-reset' | 'change-password' | 'login' | 'verify'
export type AuditType = 'undefined' | 'error' | 'success';
export type KYBRegType = 'business-name' | 'limited-liability' | 'privately-held' | 'ngo-organization' | 'plc-organization';
export type KYBRegCategory = 'starter' | 'registered';
export type ExtractActionItem = 'create' | 'read' | 'update' | 'delete' | 'modify' | 'disable' | 'enable';
export type APIMethodType = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

// models
export interface IBlackListDoc extends Document {

    fullName: string;
    email: string;
    listedAt: string | number;
    dueAt: string | number;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAllBlackLists(): any


}

export interface IAnnouncementDoc extends Document {

    title: string,
    url: string,
    description: string,
    code: string,
    slug: string,
    avatar: string,
    mail: {
        subject: string
        message: string,
        marked: string
    },
    mobile: {
        message: string,
        title: string,
        sms: boolean,
        push: boolean
    }
    web: {
        message: string,
        title: string,
        dashboard: boolean,
        isPublic: boolean
    }

    user: ObjectId

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAllAnnouncements(): any


}

export interface ICountryDoc extends Document {

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
    users: Array<ObjectId | any>;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // props
    getAll(): ICountryDoc;
}

export interface IAuditDoc extends Document {

    user: ObjectId | any;
    email: string,
    description: string;
    slug: string;
    action: string;
    entity: string;
    entityId: any,
    controller: string,
    type: string,
    changes: Record<string, any>

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAll(): any

}

export interface ISystemDoc extends Document {

    email: string,
    notifications: {
        sms: boolean,
        email: boolean,
        push: boolean,
        dashboard: boolean
    },
    update: {
        updatedBy: ObjectId | any,
        changes: Record<string, any>
    }
    slug: string

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

}

export interface INotificationDoc extends Document {

    user: ObjectId | any;
    body: string;
    title: string;
    status: string;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getNotifications(): any

}

export interface IKycDoc extends Document {

    firstName: string;
    lastName: string;
    middleName: string;
    avatar: string,
    phoneCode: string;
    phoneNumber: string;
    marital: string,
    bvn: string,
    nin: string,
    dob: string;
    gender: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    utilityDoc: string;
    idType: string;
    idData: { front: string, back: string };
    faceId: string;
    age: number;
    cacData: ICACData,
    bvnData: IBvnData,
    liveness: ILivenessData,
    ninData: INinData
    slug: string;

    country: ObjectId | any;
    user: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAllKycs(): any


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

export interface ILivenessData {
    isLive: boolean,
    imageUrl: string,
    externalDatabaseRefID: string,
    message: string,
    customerRef: string,
    status: string
}

export interface IKYBDoc extends Document {

    businessName: string;
    profile: string;
    staffStrength: string;
    category: string;
    industry: string;
    phoneCode: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    owner: IKYBOwner,
    nin: string,
    bvn: string,
    regType: string,
    regCategory: string,
    officialEmail: string,
    cacNumber: string,
    certificate: string,
    tinNumber: string,
    websiteUrl: string,
    socials: Array<IKYBSocial>
    bvnData: IBvnData,
    ninData: INinData,
    cacData: ICACData,
    autoComplete: boolean,
    bank: {
        accountNo: string,
        bankName: string,
        accountName: string,
        bankCode: string
    }
    slug: string;

    country: ObjectId | any;
    user: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAllKycs(): any

}

export interface IKYBSocial {
    name: string,
    url?: string,
    username?: string,
    description?: string
}

export interface IKYBOwner {
    firstName: string,
    middleName: string,
    lastName: string,
    name: string,
    dob: string,
    nationality: string
    idCard: string,
    utilityDoc: string,
    address: string,
    bvn: string,
    nin: string
}

export interface IRoleDoc extends Document {

    name: string;
    description: string;
    slug: string;
    resources: Array<ObjectId | any>;
    users: Array<ObjectId | any>;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    findByName(name: string): IRoleDoc;
    getRoleName(id: ObjectId): IRoleDoc;
    getAllRoles(): any


}

export interface IPermissionDoc extends Document {

    name: string,
    code: string,
    entity: string,
    slug: string;
    actions: Array<{
        label: string,
        description: string;
    }>

    updatedBy: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getPermissions(): IPermissionDoc


}

export interface IVerificationDoc extends Document {

    basic: string;
    bvn: string;
    nin: string;
    ID: string;
    face: string;
    address: string;
    kyb: string;
    kyc: string;
    sms: boolean;
    email: boolean;
    biometric: boolean;
    bvnLimit: number
    ninLimit: number
    security: IQuestion

    user: ObjectId;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAllVerifications(): any

}

export interface IQuestion {
    label: string,
    question: string,
    answer: string,
    isSubmitted: boolean
}

export interface IDeviceDoc extends Document {

    login: string,
    platform: string,
    version: string,
    os: {
        name: string,
        shortName: string,
        platform: string,
        version: string
    },
    client: {
        type: string,
        name: string,
        shortName: string,
        version: string
    },
    details: {
        id: string,
        type: string,
        brand: string,
        model: string,
        code: string
    }
    source: string,
    isMobile: boolean,
    isDesktop: boolean,
    browser: string,

    // relationship
    user: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAllDevices(): Array<IDeviceDoc>

}

export interface IUserDoc extends Document {

    avatar: string,
    tier: string,
    dailyTransaction: {
        limit: number,
        label: string
    }
    transactionPin: string,
    businessName: string,
    firstName: string;
    lastName: string;
    phoneNumber: string;
    altPhone: string,
    phoneCode: string;
    countryPhone: string,
    email: string;
    password: string;
    passwordType: string;
    savedPassword: string;
    businessType: string,
    userType: string;
    points: number;
    login: {
        last: string,
        method: string
    },
    onboard: {
        step: number,
        stage: string,
        kycStage: string,
        kybStage: string
    },
    status: {
        profile: string,
        setup: number
    };

    activationToken: string | undefined;
    activationTokenExpire: Date | undefined;

    resetPasswordToken: string | undefined;
    resetPasswordTokenExpire: Date | undefined;

    emailCode: string | undefined;
    emailCodeExpire: Date | number | undefined;

    inviteToken: string | undefined;
    inviteTokenExpire: Date | undefined;
    inviteStatus: string;

    apiKey: IAPIKey
    keys: Array<IAPIKey>

    oauth: Array<{
        brand: string,
        creds: {
            accessToken: string,
            refreshToken: string,
            tokenType: string,
            idToken: string,
            expiryDate: number | string,
            scope: string,
            data: any
        }
    }>;

    isSuper: boolean;
    isAdmin: boolean;
    isBusiness: boolean;
    isWriter: boolean;
    isUser: boolean;
    isTeam: boolean;

    isActivated: boolean;
    isActive: boolean;
    loginLimit: number;
    isLocked: boolean;

    // relationships
    country: ObjectId | any;
    roles: Array<ObjectId | any>;
    permissions: Array<IUserPermission>;
    kyc: ObjectId | any;
    kyb: ObjectId | any;
    verification: ObjectId | any;
    notifications: Array<ObjectId | any>
    devices: Array<ObjectId | any>

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // props for the model
    build(attrs: any): IUserDoc,
    getSignedJwtToken(): any,
    matchPassword(password: string): any,
    matchEmailCode(code: string): boolean,
    matchInviteLink(link: string): boolean,
    increaseLoginLimit(): number,
    checkLockedStatus(): boolean,
    getResetPasswordToken(): any,
    getActivationToken(): any,
    getInviteToken(): any;
    hasRole(role: any, roles: Array<ObjectId>): Promise<boolean>,
    findByEmail(email: string): IUserDoc,
    generateAPIKey(): any

}

export interface IUserPermission {
    entity: string,
    actions: Array<string>
}

export interface IBasicKyc {
    firstName: string,
    lastName: string,
    middleName: string,
    dob: string,
    gender: string,
    age: boolean,
    phoneCode: string
}

export interface IIDKYC {
    type: string,
    front: string,
    back: string
}

export interface IAddressKyc {
    country: ObjectId,
    city: string,
    state: string,
    address: string,
    postalCode: string,
    utilityDoc: string,
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

export interface IPagination {
    total: number,
    count: number,
    pagination: {
        next: { page: number, limit: number },
        prev: { page: number, limit: number },
    },
    data: Array<any>
}

export interface IResult {
    error: boolean,
    message: string,
    code?: number,
    data: any
}

export interface ISearchQuery {
    model: Model<any>,
    ref: string | null | undefined,
    value: any | null | undefined,
    data: any,
    query: any,
    queryParam: any,
    populate: Array<any>,
    operator: string;
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


export interface ILogin {
    email: string,
    password: string,
    code: string
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

export interface IGoogleCreds {
    accessToken: string,
    refreshToken: string,
    tokenType: string,
    idToken: string,
    expiryDate: number | string,
    scope: string
}

export interface IDiscordCreds {
    accessToken: string,
    refreshToken: string,
    tokenType: string,
    expiryDate: number | string,
    scope: string
}

export interface IFacebookCreds {
    accessToken: string,
    refreshToken: string,
    tokenType: string,
    expiryDate: number | string,
    scope: string
}

export interface IBulkUser {
    _id: ObjectId | null | string,
    firstName: string,
    lastName: string,
    email: string,
    phoneNumber: string,
    phoneCode: string,
    userType: string,
    businessType: string
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
    id: string | null,
    name: string,
    bankCode: string,
    longCode: string | null,
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

export interface ISystemOverview {
    user: IUserOverviewDTO
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

export interface IJobData {
    data: any;
    name?: string,
    delay?: number;
}