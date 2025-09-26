export enum CacheKeys {
    Users = 'vaceapp.cache.users',
    Wallets = 'vaceapp.cache.wallets',
    Accounts = 'vaceapp.cache.accounts',
    Businesses = 'vaceapp.cache.businesses',
    Transactions = 'vaceapp.cache.transactions',
    Chargebacks = 'vaceapp.cache.chargebacks',
    Settlements = 'vaceapp.cache.settlements',
    Refunds = 'vaceapp.cache.refunds',
    Products = 'vaceapp.cache.products',
    Subaccounts = 'vaceapp.cache.subaccounts',
    Providers = 'vaceapp.cache.providers',
    Invoices = 'vaceapp.cache.invoices',
    PaymentLinks = 'vaceapp.cache.payment.links',
}

export const computeKey = (env: string | undefined, key: string): string => {
    return env === 'production' ? key + '.prod' : key;
}