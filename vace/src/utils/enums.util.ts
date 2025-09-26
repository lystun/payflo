export enum UserType {
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
    PRODUCT = 'product',
    REFUND = 'refund',
    SETTLEMENT = 'settlement',
    SUBACCOUNT = 'subaccount',
    TRANSACTION = 'transaction',
    WALLET = 'wallet',
}

export enum BusinessType {
    CORPORATE = 'corporate',
    SME = 'sme-business',
    SMB = 'smb-business',
    ENTREPRENEUR = 'entrepreneur',
}

export enum PrefixType {
    BUSINESS = 'VSWB.',
    APIKEY = 'VSAPI.',
    TRANSACTION = 'VSX',
    PROVIDER = 'PRV',
    ACCOUNT = 'VSA',
    INVOICE_ITEM = 'ITM',
    WALLET = 'VSW',
    PRODUCT = 'VPD',
    SETTLEMENT = 'VST',
    REFUND = 'VSF',
    CHARGEBACK = 'VSC',
    INVOICE = 'VSI',
    SUBACCOUNT = 'VSUB',
    MERCHANT_ID = 'VCP'
}

export enum ValueType {
    PERCENTAGE = 'percentage',
    FLAT = 'flat'
}

export enum VerificationType {
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

export enum ProviderNameType {
    BANI = 'bani',
    PAYAZA = 'payaza',
    PAYSTACK = 'paystack',
    FLUTTERWAVE = 'flutterwave',
    NINEPSB = 'ninepsb',
    NETMFB = 'netmfb',
    MONO = 'mono',
    ONAFRIQ = 'onafriq',
    INTERSWITCH = 'interswitch',
    UNIFIED = 'unified',
    BLUSALT = 'blusalt'
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

export enum ProviderPaymentStatus {
    ACTIVATED = 'activated',
    COMPLETED = 'completed',
    ONGOING = 'on_going',
    IN_PROGRESS = 'in_progress',
    SOURCE_PROCESSING = 'source_processing',
    FAILED = 'failed',
    PENDING = 'pending',
    PAID = 'paid',
    SUCCESS = 'success',
    SUCCESSFUL = 'successful',
    CODE00 = '00'
}

export enum TransactionChannelType{
    BANK_SETTLEMENT = 'bank-settlement',
    WALLET_SETTLEMENT = 'wallet-settlement',
    CARD = 'card',
    BANK_TRANSFER = 'bank',
    BILLS_PAYMENT = 'bills-payment'
}

export enum TransactionStatus {
    PENDING = 'pending',
    OVERDUE = 'overdue',
    PROCESSING = 'processing',
    SUCCESSFUL = 'successful',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded',
    PAID = 'paid',
    CANCELLED = 'cancelled',
}

export enum PaymentLinkType {
    FIXED = 'fixed',
    DYNAMIC = 'dynamic'
}

export enum FeatureType {
    INVOICE = 'invoice',
    PRODUCT = 'product',
    REQUEST = 'request'
}
export enum TransactionFeatureType {
    BANK_ACCOUNT = 'bank-account',
    BANK_SETTLEMENT = 'bank-settlement',
    BANK_TRANSFER = 'bank-transfer',
    WALLET_TRANSFER = 'wallet-transfer',
    WALLET_WITHDRAW = 'wallet-withdraw',
    WALLET_VAS = 'wallet-vas',
    WALLET_AIRTIME = 'wallet-airtime',
    WALLET_DATA = 'wallet-data',
    WALLET_BILL = 'wallet-bill',
    WALLET_REFUND = 'wallet-refund',
    WALLET_REVERSAL = 'wallet-reversal',
    API_REFUND = 'api-refund',
    WALLET_CHARGEBACK = 'wallet-chargeback',
    PAYMENT_LINK = 'payment-link',
    INTERNAL_CREDIT = 'internal-credit',
    INTERNAL_DEBIT = 'internal-debit',
    INTERNAL_TRANSFER = 'internal-transfer'
}
export enum DomainType{
    LIVE = 'live',
    TEST = 'test',
    NEUTRAL = 'neutral',
    PRODUCTION = 'production',
    STAGING = 'staging'
}

export enum APIKeyType{
    APIKEY = 'platform',
    SECRETKEY = 'secret',
    PUBLICKEY = 'public'
}

export enum HeaderType {
    WEBHOOK = 'x-vacepay-signature',
    IDEMPOTENT = 'x-idempotent-key'
}
export enum CurrencyType {
    NGN = 'NGN',
    USD = 'USD'
}
export enum PaymentMethodType {
    BANK = 'bank',
    Card = 'card',
    USSD = 'ussd',
    QRCODE = 'qrcode'
}
export enum NextStepType {
    SEND_PIN = 'send_pin',
    SEND_OTP = 'send_otp',
    OPEN_URL = 'open_url',
    SEND_PHONE = 'send_phone',
    SEND_BIRTHDAY = 'send_birthday',
    SEND_ADDRESS = 'send_address',
    SUCCESS = 'success',
    FAILED = 'failed'
}
export enum CardAuthType {
    PIN = 'pin',
    OTP = 'otp',
    URL = 'url',
    PHONE = 'phone',
    BIRTHDAY = 'birthday',
    ADDRESS = 'address'
}
export enum WebhookEventType {
    PAYIN_SUCCESS = 'payin.success',
    PAYIN_FAILED = 'payin.failed',
    PAYIN_LINK_SUCCESS = 'payin.link.success',
    PAYIN_LINK_FAILED = 'payin.link.failed',
    PAYOUT_SUCCESS = 'payout.success',
    PAYOUT_FAILED = 'payout.failed',
    VAS_SUCCESS = 'vas.success',
    VAS_FAILED = 'vas.failed',
    REFUND_SUCCESS = 'refund.success',
    REFUND_FAILED = 'refund.failed',
    CHARGEBACK_SUCCESS = 'chargeback.success',
    CHARGEBACK_FAILED = 'chargeback.failed',
}
export enum WebhookStatusType{
    SUCCESS = 'success',
    FAILED = 'failed',
    PROCESSED = 'processed'
}
export enum SettlementType{
    FULL = 'full-settlement',
    BUSINESS = 'business-settlement',
    TRANSACTION = 'transaction'
}
export enum SettlementStatus{
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed'
}
export enum SettleIntoType{
    WALLET = 'wallet',
    BANK = 'bank'
}

export enum ErrorMessageType{
    ERROR_OCCURED = 'an error occured, please try again'
}
export enum CardSchemeType{
    VISA = 'visa',
    MASTER = 'mastercard',
    VERVE = 'verve',
    AMEX = 'american-express',
}
export enum SettingStatusType{
    ACTIVE = 'active',
    INACTIVE = 'inactive',
}
export enum FilterType{
    DAY = 'day',
    MONTH = 'month',
    CUSTOM_DATE = 'custom-date',
}
export enum FeeType {
    CARD = 'card',
    TRANSFER = 'transfer',
    BILL = 'bill',
    VAS = 'vas'
}
export enum FeeCategory {
    INFLOW = 'inflow',
    OUTFLOW = 'outflow'
}
export enum AmountType {
    FIXED = 'fixed',
    DYNAMIC = 'dynamic'
}