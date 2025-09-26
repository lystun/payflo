import { Stan } from 'node-nats-streaming';
import { Listener, STGSubjects, Subjects, Random, SyncAction, SyncType, DEVSubjects } from '@btffamily/vacepay';
import QueueGroupName from '../groupName';

import nats from '../nats';
import User from '../../models/User.model';
import { UserType } from '../../utils/enums.util';
import ENV from '../../utils/env.util';
import UserService from '../../services/user.service';
import { deleteUserJob } from '../../queues/jobs/user.job';

class UserDeletedListener extends Listener {

    subject = ENV.isProduction() ? Subjects.UserDeleted : ENV.isStaging() ? STGSubjects.UserDeleted : DEVSubjects.UserDeleted;
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
            
            if(action === 'user.deleted' && type === 'typ.delete'){
                deleteUserJob(_user);
            }

        }     
        
    }   

}

export default UserDeletedListener;