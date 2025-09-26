import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IVerificationDoc } from '../utils/types.util'

const VerificationSchema = new mongoose.Schema (

    {

        basic: {
            type: String,
            enum: ['pending', 'submitted', 'approved', 'declined', 'on-hold'],
            default: 'pending'
        },

        bvn: {
            type: String,
            enum: ['pending', 'submitted', 'approved', 'declined', 'on-hold'],
            default: 'pending'
        },

        nin: {
            type: String,
            enum: ['pending', 'submitted', 'approved', 'declined', 'on-hold'],
            default: 'pending'
        },

        ID: {
            type: String,
            enum: ['pending', 'submitted', 'approved', 'declined', 'on-hold'],
            default: 'pending'
        },

        biometric: {
            type: Boolean,
            default: false
        },

        face: {
            type: String,
            enum: ['pending', 'submitted', 'approved', 'declined', 'on-hold'],
            default: 'pending'
        },

        address: {
            type: String,
            enum: ['pending', 'submitted', 'approved', 'declined', 'on-hold'],
            default: 'pending'
        },

        kyb: {
            type: String,
            enum: ['pending', 'submitted', 'approved', 'declined', 'on-hold'],
            default: 'pending'
        },

        kyc: {
            type: String,
            enum: ['pending', 'submitted', 'approved', 'declined', 'on-hold'],
            default: 'pending'
        },

        sms: {
            type: Boolean,
            default: false
        },

        email: {
            type: Boolean,
            default: true
        },

        bvnLimit: {
            type: Number,
            default: 0
        },

        ninLimit: {
            type: Number,
            default: 0
        },

        security: {

            label: {
                type: String,
                default: ''
            },

            question: {
                type: String,
                default: ''
            },

            answer: {
                type: String,
                default: ''
            },

            isSubmitted: {
                type: Boolean,
                default: false
            }

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
            transform(doc, ret){
                ret.id = ret._id
            }
        }
    }

)

VerificationSchema.set('toJSON', { getters: true, virtuals: true });

VerificationSchema.pre<IVerificationDoc>('save', async function(next){
    next();
});

VerificationSchema.statics.getAllVerifications = () => {
    return Verification.find({});
}

// define the model constant
const Verification: Model<IVerificationDoc> = mongoose.model<IVerificationDoc>('Verification', VerificationSchema);

export default Verification;
