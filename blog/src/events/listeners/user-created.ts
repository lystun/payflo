import { Stan } from 'node-nats-streaming';
import { Listener, STGSubjects, Subjects, Random, SyncAction, SyncType, DEVSubjects } from '@btffamily/vacepay';
import QueueGroupName from '../groupName';

import nats from '../nats';
import User from '../../models/User.model';
import ENV from '../../utils/env.util';
import { UserType } from '../../utils/enums.util';

class UserCreatedListener extends Listener {

    subject = ENV.isProduction() ? Subjects.UserCreated : ENV.isStaging() ? STGSubjects.UserCreated : DEVSubjects.UserCreated;
    queueGroupName = QueueGroupName.Auth + `.${process.env.NATS_LISTEN_ID}.${Random.randomCode(3, true)}`;

    constructor(client: Stan){
        super(client)
    }

    async onMessage(data: any, msg: any){

        // get the message data
        const { user, userType, phoneCode } = data;
        const action: SyncAction = data.action;
        const type: SyncType = data.type;

        msg.ack(); // acknowlege NAts message

        //find user
        const _user = await User.findOne({ email: user.email });

        if (!_user ) {
            
            if(action === 'user.created'){

                const newUser = await User.create({
                    firstName: user.firstName,
                    lastName: user.lastName,
                    _id: user._id,
                    id: user._id,
                    userId: user._id,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    userType: userType,
                    roles: user.roles,
                    permissions: user.permissions
                });

                // process API kets
                newUser.apiKey = {
                    domain: user.apiKey.domain,
                    secret: user.apiKey.secret,
                    token: user.apiKey.token,
                    public: user.apiKey.public,
                    publicToken: user.apiKey.publicToken,
                    isActive: user.apiKey.isActive,
                    updatedAt: user.apiKey.updatedAt
                }
                newUser.keys.push({
                    domain: user.apiKey.domain,
                    secret: user.apiKey.secret,
                    token: user.apiKey.token,
                    public: user.apiKey.public,
                    publicToken: user.apiKey.publicToken,
                    isActive: user.apiKey.isActive,
                    updatedAt: user.apiKey.updatedAt
                });

                if(userType === UserType.BUSINESS){

                    newUser.businessType = user.businessType;
                    newUser.businessName = user.businessName;
                    await newUser.save();
                    
                } else if(userType === UserType.SUPER || userType === UserType.ADMIN){
                    await newUser.save();
                }

            }

        }     
        
    }   

}

export default UserCreatedListener;