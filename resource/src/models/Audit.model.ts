import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IAuditDoc } from '../utils/types.util'

const AuditSchema = new mongoose.Schema (

    {
        entity: {
            type: String,
            default: ''
        },

        controller: {
            type: mongoose.Schema.Types.Mixed,
            default: ''
        },

        action: {
            type: String,
            default: ''
        },

        description: {
            type: String,
            default: ''
        },

        changes: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        slug: String,

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

AuditSchema.set('toJSON', { getters: true, virtuals: true });

AuditSchema.pre<IAuditDoc>('save', async function(next){
    this.slug = slugify(this.entity, { lower: true });
    next();
});

AuditSchema.statics.getAllRoles = () => {
    return Audit.find({});
}

// define the model constant
const Audit: Model<IAuditDoc> = mongoose.model<IAuditDoc>('Audit', AuditSchema);

export default Audit;