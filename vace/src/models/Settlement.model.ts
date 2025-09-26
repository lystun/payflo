import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { ISettlementDoc } from '../utils/types.util'

const SettlementSchema = new mongoose.Schema(

    {

        code: {
            type: String,
            default: ''
        },

        description: {
            type: String,
            default: ''
        },

        status: {
            type: String,
            enum: ['pending', 'processing', 'completed'],
            default: 'pending'
        },

        totalAmount: {
            type: Number,
            default: 0
        },

        isSettled: {
            type: Boolean,
            default: false
        },

        isRunning: {
            type: Boolean,
            default: false
        },

        slug: String,

        settledBy: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Business'
        },

        transactions: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Transaction'
            }
        ],

        businesses: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Business'
            }
        ],

        created: {

            date: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            },

            time: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            },

            ISO: {
                type: String,
                default: ''
            }

        },

        updated: {

            date: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            },

            time: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            },

            ISO: {
                type: String,
                default: ''
            }

        },

        settledAt: {

            date: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            },

            time: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            },

            ISO: {
                type: String,
                default: ''
            }

        },

        lastRunAt: {

            date: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            },

            time: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            },

            ISO: {
                type: String,
                default: ''
            }

        },

        payouts: [
            {
                date: {
                    type: mongoose.Schema.Types.Mixed,
                    default: null
                },

                business: {
                    type: mongoose.Schema.Types.Mixed,
                    ref: 'Business'
                }
            }
        ],

        histories: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'SettlementHistory'
            }
        ],

        analytics: {
            businesses: {
                type: Number,
                default: 0
            },
            paymentLinks: {
                type: Number,
                default: 0
            },
            settled: {
                amount: {
                    type: Number,
                    default: 0
                },
                shared: {
                    type: Number,
                    default: 0
                },
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
                ]
            },
            subaccounts: {
                type: Number,
                default: 0
            },
            transactions: {
                type: Number,
                default: 0
            },
            updatedAt: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            }
        },

        overview: {

            businesses: {
                type: Number,
                default: 0
            },

            totalAmount: {
                type: Number,
                default: 0
            },
            amount: {
                type: Number,
                default: 0
            },
            totalVat: {
                type: Number,
                default: 0
            },
            revenue: {
                type: Number,
                default: 0
            },
            totalFee: {
                type: Number,
                default: 0
            },

            dueToday: {

                amount: {
                    type: Number,
                    default: 0
                },
                businesses: {
                    type: Number,
                    default: 0
                }

            },

            pastDue: {

                amount: {
                    type: Number,
                    default: 0
                },
                businesses: {
                    type: Number,
                    default: 0
                }

            },
        },

        groups: [
            {
                business: {
                    type: mongoose.Schema.Types.Mixed,
                    ref: 'Business'
                },

                paymentLinks: [
                    {
                        payment: {
                            type: mongoose.Schema.Types.Mixed,
                            ref: 'PaymentLink'
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
                        ]

                    }
                ],
            }
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

SettlementSchema.set('toJSON', { getters: true, virtuals: true });

SettlementSchema.pre<ISettlementDoc>('save', async function (next) {
    this.slug = slugify(this.code, { lower: true });
    next();
});

// define the model constant
const Settlement: Model<ISettlementDoc> = mongoose.model<ISettlementDoc>('Settlement', SettlementSchema);

export default Settlement;