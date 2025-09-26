import fs from 'fs';
import colors from 'colors';
import redis from '../../middleware/redis.mw'
import { CacheKeys, computeKey } from '../../utils/cache.util'
import { advanced } from '../../utils/result.util'

import Timezone from '../../models/Timezone.model';

// read in the seed file
const data = JSON.parse(
	fs.readFileSync(`${__dirname.split('config')[0]}_data/timezones.json`, 'utf-8')
);

export const seedTimezones = async () => {

    try {

        const rs = await Timezone.find();
        if (rs && rs.length > 0) return;

        const seed = await Timezone.create(data);

        if(seed){
            console.log(colors.green.inverse('Timezones seeded successfully.'));
        }

    } catch (err) {
        console.log(colors.red.inverse(`${err}`));
    }

}

export const cacheTimezones = async (type: string = 'd'): Promise<void> => {

    if(type === 'd'){
        redis.deleteData(CacheKeys.Coins)
    }

    if(type === 'i'){

        try {

            const timezones = await advanced(Timezone, [], 'name', { query: { limit: 9999 } });
            
            if(timezones && timezones.data.length > 0){

                // expires in 15 days
                // 1 day === 86400 seconds
                await redis.keepData({ key: computeKey(process.env.NODE_ENV, CacheKeys.Timezones), value: { data: timezones.data, pagination: timezones.pagination }}, (20 * 86400)); 

            }
            
        } catch (err) {

            console.log(colors.red.inverse(`${err}`))
            
        }

    }

    

}