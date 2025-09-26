import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { ISystemDoc } from '../utils/types.util'
import { UIID } from '@btffamily/vacepay';

const SystemSchema = new mongoose.Schema (

    {
        email: {
            type: String,
            default: ''
        },

        notifications: {
            sms: {
                type: Boolean,
                default: false
            },
            email: {
                type: Boolean,
                default: true
            },
            push: {
                type: Boolean,
                default: false
            },
            dashboard: {
                type: Boolean,
                default: true
            },
        },

        update: {

            updatedBy: {
                type: mongoose.Schema.Types.Mixed,
                ref: 'User'
            },

            changes: {
                type: mongoose.Schema.Types.Mixed,
                default: null,
                select: false
            },

        },

        slug: {
            type: String,
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

);

SystemSchema.set('toJSON', { getters: true, virtuals: true });

SystemSchema.pre<ISystemDoc>('save', async function(next){
    this.slug = slugify(UIID(1), { lower: true });
    next();
});

SystemSchema.statics.getAllRoles = () => {
    return System.find({});
}

// define the model constant
const System: Model<ISystemDoc> = mongoose.model<ISystemDoc>('System', SystemSchema);

export default System;