import redis from '../../middleware/redis.mw';
import { CacheKeys } from '../../utils/cache.util'

export const deleteCached = async () => {
    
    await redis.deleteData(CacheKeys.Categories);
    await redis.deleteData(CacheKeys.Tags);
    await redis.deleteData(CacheKeys.Posts);
    await redis.deleteData(CacheKeys.Brackets);

}