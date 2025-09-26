import fs from 'fs';
import colors from 'colors';
import redis from '../../middleware/redis.mw'
import { CacheKeys, computeKey } from '../../utils/cache.util'
import { advanced } from '../../utils/result.util'

import Coin from '../../models/Coin.model';

// read in the seed file
const data = JSON.parse(
	fs.readFileSync(`${__dirname.split('config')[0]}_data/coins.json`, 'utf-8')
);

export const seedCoins = async () => {

    try {

        const rs = await Coin.find();
        if (rs && rs.length > 0) return;

        const seed = await Coin.create(data);

        if(seed){
            console.log(colors.green.inverse('Coins seeded successfully.'));
        }

    } catch (err) {
        console.log(colors.red.inverse(`${err}`));
    }

}

export const cacheCoins = async (type: string = 'd'): Promise<void> => {

    if(type === 'd'){
        redis.deleteData(CacheKeys.Coins)
    }

    if(type === 'i'){

        try {

            const coins = await advanced(Coin, [], 'name', { query: { limit: 9999 } });
            
            if(coins && coins.data.length > 0){

                // expires in 15 days
                // 1 day === 86400 seconds
                await redis.keepData({ key: computeKey(process.env.NODE_ENV, CacheKeys.Coins), value: { data: coins.data, pagination: coins.pagination }}, (20 * 86400)); 

            }
            
        } catch (err) {

            console.log(colors.red.inverse(`${err}`))
            
        }

    }

    

}