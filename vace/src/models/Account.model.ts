import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IAccountDoc } from '../utils/types.util'

const AccountSchema = new mongoose.Schema (

    {

        code: {
            type: String,
            default: ''
        },

        currency: {
            type: String,
            default: ''
        },

        accountNo: {
            type: String,
            default: ''
        },

        isEnabled: {
            type: Boolean,
            default: true
        },

        bank: {

            legalName: {
                type: String,
                default: ''
            },

            name: {
                type: String,
                default: ''
            },

            bankType: {
                type: String,
                default: ''
            },

            bankCode: {
                type: String,
                default: ''
            }

        },


        accountName: {
            type: String,
            default: ''
        },

        accountType: {
            type: String,
            default: ''
        },

        providerRef: {
            type: String,
            default: ''
        },

        description: {
            type: String,
            default: ''
        },

        balance: {
            type: Number,
            default: 0
        },

        limits: [
            {
                _id: false,
                
                name: {
                    type: String,
                    default: ''
                },
                label: {
                    type: String,
                    default: ''
                },
                value: {
                    type: Number,
                    default: 0
                },
            }
        ],

        customer: {

            reference: {
                type: String,
                default: ''
            },
            note: {
                type: String,
                default: ''
            }
            
        },

        slug: String,

        business: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Business'
        },

        wallet: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Wallet'
        },

        provider: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Provider'
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

AccountSchema.set('toJSON', { getters: true, virtuals: true });

AccountSchema.pre<IAccountDoc>('save', async function(next){
    this.slug = slugify(`${this.accountName}`, { lower: true });
    next();
});

// define the model constant
const Account: Model<IAccountDoc> = mongoose.model<IAccountDoc>('Account', AccountSchema);

export default Account;
