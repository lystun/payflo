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
    CAN_ENABLE = 'CAN_DISABLE'
}

export enum BusinessType{
    CORPORATE = 'corporate',
    SME = 'sme-business',
    SMB = 'smb-business',
    ENTREPRENEUR = 'entrepreneur',
}

export enum PrefixType{
    BUSINESS = 'BIZ',
    APIKEY = 'VAPI.'
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