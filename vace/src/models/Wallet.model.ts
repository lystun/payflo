import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IWalletDoc } from '../utils/types.util'

const WalletSchema = new mongoose.Schema (

    {

        walletID: {
            type: String,
            default: ''
        },

        currency: {
            type: String,
            default: ''
        },

        email: {
            type: String,
            default: ''
        },

        balance: {

            available: {
                type: Number,
                default: 0.00
            },

            locked: {
                type: Number,
                default: 0.00
            },

            settlement: {
                type: Number,
                default: 0.00
            },

            ledger: {
                type: Number,
                default: 0.00
            },

            paystack: {
                type: Number
            }

        },

        transfer: {

            value: {
                type: Number,
                default: 0
            },

            count: {
                type: Number,
                default: 0
            },

            updatedAt: {
                type: mongoose.Schema.Types.Mixed,
                default: ''
            }

        },

        withdrawal: {

            value: {
                type: Number,
                default: 0
            },

            count: {
                type: Number,
                default: 0
            },

            updatedAt: {
                type: mongoose.Schema.Types.Mixed,
                default: ''
            }

        },

        inflow: {

            value: {
                type: Number,
                default: 0
            },

            count: {
                type: Number,
                default: 0
            },

            updatedAt: {
                type: mongoose.Schema.Types.Mixed,
                default: ''
            }

        },

        reversal: {

            value: {
                type: Number,
                default: 0
            },

            count: {
                type: Number,
                default: 0
            },

            updatedAt: {
                type: mongoose.Schema.Types.Mixed,
                default: ''
            }

        },

        outflow: {

            value: {
                type: Number,
                default: 0
            },

            count: {
                type: Number,
                default: 0
            },

            updatedAt: {
                type: mongoose.Schema.Types.Mixed,
                default: ''
            }

        },

        slug: String,

        business: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Business'
        },

        account: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Account'
        },

        transactions: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Transaction'
            }
        ],

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

WalletSchema.set('toJSON', { getters: true, virtuals: true });

WalletSchema.pre<IWalletDoc>('save', async function(next){
    this.slug = slugify(`${this.walletID}`, { lower: true });
    next();
});

// define the model constant
const Wallet: Model<IWalletDoc> = mongoose.model<IWalletDoc>('Wallet', WalletSchema);

export default Wallet;
