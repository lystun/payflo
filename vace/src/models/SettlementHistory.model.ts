import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { ISettlementHistoryDoc } from '../utils/types.util'

const RunsettleSchema = new mongoose.Schema(

    {

        amountSettled: {
            type: Number,
            default: 0
        },

        amountShared: {
            type: Number,
            default: 0
        },

        currency: {
            type: String,
            default: 'NGN'
        },

        groups: [
            {
                business: {
                    type: mongoose.Schema.Types.Mixed,
                    ref: 'Business'
                },

                subaccounts: [
                    {
                        _id: {
                            type: mongoose.Schema.Types.Mixed,
                            ref: 'Subaccount'
                        },
                        code: {
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
                        bankCode: {
                            type: String,
                            default: ''
                        },
                        bankName: {
                            type: String,
                            default: ''
                        },
                        splitType: {
                            type: String,
                            default: ''
                        },
                        splitValue: {
                            type: Number,
                            default: 0
                        }
                    }
                ],

                transactions: [
                    {
                        _id: {
                            type: mongoose.Schema.Types.Mixed,
                            ref: 'Transaction'
                        },

                        payment: {
                            type: mongoose.Schema.Types.Mixed,
                            ref: 'PaymentLink'
                        },
                        reference: {
                            type: String,
                            default: ''
                        },
                        amount: {
                            type: Number,
                            default: 0
                        },
                        amountToSettle: {
                            type: Number,
                            default: 0
                        },
                        fee: {
                            type: Number,
                            default: 0
                        },
                        vat: {
                            type: Number,
                            default: 0
                        },
                        revenue: {
                            type: Number,
                            default: 0
                        }
                    }
                ],

                paymentLinks: [
                    {
                        type: mongoose.Schema.Types.Mixed,
                        ref: 'PaymentLink'
                    }
                ],

                linksHasSub: [
                    {
                        type: mongoose.Schema.Types.Mixed,
                        ref: 'PaymentLink'
                    }
                ],

                linksNoSub: [
                    {
                        type: mongoose.Schema.Types.Mixed,
                        ref: 'PaymentLink'
                    }
                ],

                totalFee: {
                    type: Number,
                    default: 0
                },
                totalVat: {
                    type: Number,
                    default: 0
                },
                totalRevenue: {
                    type: Number,
                    default: 0
                },
                lumpAmount: {
                    type: Number,
                    default: 0
                },
                sharedAmount: {
                    type: Number,
                    default: 0
                },
                amountToSettle: {
                    type: Number,
                    default: 0
                },
                chargebackAmount: {
                    type: Number,
                    default: 0
                }
            }
        ],

        settledBy: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'User'
        },

        settlement: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Settlement'
        },

        transactions: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Transaction'
            }
        ],

        payments: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'PaymentLink'
            }
        ],

        businesses: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Business'
            }
        ],

        subaccounts: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Subaccount'
            }
        ],

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

RunsettleSchema.set('toJSON', { getters: true, virtuals: true });

RunsettleSchema.pre<ISettlementHistoryDoc>('save', async function (next) {
    next();
});

// define the model constant
const SettlementHistory: Model<ISettlementHistoryDoc> = mongoose.model<ISettlementHistoryDoc>('SettlementHistory', RunsettleSchema);

export default SettlementHistory;
