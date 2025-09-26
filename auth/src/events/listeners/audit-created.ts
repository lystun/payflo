import { Stan } from 'node-nats-streaming';
import { Listener, STGSubjects, Subjects, Random, SyncAction, SyncType, DEVSubjects } from '@btffamily/vacepay';
import QueueGroupName from '../groupName';

import ENV from '../../utils/env.util';
import AuditService from '../../services/audit.service';
import { createAuditJob } from '../../queues/jobs/audit.job';

class AuditVaceCreatedListener extends Listener {

    subject = ENV.isProduction() ? Subjects.AuditCreated : ENV.isStaging() ? STGSubjects.AuditCreated : DEVSubjects.AuditCreated;
    queueGroupName = QueueGroupName.Vace + `.${process.env.NATS_LISTEN_ID}.${Random.randomCode(3, true)}`;

    constructor(client: Stan){
        super(client)
    }

    async onMessage(data: any, msg: any){

        // get the message data
        const { audit } = data;
        const action: SyncAction = data.action;
        const type: SyncType = data.type;

        msg.ack(); // acknowlege NAts message

        if (audit) {
            
            if(action === 'audit.created' && type === 'type.audit'){
                createAuditJob(audit)
            }

        }     
        
    }   

}

export default AuditVaceCreatedListener;