import fs from 'fs';
import colors from 'colors';
import redis from '../../middleware/redis.mw'
import { CacheKeys, computeKey } from '../../utils/cache.util'
import { advanced } from '../../utils/result.util'
import { uploadBase64File, deleteGcFile } from '../../utils/google.util'
import { strIncludesEs6 } from '@btffamily/vacepay';

import Country from '../../models/Country.model';

// read in the seed file
const data = JSON.parse(
	fs.readFileSync(`${__dirname.split('config')[0]}_data/countries.json`, 'utf-8')
);

export const seedCountry = async () => {

    try {

        const rs = await Country.find();
        if (rs && rs.length > 0) return;

        const seed = await Country.create(data);

        if(seed){
            console.log(colors.green.inverse('Countries seeded successfully.'));
        }

    } catch (err) {
        console.log(colors.red.inverse(`${err}`));
    }

}

export const cacheCountries = async (type: string = 'd'): Promise<void> => {

    if(type === 'd'){
        redis.deleteData(CacheKeys.Countries)
    }

    if(type === 'i'){

        try {

            const countries = await advanced(Country, [], 'name', { query: { limit: 9999 } }); 
            
            if(countries && countries.data.length > 0){

                // expires in 15 days
                // 1 day === 86400 seconds
                await redis.keepData({ key: computeKey(process.env.NODE_ENV, CacheKeys.Countries), value: { data: countries.data, pagination: countries.pagination }}, (20 * 86400)); 

            }
            
        } catch (err) {

            console.log(colors.red.inverse(`${err}`))
            
        }

    }

    

}

export const seedChange = async () => {

    const countries = await Country.find({});

    if(countries && countries.length > 0){

        for(let i = 0; i < countries.length; i++){

            const country = countries[i];

            let spt;
            if(strIncludesEs6(country.name, ' ')){
                spt = country.name.split(' ').join('-')
            }else{
                spt = country.name;
            }

            const imgSource = `${__dirname.split('config')[0]}_data/country-flags/${spt}.png`;

            if(fs.existsSync(imgSource)){

                // delete the previous file if it exist
                await deleteGcFile(`${country.name}_flag`)

                const content = fs.readFileSync(imgSource, { encoding: 'base64' });
                const base64 = `data:image/png;base64,${content}`;

                const mime = base64.split(';base64')[0].split(':')[1];
                const fileData = {
                    file: base64,
                    filename: spt + '_flag',
                    mimeType: mime
                }

                const gData = await uploadBase64File(fileData);
                countries[i].flag = gData.publicUrl;
                countries[i].currencyImage = '';
                countries[i].base64 = base64;
                await countries[i].save();

                console.log(gData.publicUrl);

            }
            else{
                continue;
            }

            

        }

    }

}