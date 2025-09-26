import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IRefundDoc } from '../utils/types.util'

const RefundSchema = new mongoose.Schema (

    {

        option: {
            type: String,
            enum: ['instant', 'request'],
            default: 'instant'
        },

        type: {
            type: String,
            enum: ['partial', 'full'],
            default: 'full'
        },

        code: {
            type: String,
            default: ''
        },

        reason: {
            type: String,
            default: ''
        },

        status: {
            type: String,
            enum: ['pending', 'processing', 'successful', 'completed', 'failed'],
            default: 'pending'
        },

        slug: String,

        bank: {
            accountNo: {
                type: String,
                default: ''
            },
            accountName: {
                type: String,
                default: ''
            },
            bankCode: {
                type: String,
                default: ''
            },
            legalName: {
                type: String,
                default: ''
            },
            name: {
                type: String,
                default: ''
            },
            platformCode: {
                type: String,
                default: ''
            }
        },

        paidAt: {
            
            day: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            },

            time: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            },

            ISO: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            }

        },

        reference: {
            type: String,
            default: ''
        },

        providerRef: {
            type: String,
            default: ''
        },

        amount: {
            type: Number,
            default: 0
        },

        business: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Business'
        },

        transaction: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Transaction'
        },

        refundedTxn:
        {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Transaction'
        },

        provider: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Provider'
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

RefundSchema.set('toJSON', { getters: true, virtuals: true });

RefundSchema.pre<IRefundDoc>('save', async function(next){
    this.slug = slugify(this.code, { lower: true });
    next();
});

// define the model constant
const Refund: Model<IRefundDoc> = mongoose.model<IRefundDoc>('Refund', RefundSchema);

export default Refund;
