import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IChargebackDoc } from '../utils/types.util'

const ChargebackSchema = new mongoose.Schema (

    {

        amount: {
            type: Number,
            default: 0
        },

        dueDate: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        timeline: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        providerRef: {
            type: String,
            default: ''
        },

        reference: {
            type: String,
            default: ''
        },

        message: {
            type: String,
            default: ''
        },

        code: {
            type: String,
            default: ''
        },

        status: {
            type: String,
            enum: ['pending','accepted', 'declined', 'completed'],
            default: 'pending'
        },

        level: {
            type: String,
            enum: ['level1','level2', 'pre-arbitration', 'arbitration'],
            default: 'level1'
        },

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

        slug: String,

        initiated: {
            
            date: {
                type: String,
                default: ''
            },

            time: {
                type: String,
                default: ''
            },

            ISO: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            }

        },

        paidAt: {
            
            date: {
                type: String,
                default: ''
            },

            time: {
                type: String,
                default: ''
            },

            ISO: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            }

        },

        response: {
            
            message: {
                type: String,
                default: ''
            },

            evidence: {
                type: String,
                default: ''
            }

        },

        receipt: {
            type: String,
            default: ''
        },

        business: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Business'
        },

        transaction: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Transaction'
        },

        chargedTxn: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Transaction'
        },

        provider: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Provider'
        },

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

)

ChargebackSchema.set('toJSON', { getters: true, virtuals: true });

ChargebackSchema.pre<IChargebackDoc>('save', async function(next){
    this.slug = slugify(this.code, { lower: true });
    next();
});

// define the model constant
const Chargeback: Model<IChargebackDoc> = mongoose.model<IChargebackDoc>('Chargeback', ChargebackSchema);

export default Chargeback;
