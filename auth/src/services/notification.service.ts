import { ObjectId } from 'mongoose';
import { NewNotificationDTO } from '../dtos/notification.dto';
import { GetNotifySocketDTO } from '../dtos/user.dto';
import Audit from '../models/Audit.model';
import Notification from '../models/Notification.model';
import { IAuditDoc, INotificationDoc, IResult } from '../utils/types.util'
import mongoUtil from '../utils/mongo.util';

class NotificationService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    public async createNotification(data: NewNotificationDTO): Promise<INotificationDoc> {

        const notification = await Notification.create({
            user: data.user._id,
            title: data.title,
            body: data.message,
            status: 'new'
        });

        data.user.notifications.push(notification._id)
        await data.user.save()


        return notification;

    }

    /**
     * @name getNotificationsViaSocket
     * @param data 
     * @returns 
     */
    public async getNotificationsViaSocket(data: GetNotifySocketDTO): Promise<Array<INotificationDoc>>{

        let result: Array<INotificationDoc> = [];

        const convId = mongoUtil.stringToMongoId(data.userId);
        const notifications = await Notification.find({ user: convId, status: 'new' });

        if(notifications && notifications.length > 0){
            result = notifications;
        }

        return result;

    }

    /**
     * @name markAsRead
     * @param notification 
     * @returns 
     */
    public async markAsRead(notification: INotificationDoc): Promise<INotificationDoc>{

        if(notification.status === 'new'){
            notification.status = 'read';
            await notification.save()
        }

        return notification;

    }

}

export default new NotificationService();