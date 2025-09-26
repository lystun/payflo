/** Abstract Class Listener 
 * 
 * @class Listener
 * 
*/

import nats, { Stan } from 'node-nats-streaming'
import { Subjects, STGSubjects } from './subjects.ev'

interface IListener {

    subject: Subjects | STGSubjects;
    client: Stan;
    _ackwait: number;
    queueGroupName: any;
    
    subscriptionOptions(): any;
    onMessage(data: object, message: any): void;
    parseMessage(message: any): object;
    listen(): void

}

class Listener implements IListener {

    public subject: any;
    public queueGroupName: any;
    public client: Stan;

    public _ackwait: number = 1 * 1000;

    constructor(client: Stan){
        this.client = client;
    }

    subscriptionOptions(){

        return this.client
        .subscriptionOptions()
        .setDeliverAllAvailable()
        .setManualAckMode(true)
        .setAckWait(this._ackwait)
        .setStartAtTimeDelta(1 * 1000)  // starting at a specific amount of time in the past 
        .setDurableName(this.queueGroupName);

    }


    public listen(log: boolean = true) {

        // create the subscription
        const subscription = this.client.subscribe(
            this.subject, this.queueGroupName, this.subscriptionOptions()
        )

        subscription.on('message', (msg) => {

            if(log === true){
                console.log(`Message recieved from ${this.subject}/${this.queueGroupName}`);
            }

            const parsedData = this.parseMessage(msg);
            this.onMessage(parsedData, msg);

        })

    }


    public parseMessage(message: any): object {

        const data = message.getData();

        return typeof(data) === 'string' 
        ? JSON.parse(data)
        : JSON.parse(data.toString('utf8'));

    }

    public onMessage(data: object, message: any): void {}

}


export default Listener;