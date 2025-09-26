import { IResult } from '../utils/types.util'
import { EventEmitter } from 'events'

class EventService extends EventEmitter {

    constructor () {
        super ()
        this.setMaxListeners(80000);
    }

}

export default EventService;