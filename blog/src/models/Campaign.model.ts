import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { ICampaignDoc } from '../utils/types.util'


const CampaignSchema = new mongoose.Schema (

    {

        title: {
            type: String,
            required: [true, 'title is required']
        },

        headline: {
            type: String,
            default: ''
        },

        description: {
            type: String,
            default: ''
        },

        slug: String,

        isEnabled: {
            type: Boolean,
            default: true
        },

        status: {
            type: String,
            enum: ['pending', 'published'],
            default: 'pending'
        },  

        code: {
            type: String,
            default: ''
        },

        premalink: {
            type: String,
            default: ''
        },

        sections: [
            {
                label: {
                    type: String,
                    default: ''
                },
                caption: {
                    type: String,
                    default: ''
                },
                thumbnail: {
                    type: String,
                    default: ''
                },
                body: {
                    type: String,
                    default: ''
                },
                marked: {
                    type: String,
                    default: ''
                },
                url: {
                    type: String,
                    default: ''
                },
                footnote: {
                    type: String,
                    default: ''
                },
                color: {
                    type: String,
                    default: ''
                },
            }
        ],

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

        seen: [
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

                seenAt:{
                    type: mongoose.Schema.Types.Mixed,
                    default: ''
                }
            },
        ],

        user: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'User'
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

CampaignSchema.set('toJSON', { getters: true, virtuals: true });

CampaignSchema.pre<ICampaignDoc>('save', async function(next){
    this.slug = slugify(this.title, { lower: true });
    next();
});

CampaignSchema.statics.findByCampaignId = (id) => {
    return Campaign.findOne({userId: id});
}

// define the model constant
const Campaign: Model<ICampaignDoc> = mongoose.model<ICampaignDoc>('Campaign', CampaignSchema);

export default Campaign;
