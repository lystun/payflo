export enum UserType{
    SUPER = 'superadmin',
    ADMIN = 'admin',
    BUSINESS = 'business',
    WRITER = 'writer',
    TEAM = 'team',
    USER = 'user'
}
export enum PermissionType{
    CAN_CREATE = 'CAN_CREATE',
    CAN_UPATE = 'CAN_UPATE',
    CAN_READ = 'CAN_READ',
    CAN_DELETE = 'CAN_DELETE',
    CAN_MODIFY = 'CAN_MODIFY',
    CAN_DISABLE = 'CAN_DISABLE',
    CAN_ENABLE = 'CAN_ENABLE'
}
export enum ModelType{
    ROLE = 'role',
    AUDIT = 'audit',
    KYB = 'kyb',
    KYC = 'kyc',
    NOTIFICATION = 'notification',
    SYSTEM = 'system',
    USER = 'user',
    VERIFICATION = 'verification',
    ACCOUNT = 'account',
    BENEFICIARY = 'beneficiary',
    BUSINESS = 'business',
    CHARGEBACK = 'chargeback',
    INVOICE = 'invoice',
    PAYMENTLINK = 'paymentlink',
    PERMISSION = 'permission',
    PRODUCT = 'product',
    REFUND = 'refund',
    SETTLEMENT = 'settlement',
    SUBACCOUNT = 'subaccount',
    TRANSACTION = 'transaction',
    WALLET = 'wallet',
}
export enum BusinessType{
    CORPORATE = 'corporate',
    SME = 'sme-business',
    SMB = 'smb-business',
    ENTREPRENEUR = 'entrepreneur',
    NO_TYPE = 'no-type'
}

export enum TierLimits {
    TIER0 = 0,
    TIER1 = 1,
    TIER2 = 2,
    TIER3 = 3,
}

export const TierLimitsConfig = {
    [TierLimits.TIER0]: {
        label: '0',
        limit: 0,
    },
    [TierLimits.TIER1]: {
        label: '5K',
        limit: 500000,
    },
    [TierLimits.TIER2]: {
        limit: 10000000,
        label: '100K',
    },
    [TierLimits.TIER3]: {
        limit: 300000000,
        label: '3M',
    },
};

export enum PrefixType{
    BUSINESS = 'BIZ',
    APIKEY = 'vapi',
}

export enum DomainType{
    LIVE = 'live',
    TEST = 'test',
    PRODUCTION = 'production',
    STAGING = 'staging'
}

export enum APIKeyType{
    APIKEY = 'platform',
    SECRETKEY = 'secret',
    PUBLICKEY = 'public'
}

export enum VerificationType{
    PENDING = 'pending',
    SUBMITTED = 'submitted',
    APPROVED = 'approved',
    DECLINED = 'declined',
    ONHOLD = 'on-hold',
}

export enum IDType {
    CARD = 'card',
    PASSPORT = 'passport',
    LICENSE = 'license',
    NINSLIP = 'nin-slip'
}

export enum ProviderType {
    BANI = 'bani',
    PAYAZA = 'payaza',
    PAYSTACK = 'paystack',
    FLUTTERWAVE = 'flutterwave',
    NINEPSB = 'ninepsb'
}

export enum OnboardType{
    BASIC = 'basic',
    ADDRESS = 'address',
    COMPANY = 'company-info',
    FACEID = 'face-id',
    IDCARD = 'id-card',
    OWNER = 'owner-info',
    BANK = 'bank-details',
    BVN = 'bvn-number',
    NIN = 'nin-number',
    LIVENESS = 'liveness-check',
    PIN = 'transaction-pin',
    QUESTION = 'security-question'
}

export enum LoginType{
    EMAIL = 'email',
    BIOMETRIC = 'biometric',
}

export enum SaveActionType{
    SAVE = 'save-new',
    UPDATE = 'update-data'
}

export enum SMSDriverType{
    AFRICA_TALKING = 'africas-talking',
    TERMII = 'termii',
    AWS = 'aws'
}


