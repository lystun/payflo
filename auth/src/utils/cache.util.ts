export enum CacheKeys {
    Roles = 'vaceauth.cached.roles',
    Anns = 'vaceauth.cached.announcements',
    Users = 'vaceauth.cached.users',
    Permission = 'vaceauth.cached.permission',
    Audit = 'vaceauth.cached.audits',
}

export const computeKey = (env: string | undefined, key: string): string => {
    return env === 'production' ? key + '.prod' : key;
}