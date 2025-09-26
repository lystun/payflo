import { Stan  } from 'node-nats-streaming';
import { DEVSubjects, Publisher, STGSubjects, Subjects } from '@btffamily/vacepay';
import ENV from '../../utils/env.util';

class LocationSavedPublisher extends Publisher {

    subject = ENV.isProduction() ? Subjects.LocationSaved : ENV.isStaging() ? STGSubjects.LocationSaved : DEVSubjects.LocationSaved;

    constructor(client: Stan){
        super(client)
    }

}

export default LocationSavedPublisher;