import { Stan } from 'node-nats-streaming'
import { Listener, Subjects, STGSubjects, Random, SyncType, SyncAction, DEVSubjects } from '@btffamily/vacepay';
import QueueGroupName from '../groupName';

import Country from '../../models/Country.model'
import User from '../../models/User.model';
import ENV from '../../utils/env.util';


class CountryFoundListener extends Listener {

    subject = ENV.isProduction() ? Subjects.CountryFound : ENV.isStaging() ? STGSubjects.CountryFound : DEVSubjects.CountryFound;
    queueGroupName = QueueGroupName.Resource + `.${process.env.NATS_LISTEN_ID}.${Random.randomCode(3, true)}`;

    constructor(client: Stan){
        super(client);
    }

    async onMessage(data: any, msg: any){

        const { _id, country } = data;
        const action: SyncAction = data.action;
        const type: SyncType = data.type;

        // acknowledge NATS message
        msg.ack();

        const user = await User.findOne({ _id: _id });
        const _country = await Country.findOne({ name: country.name });

        if(user && !user.country){

            if(!_country){

                const newCountry = await Country.create({

                    name: country.name,
                    code2: country.code2,
                    code3: country.code3,
                    states: country.states,
                    capital: country.capital,
                    region: country.region,
                    subRegion: country.subRegion,
                    flag: country.flag,
                    phoneCode: country.phoneCode,
                    currencyCode: country.currencyCode,
                    currencyImage: country.currencyImage

                });

                user.country = newCountry._id;
                await user.save();

            }else{

                user.country = _country._id;
                await user.save();
            }


        }

        

    }


}

export default CountryFoundListener;