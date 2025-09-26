import { Stan } from 'node-nats-streaming'
import { Publisher, Subjects, STGSubjects, DEVSubjects } from '@btffamily/vacepay'
import ENV from '../../utils/env.util';

class AuditCreatedPublisher extends Publisher {

    subject = ENV.isProduction() ? Subjects.AuditCreated : ENV.isStaging() ? STGSubjects.AuditCreated : DEVSubjects.AuditCreated;

    constructor(client: Stan){
        super(client);
    }

}

export default AuditCreatedPublisher;