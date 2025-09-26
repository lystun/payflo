import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { ITransactionDoc } from '../utils/types.util'

const TransactionSchema = new mongoose.Schema(

    {

        type: {
            type: String,
            enum: ['default', 'credit', 'debit'],
            default: 'default'
        },

        feature: {
            type: String,
            enum: ['bank-account', 'bank-settlement', 'bank-transfer', 'wallet-transfer', 'wallet-withdraw', 'wallet-vas', 'wallet-airtime', 'wallet-data', 'wallet-bill', 'wallet-refund', 'api-refund', 'wallet-reversal', 'wallet-chargeback', 'payment-link', 'internal-credit', 'internal-debit', 'internal-transfer'],
            default: ''
        },

        reference: {
            type: String,
            default: ''
        },

        currency: {
            type: String,
            default: ''
        },

        providerRef: {
            type: String,
            default: ''
        },

        providerName: {
            type: String,
            default: ''
        },

        merchantRef: {
            type: String,
            default: ''
        },

        narration: {
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

        unitAmount: {
            type: Number,
            default: 0
        },

        fee: {
            type: Number,
            default: 0
        },

        unitFee: {
            type: Number,
            default: 0
        },

        vatFee: {
            type: Number,
            default: 0
        },

        unitVatFee: {
            type: Number,
            default: 0
        },

        stampFee: {
            type: Number,
            default: 0
        },

        unitStampFee: {
            type: Number,
            default: 0
        },

        revenue: {

            amount: {
                type: Number,
                default: 0,
                select: false
            },

            unitAmount: {
                type: Number,
                default: 0,
                select: false
            },
            reversed: {
                type: Number,
                default: 0,
                select: false
            },

            unitReversed: {
                type: Number,
                default: 0,
                select: false
            }

        },

        unitRevenue: {
            type: Number,
            default: 0
        },

        productQty: {
            type: Number,
            default: 0
        },

        refundData: {
            refundType: {
                type: String,
                default: ''
            },
            amount: {
                type: Number,
                default: 0
            }
        },

        partialAmount: {
            collected: {
                type: Number,
                default: 0
            },
            unitCollected: {
                type: Number,
                default: 0
            },
            outstanding: {
                type: Number,
                default: 0
            },
            unitOutstanding: {
                type: Number,
                default: 0
            }
        },

        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'successful', 'paid', 'failed', 'refunded', 'cancelled'],
            default: 'pending'
        },

        settle: {

            destination: {
                type: String,
                enum: ['pending', 'wallet', 'bank'],
                default: 'pending'
            },

            status: {
                type: String,
                enum: ['pending', 'completed'],
                default: 'pending'
            },

            amount: {
                type: Number,
                default: 0,
            },

            settledAt: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            }

        },

        vasData: {

            ref: {
                type: String,
                default: ''
            },

            type: {
                type: String,
                default: ''
            },

            network: {
                type: String,
                default: ''
            },

            phoneNumber: {
                type: String,
                default: ''
            },

            billerCode: {
                type: String,
                default: ''
            },

            billerName: {
                type: String,
                default: ''
            },

            hasToken: {
                type: Boolean,
                default: false
            },

            token: {
                type: String,
                default: ''
            },

        },

        ipAddress: {
            type: String,
            default: ''
        },

        bank: {

            name: {
                type: String,
                default: ''
            },

            accountNo: {
                type: String,
                default: ''
            },

            accountName: {
                type: String,
                default: ''
            },

            accountType: {
                type: String,
                default: 'temporary'
            },

            expire: {
                hours: {
                    type: Number,
                    default: 0
                },
                minutes: {
                    type: Number,
                    default: 0
                },
                date: {
                    type: String,
                    default: 'year'
                }
            },

            logo: {
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

            bankId: {
                type: String,
                default: ''
            }

        },

        customer: {
            ref: {
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
            email: {
                type: String,
                default: ''
            },
            accountNo: {
                type: String,
                default: ''
            },
            sourceAccount: {
                type: String,
                default: ''
            },
            city: {
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

            state: {
                type: String,
                default: ''
            },
        },

        slug: String,

        providerData: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        webhook: {
            enabled: {
                type: Boolean,
                default: false,
            },
            event: {
                type: String,
                default: '',
            },

            sessionId: {
                type: String,
                default: '',
            },

            isSent: {
                type: Boolean,
                default: false,
            }
        },

        balance: {

            initial: {
                type: Number,
                default: 0,
                select: false
            },

            final: {
                type: Number,
                default: 0,
                select: false
            },
        },

        metadata: [
            {
                type: mongoose.Schema.Types.Mixed,
                default: null
            }
        ],

        channel: {
            type: String,
            default: '',
        },

        source: {
            type: String,
            default: '',
        },

        business: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Business'
        },

        wallet: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Wallet'
        },

        payment: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'PaymentLink'
        },

        invoice: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Invoice'
        },

        product: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Product'
        },

        settlement: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Settlement'
        },

        provider: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Provider'
        },

        refund: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Refund'
        },

        refunds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Refund'
            },
        ],

        chargeback: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Chargeback'
        },

        subaccount: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Subaccount'
        },

        card: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Card'
        },

        linkedTransaction: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Transaction'
        },

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

TransactionSchema.set('toJSON', { getters: true, virtuals: true });

TransactionSchema.pre<ITransactionDoc>('save', async function (next) {
    this.slug = slugify(`${this.reference}`, { lower: true });
    next();
});

// define the model constant
const Transaction: Model<ITransactionDoc> = mongoose.model<ITransactionDoc>('Transaction', TransactionSchema);

export default Transaction;
