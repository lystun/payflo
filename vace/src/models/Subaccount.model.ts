import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { ISubaccountDoc } from '../utils/types.util'

const SubaccountSchema = new mongoose.Schema(

    {

        analytics: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        code: {
            type: String,
            default: ''
        },

        isEnabled: {
            type: Boolean,
            default: true
        },

        name: {
            type: String,
            default: ''
        },

        description: {
            type: String,
            default: ''
        },

        phoneNumber: {
            type: String,
            default: ''
        },

        phoneCode: {
            type: String,
            default: ''
        },

        email: {
            type: String,
            default: ''
        },

        inflow: {
            value: {
                type: Number,
                default: 0
            },
            count: {
                type: Number,
                default: 0
            }
        },

        split: {

            value: {
                type: Number,
                default: 0
            },

            type: {
                type: String,
                enum: ['percentage', 'flat'],
                default: 'percentage'
            }
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
            platformCode: {
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
        },

        slug: String,

        business: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Business'
        },

        transactions: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Transaction'
            },
        ]

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

SubaccountSchema.set('toJSON', { getters: true, virtuals: true });

SubaccountSchema.pre<ISubaccountDoc>('save', async function (next) {
    this.slug = slugify(`${this.name}`, { lower: true });
    next();
});

// define the model constant
const Subaccount: Model<ISubaccountDoc> = mongoose.model<ISubaccountDoc>('Subaccount', SubaccountSchema);

export default Subaccount;
