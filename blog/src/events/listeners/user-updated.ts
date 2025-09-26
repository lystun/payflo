import { Stan } from 'node-nats-streaming';
import { Listener, STGSubjects, Subjects, Random, SyncAction, SyncType, DEVSubjects } from '@btffamily/vacepay';
import QueueGroupName from '../groupName';

import nats from '../nats';
import User from '../../models/User.model';
import { UserType } from '../../utils/enums.util';
import ENV from '../../utils/env.util';

class UserUpdatedListener extends Listener {

    subject = ENV.isProduction() ? Subjects.UserUpdated : ENV.isStaging() ? STGSubjects.UserUpdated : DEVSubjects.UserUpdated;
    queueGroupName = QueueGroupName.Auth + `.${process.env.NATS_LISTEN_ID}.${Random.randomCode(3, true)}`;

    constructor(client: Stan){
        super(client)
    }

    async onMessage(data: any, msg: any){

        // get the message data
        const { user } = data;
        const action: SyncAction = data.action;
        const type: SyncType = data.type;

        msg.ack(); // acknowlege NAts message

        //find user
        const _user = await User.findOne({ email: user.email });

        if (_user) {
            
            // save user API-KEY
            if(action === 'user.apikey'){

                _user.apiKey = {
                    domain: user.apiKey.domain,
                    secret: user.apiKey.secret,
                    token: user.apiKey.token,
                    public: user.apiKey.public,
                    publicToken: user.apiKey.publicToken,
                    isActive: user.apiKey.isActive,
                    updatedAt: user.apiKey.updatedAt
                }
                _user.keys = user.keys;
                await _user.save();

            }

            if(action === 'user.updated'){

                _user.permissions = user.permissions;
                await _user.save()

            }

            if(action === 'user.deleted'){
                
            }

        }     
        
    }   

}

export default UserUpdatedListener;