import { Stan } from 'node-nats-streaming'
import { Publisher, Subjects, STGSubjects, DEVSubjects } from '@btffamily/vacepay'
import ENV from '../../utils/env.util';

class UserDeletedPublisher extends Publisher {

    subject = ENV.isProduction() ? Subjects.UserDeleted : ENV.isStaging() ? STGSubjects.UserDeleted : DEVSubjects.UserDeleted;

    constructor(client: Stan){
        super(client);
    }

}

export default UserDeletedPublisher;