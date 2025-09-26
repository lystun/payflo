import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IAnnouncementDoc } from '../utils/types.util'

const AnnouncementSchema = new mongoose.Schema(

    {

        title: {
            type: String,
            required: [true, 'title is required']
        },

        description: {
            type: String,
            default: ''
        },

        code: {
            type: String,
            default: ''
        },

        slug: {
            type: String,
            default: ''
        },

        mail: {
            subject: {
                type: String,
                default: ''
            },
            message: {
                type: String,
                default: ''
            },
            marked: {
                type: String,
                default: ''
            }
        },

        mobile: {
            title: {
                type: String,
                default: ''
            },
            message: {
                type: String,
                default: ''
            },
            sms: {
                type: Boolean,
                default: false
            },
            push: {
                type: Boolean,
                default: false
            }
        },

        web: {
            title: {
                type: String,
                default: ''
            },
            message: {
                type: String,
                default: ''
            },
            dashboard: {
                type: Boolean,
                default: false
            },
            isPublic: {
                type: Boolean,
                default: false
            }
        },

        avatar: {
            type: String,
            default: ''
        },

        url: {
            type: String,
            default: ''
        },

        user: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'User'
        }

    },

    {
        timestamps: true,
        versionKey: '_version',
        toJSON: {
            transform(doc, ret) {
                ret.id = ret._id
            }
        }
    }

)

AnnouncementSchema.set('toJSON', { getters: true, virtuals: true });

AnnouncementSchema.pre<IAnnouncementDoc>('save', async function (next) {
    this.slug = slugify(this.title, { lower: true });
    next();
});

AnnouncementSchema.statics.getAllAnnouncements = () => {
    return Announcement.find({});
}

// define the model constant
const Announcement: Model<IAnnouncementDoc> = mongoose.model<IAnnouncementDoc>('Announcement', AnnouncementSchema);

export default Announcement;
