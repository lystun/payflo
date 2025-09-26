import { Stan } from 'node-nats-streaming';
import { Listener, STGSubjects, Subjects, Random, SyncAction, SyncType, DEVSubjects } from '@btffamily/vacepay';
import QueueGroupName from '../groupName';

import ENV from '../../utils/env.util';
import NotificationService from '../../services/notification.service';
import User from '../../models/User.model';
import SMSService from '../../services/sms.service';
import SystemService from '../../services/system.service';

class NotificationCreatedListener extends Listener {

    subject = ENV.isProduction() ? Subjects.NotificationCreated : ENV.isStaging() ? STGSubjects.NotificationCreated : DEVSubjects.NotificationCreated;
    queueGroupName = QueueGroupName.Vace + `.${process.env.NATS_LISTEN_ID}.${Random.randomCode(3, true)}`;

    constructor(client: Stan){
        super(client)
    }

    async onMessage(data: any, msg: any){

        // get the message data
        const { message, email, title, smsMessage } = data;
        const action: SyncAction = data.action;
        const type: SyncType = data.type;

        msg.ack(); // acknowlege NAts message

        if(action === 'notification.created' && type === 'type.notification'){

            const user = await User.findOne({ email });
            const config = await SystemService.getSystemConfig();

            if (user && message && config) {
            
                // create dashboard notification
                if(config.notifications.dashboard){

                    await NotificationService.createNotification({
                        user: user,
                        title,
                        message
                    });

                }

                // send SMS notification
                if(config.notifications.sms){

                    await SMSService.sendNotificationSMS({
                        driver: 'africas-talking',
                        message: smsMessage,
                        user: user,
                    });

                }

            } 

            
        }

            
        
    }   

}

export default NotificationCreatedListener;