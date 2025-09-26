import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IPaymentLinkDoc } from '../utils/types.util'

const PaymentLinkSchema = new mongoose.Schema(

    {
        analytics: {
            amount: {
                type: Number,
                default: 0
            },
            totalAmount: {
                type: Number,
                default: 0
            },
            revenue: {
                type: Number,
                default: 0
            },
            vat: {
                type: Number,
                default: 0
            },
            providerFee: {
                type: Number,
                default: 0
            },
            count: {
                type: Number,
                default: 0
            },
            today: {
                type: Number,
                default: 0
            }
        },

        link: {
            type: String,
            default: ''
        },

        qrcode: {
            type: String,
            default: ''
        },

        redirectUrl: {
            type: String,
            default: ''
        },

        message: {
            type: String,
            default: ''
        },

        options: {

            card: {
                type: Boolean,
                default: true
            },
            transfer: {
                type: Boolean,
                default: true
            },
            bank: {
                type: Boolean,
                default: false
            },
            ussd: {
                type: Boolean,
                default: false
            },
            bankQR: {
                type: Boolean,
                default: false
            }
        },

        type: {
            type: String,
            enum: ['fixed', 'dynamic'],
            default: 'dynamic'
        },

        feature: {
            type: String,
            enum: ['product', 'invoice', 'request'],
            default: 'request'
        },

        initialized: {
            type: Boolean,
            default: false
        },

        initializeRef: {
            type: String,
            default: ''
        },

        reuseable: {
            type: Boolean,
            default: false
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

        amount: {
            type: Number,
            default: 0
        },

        totalAmount: {
            type: Number,
            default: 0
        },

        slug: {
            type: String,
            unique: [true, 'URL identifier already exists']
        },

        metadata: [
            {
                type: mongoose.Schema.Types.Mixed,
                default: null
            }
        ],

        customer: {
            email: {
                type: String,
                default: ''
            },
            firstName: {
                type: String,
                default: ''
            },
            lastName: {
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
            }
        },

        business: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Business'
        },

        product: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Product',
            default: null
        },

        invoice: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Invoice',
            default: null
        },

        subaccounts: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Subaccount',
                default: null
            }
        ],

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

PaymentLinkSchema.set('toJSON', { getters: true, virtuals: true });

PaymentLinkSchema.pre<IPaymentLinkDoc>('save', async function (next) {
    // this.slug = slugify(`${this.name}`, { lower: true });
    next();
});

// define the model constant
const PaymentLink: Model<IPaymentLinkDoc> = mongoose.model<IPaymentLinkDoc>('PaymentLink', PaymentLinkSchema);

export default PaymentLink;
