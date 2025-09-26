import { Stan } from 'node-nats-streaming'
import { Publisher, Subjects, STGSubjects, DEVSubjects } from '@btffamily/vacepay'
import ENV from '../../utils/env.util';

class NotificationCreatedPublisher extends Publisher {

    subject = ENV.isProduction() ? Subjects.NotificationCreated : ENV.isStaging() ? STGSubjects.NotificationCreated : DEVSubjects.NotificationCreated;

    constructor(client: Stan){
        super(client);
    }

}

export default NotificationCreatedPublisher;