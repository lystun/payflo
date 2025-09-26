import { Stan  } from 'node-nats-streaming';
import { DEVSubjects, Publisher, STGSubjects, Subjects } from '@btffamily/vacepay';
import ENV from '../../utils/env.util';

class CountryFoundPublisher extends Publisher {

    subject = ENV.isProduction() ? Subjects.CountryFound : ENV.isStaging() ? STGSubjects.CountryFound : DEVSubjects.CountryFound;

    constructor(client: Stan){
        super(client)
    }

}

export default CountryFoundPublisher;