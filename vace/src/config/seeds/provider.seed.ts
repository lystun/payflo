import fs from 'fs'
import colors from 'colors'
import User from '../../models/User.model'
import SystemService from '../../services/system.service'
import { PrefixType } from '../../utils/enums.util'
import Provider from '../../models/Provider.model'
import { UIID } from '@btffamily/vacepay'

// read in the JSON file
const providers = JSON.parse(
    fs.readFileSync(`${__dirname.split('config')[0]}_data/providers.json`, 'utf-8')
)

export const seedProviders = async (): Promise<void> => {

    let list: number = 0;

    try {

        const superadmin = await User.findOne({ email: process.env.SUPERADMIN_EMAIL });

        for(let i = 0; i < providers.length; i++){

            let gen = UIID(1);
            let provider = providers[i];

            const exist = await Provider.findOne({ name: provider.name });

            if(!exist){

                provider.code = `${PrefixType.PROVIDER}${gen.toString()}`;
                provider.user = superadmin ? superadmin._id : null;
                await Provider.create(provider);

                list += 1;

            }


        }

        if(list > 0){
            console.log(colors.green.inverse('Providers seeded successfully'))
        }
        
        
    } catch (err) {

        console.log(colors.red.inverse(`${err}`))
        
    }

}
