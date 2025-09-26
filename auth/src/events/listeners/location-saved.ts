import { Stan } from 'node-nats-streaming'
import { Listener, Subjects, STGSubjects, Random, SyncAction, SyncType, DEVSubjects } from '@btffamily/vacepay';
import QueueGroupName from '../groupName';

import User from '../../models/User.model';
import ENV from '../../utils/env.util';


class LocationSavedListener extends Listener {

    subject = ENV.isProduction() ? Subjects.LocationSaved : ENV.isStaging() ? STGSubjects.LocationSaved : DEVSubjects.LocationSaved;
    queueGroupName = QueueGroupName.Resource + `.${process.env.NATS_LISTEN_ID}.${Random.randomCode(3, true)}`;

    constructor(client: Stan){
        super(client);
    }

    async onMessage(data: any, msg: any){

        const { user, placeId } = data;
        const action: SyncAction = data.action;
        const type: SyncType = data.type;
    
        // acknowledge NATS message
        msg.ack();

        if(action === 'action.update'){
            
        }

    }


}

export default LocationSavedListener;