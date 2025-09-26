import { Stan } from 'node-nats-streaming'
import { DEVSubjects, Publisher, STGSubjects, Subjects } from '@btffamily/vacepay'
import ENV from '../../utils/env.util';

class UserUpdatedPublisher extends Publisher {

    subject = ENV.isProduction() ? Subjects.UserUpdated : ENV.isStaging() ? STGSubjects.UserUpdated : DEVSubjects.UserUpdated;

    constructor(client: Stan){
        super(client);
    }

}

export default UserUpdatedPublisher;