import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { ISubscriberDoc } from '../utils/types.util'

const SubscriberSchema = new mongoose.Schema (

    {

        name: {
            type: String,
            default: 'Champ'
        },

        email: {
            type: String,
            unique: [true, 'email already exists']
        },

        dp: {
            type: String,
            default: 'no-image.jpg'
        },

        code: {
            type: String
        },

        clicks: [
            {
                subscriber: {
                    type: mongoose.Schema.Types.Mixed,
                    ref: 'Subscriber'
                },

                count:{
                    type: Number,
                    default: 0
                },

                medium:{
                    type: String,
                    default: ''
                },

                source:{
                    type: String,
                    default: ''
                },

                clickedAt:{
                    type: mongoose.Schema.Types.Mixed,
                    default: ''
                }
            },
        ],

        leftAt: {
            type: String
        },

        slug: String,

        isEnabled: {
            type: Boolean,
            default: true
        }

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

)

SubscriberSchema.set('toJSON', { getters: true, virtuals: true });

SubscriberSchema.pre<ISubscriberDoc>('save', async function(next){
    this.slug = slugify(this.name, { lower: true });
    next();
});

SubscriberSchema.statics.getSubscribers = () => {
    return Subscriber.findOne({});
}

// define the model constant
const Subscriber: Model<ISubscriberDoc> = mongoose.model<ISubscriberDoc>('Subscriber', SubscriberSchema);

export default Subscriber;
