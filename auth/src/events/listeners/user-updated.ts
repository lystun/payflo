import { Stan } from 'node-nats-streaming'
import { Listener, Subjects, STGSubjects, Random, SyncAction, SyncType, DEVSubjects } from '@btffamily/vacepay';
import QueueGroupName from '../groupName';
import User from '../../models/User.model';
import ENV from '../../utils/env.util';


class UserUpdatedListener extends Listener {

    subject = ENV.isProduction() ? Subjects.UserUpdated : ENV.isStaging() ? STGSubjects.UserUpdated : DEVSubjects.UserUpdated;
    queueGroupName = QueueGroupName.Vace + `.${process.env.NATS_LISTEN_ID}.${Random.randomCode(3, true)}`;

    constructor(client: Stan){
        super(client);
    }

    async onMessage(data: any, msg: any){

        const { user } = data;
        const action: SyncAction = data.action;
        const type: SyncType = data.type;

        // acknowledge NATS message
        msg.ack();

        const _user = await User.findOne({ email: user.email });

        if(_user){

            if (action === 'user.apikey'){

            }

            if (action === 'user.updated'){
                
            }

            if (action === 'user.deleted'){
                
            }

        }

    }


}

export default UserUpdatedListener;