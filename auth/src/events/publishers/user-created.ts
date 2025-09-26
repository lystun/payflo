import { Stan } from 'node-nats-streaming'
import { Publisher, Subjects, STGSubjects, DEVSubjects } from '@btffamily/vacepay'
import ENV from '../../utils/env.util';

class UserCreatedPublisher extends Publisher {

    subject = ENV.isProduction() ? Subjects.UserCreated : ENV.isStaging() ? STGSubjects.UserCreated : DEVSubjects.UserCreated;

    constructor(client: Stan){
        super(client);
    }

}

export default UserCreatedPublisher;