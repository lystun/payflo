import { Stan } from 'node-nats-streaming'
import { Publisher, Subjects, STGSubjects, DEVSubjects } from '@btffamily/vacepay'
import ENV from '../../utils/env.util';

class ComplianceUpdatedPublisher extends Publisher {

    subject = ENV.isProduction() ? Subjects.ComplianceUpdated : ENV.isStaging() ? STGSubjects.ComplianceUpdated : DEVSubjects.ComplianceUpdated;

    constructor(client: Stan){
        super(client);
    }

}

export default ComplianceUpdatedPublisher;