export enum CacheKeys {
    Posts = 'backend.cache.blog-posts',
    PublishedPosts = 'backend.cache.blog-published-posts',
    Tags = 'backend.cache.blog-tags',
    Categories = 'backend.cache.blog.categories',
    Comments = 'backend.cache.blog-comments',
    Users = 'backend.cache.blog-users',
    Brackets = 'backend.cache.blog-brackets',
    Subscribers = 'backend.cache.blog-subscribers',
    Campaigns = 'backend.cache.blog-campaigns',
}

export const computeKey = (env: string | undefined, key: string): string => {
    return env === 'production' ? key + '.prod' : key;
}