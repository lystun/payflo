import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IBlackListDoc } from '../utils/types.util'

const BlacklistSchema = new mongoose.Schema (

    {

        fullname: {
            type: String,
        },

        email: {
            type: String
        },

        listedAt: {
            type: mongoose.Schema.Types.Mixed,
            default: ''
        },

        dueAt: {
            type: mongoose.Schema.Types.Mixed,
            default: ''
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

)

BlacklistSchema.set('toJSON', { getters: true, virtuals: true });

BlacklistSchema.pre<IBlackListDoc>('save', async function(next){
    next();
});

BlacklistSchema.statics.getAllBlacklists = () => {
    return Blacklist.find({});
}

// define the model constant
const Blacklist: Model<IBlackListDoc> = mongoose.model<IBlackListDoc>('Blacklist', BlacklistSchema);

export default Blacklist;
