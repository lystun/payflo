import fs from 'fs';
import colors from 'colors';
import redis from '../../middleware/redis.mw'
import { CacheKeys, computeKey } from '../../utils/cache.util'
import { advanced } from '../../utils/result.util'

import Language from '../../models/Language.model';

// read in the seed file
const data = JSON.parse(
	fs.readFileSync(`${__dirname.split('config')[0]}_data/languages.json`, 'utf-8')
);

export const seedLanguages = async () => {

    try {

        const rs = await Language.find();
        if (rs && rs.length > 0) return;

        const seed = await Language.create(data);

        if(seed){
            console.log(colors.green.inverse('Languages seeded successfully.'));
        }

    } catch (err) {
        console.log(colors.red.inverse(`${err}`));
    }

}

export const cacheLanguages = async (type: string = 'd'): Promise<void> => {

    if(type === 'd'){
        redis.deleteData(CacheKeys.Languages)
    }

    if(type === 'i'){

        try {

            const languages = await advanced(Language, [], 'name', { query: { limit: 9999 } });
            
            if(languages && languages.data.length > 0){

                // expires in 15 days
                // 1 day === 86400 seconds
                await redis.keepData({ key: computeKey(process.env.NODE_ENV, CacheKeys.Languages), value: { data: languages.data, pagination: languages.pagination }}, (20 * 86400)); 

            }
            
        } catch (err) {

            console.log(colors.red.inverse(`${err}`))
            
        }

    }

    

}