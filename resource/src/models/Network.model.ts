import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { INetworkDoc } from '../utils/types.util'

const NetworkSchema = new mongoose.Schema (

    {
        name: {
            type: String,
            default: ''
        },

        description: {
            type: String,
            default: ''
        },

        label: {
            type: String,
            default: ''
        },

        logo: {
            type: String,
            default: ''
        },

        slug: String,

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

NetworkSchema.set('toJSON', { getters: true, virtuals: true });

NetworkSchema.pre<INetworkDoc>('save', async function(next){
    this.slug = slugify(this.name, { lower: true });
    next();
});

NetworkSchema.statics.getAllRoles = () => {
    return Network.find({});
}

// define the model constant
const Network: Model<INetworkDoc> = mongoose.model<INetworkDoc>('Network', NetworkSchema);

export default Network;