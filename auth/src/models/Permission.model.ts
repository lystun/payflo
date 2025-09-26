import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IPermissionDoc } from '../utils/types.util'

const PermissionSchema = new mongoose.Schema(

    {

        name: {
            type: String,
            default: ''
        },
        entity: {
            type: String,
            default: ''
        },
        slug: {
            type: String,
            default: ''
        },

        actions: [
            {
                label: {
                    type: String,
                    default: ''
                },
                description: {
                    type: String,
                    default: ''
                }
            }
        ],

        updatedBy: {
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

PermissionSchema.set('toJSON', { getters: true, virtuals: true });

PermissionSchema.pre<IPermissionDoc>('save', async function (next) {
    this.slug = slugify(`${this.name}-permission`, { lower: true });
    next();
});

// define the model constant
const Permission: Model<IPermissionDoc> = mongoose.model<IPermissionDoc>('Permission', PermissionSchema);

export default Permission;
