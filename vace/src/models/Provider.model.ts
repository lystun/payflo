import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IProviderDoc } from '../utils/types.util'

const ProviderSchema = new mongoose.Schema (

    {

        code: {
            type: String,
            default: ''
        },

        type: {
            type: String,
            enum: ['bank', 'fintech'],
            default: ''
        },

        name: {
            type: String,
            default: ''
        },

        isEnabled: {
            type: Boolean,
            default: false
        },

        bankProvider: {
            type: Boolean,
            default: false
        },

        cardProvider: {
            type: Boolean,
            default: false
        },

        billsProvider: {
            type: Boolean,
            default: false
        },

        verveProvider: {
            type: Boolean,
            default: false
        },

        masterProvider: {
            type: Boolean,
            default: false
        },

        debitProvider: {
            type: Boolean,
            default: false
        },

        visaProvider: {
            type: Boolean,
            default: false
        },

        legalName: {
            type: String,
            default: ''
        },

        description: {
            type: String,
            default: ''
        },

        fee: {

            percent: {
                type: Number,
                default: 0
            },

            flat: {
                type: Number,
                default: 0
            },

            capped: {
                type: Number,
                default: 0
            },

        },

        vaceInflow: {

            chargeFee: {
                type: Boolean,
                default: false
            },

            type: {
                type: String,
                enum: ['flat', 'percentage'],
                default: 'percentage'
            },

            value: {
                type: Number,
                default: 0
            },

            providerFee: {
                type: Number,
                default: 0
            },

            capped: {
                type: Number,
                default: 0
            },

            providerCap: {
                type: Number,
                default: 0
            },

            markup: {
                type: Number,
                default: 0
            },

            providerMarkup: {
                type: Number,
                default: 0
            },

            stampDuty: {
                type: Number,
                default: 0
            },


        },

        vaceOutflow: {

            chargeFee: {
                type: Boolean,
                default: true
            },

            type: {
                type: String,
                enum: ['flat', 'percentage'],
                default: 'percentage'
            },

            value: {
                type: Number,
                default: 0
            },

            providerFee: {
                type: Number,
                default: 0
            },

            capped: {
                type: Number,
                default: 0
            },

            providerCap: {
                type: Number,
                default: 0
            },

            markup: {
                type: Number,
                default: 0
            },

            providerMarkup: {
                type: Number,
                default: 0
            },

            stampDuty: {
                type: Number,
                default: 0
            },


        },

        offers: {

            banking: {
                type: Boolean,
                default: false
            },

            card: {
                type: Boolean,
                default: false
            },
            bankTransfer: {
                type: Boolean,
                default: false
            },
            mobileMoney: {
                type: Boolean,
                default: false
            },
            eWallet: {
                type: Boolean,
                default: false
            },
            ussd: {
                type: Boolean,
                default: false
            },
            crypto: {
                type: Boolean,
                default: false
            },
            ngResolve: {
                type: Boolean,
                default: false
            },
            gbResolve: {
                type: Boolean,
                default: false
            },
            phoneResolve: {
                type: Boolean,
                default: false
            },
            banks: {
                type: Boolean,
                default: false
            },
            refund: {
                type: Boolean,
                default: false
            },
            chargeback: {
                type: Boolean,
                default: false
            },
            kyc: {
                type: Boolean,
                default: false
            },
            QRCode: {
                type: Boolean,
                default: false
            },
            bills: {
                type: Boolean,
                default: false
            },
            directDebit: {
                type: Boolean,
                default: false
            }
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

)

ProviderSchema.set('toJSON', { getters: true, virtuals: true });

ProviderSchema.pre<IProviderDoc>('save', async function(next){
    this.slug = slugify(`${this.name}`, { lower: true });
    next();
});

// define the model constant
const Provider: Model<IProviderDoc> = mongoose.model<IProviderDoc>('Provider', ProviderSchema);

export default Provider;
