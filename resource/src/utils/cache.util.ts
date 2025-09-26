
export enum CacheKeys {
    Assets = 'vacepay.cache.assets',
    Asset = 'vacepay.cache.asset',
    Banks = 'vacepay.cache.banks',
    Bank = 'vacepay.cache.bank',
    Countries = 'vacepay.cache.countries',
    Country = 'vacepay.cache.country',
    Languages = 'vacepay.cache.languages',
    Language = 'vacepay.cache.language',
    Locations = 'vacepay.cache.locations',
    Location = 'vacepay.cache.location',
    Coins = 'vacepay.cache.coins',
    Coin = 'vacepay.cache.coin',
    Timezones = 'vacepay.cache.timezones',
    Networks = 'vacepay.cache.timezones',
}

export const computeKey = (env: string | undefined, key: string): string => {
    return env === 'production' ? key + '.prod' : key;
}