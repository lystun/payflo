import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { INotificationDoc } from '../utils/types.util'

const NotificationSchema = new mongoose.Schema (

    {
        title: {
            type: String,
            default: ''
        },

        body: {
            type: String,
            default: ''
        },

        status: {
            type: String,
            enum: ['new', 'read'],
            default: ''
        },

        user: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'User'
        },

    },

    {
        timestamps: true,
        versionKey: '_version',
        toJSON: {
            transform(doc, ret){
                ret.id = ret._id
            }
        }
    }

);

NotificationSchema.set('toJSON', { getters: true, virtuals: true });

NotificationSchema.pre<INotificationDoc>('save', async function(next){
    next();
});

NotificationSchema.statics.getAllRoles = () => {
    return Notification.find({});
}

// define the model constant
const Notification: Model<INotificationDoc> = mongoose.model<INotificationDoc>('Notification', NotificationSchema);

export default Notification;