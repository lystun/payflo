import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IInvoiceDoc } from '../utils/types.util'

const InvoiceSchema = new mongoose.Schema (

    {

        name: {
            type: String,
            default: ''
        },

        number: {
            type: String,
            default: '',
        },

        description: {
            type: String,
            default: ''
        },

        code: {
            type: String,
            default: ''
        },

        link: {
            type: String,
            default: ''
        },

        isEnabled: {
            type: Boolean,
            default: true
        },

        status: {
            type: String,
            enum: ['pending', 'paid', 'overdue', 'failed'],
            default: 'pending'
        },

        summary: {
            subtotal: {
                type: Number,
                default: 0
            },
            partialAmount: {
                type: Number,
                default: 0
            },
            totalAmount: {
                type: Number,
                default: 0
            },
            amountPaid: {
                type: Number,
                default: 0
            },
            paidAt: {
                type: mongoose.Schema.Types.Mixed,
                default: null
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
            }
        },

        recipient: {
            type: {
                type: String,
                enum: ['individual', 'business'],
                default: 'business'
            },
            businessName: {
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
            phoneNumber: {
                type: String,
                default: ''
            },
            phoneCode: {
                type: String,
                default: ''
            },
            countryCode: {
                type: String,
                default: ''
            },
            address: {
                type: String,
                default: ''
            },
            city: {
                type: String,
                default: ''
            },
            state: {
                type: String,
                default: ''
            }
        },

        items: [
            {
                _id: false,
                
                label: {
                    type: String,
                    default: ''
                },

                name: {
                    type: String,
                    default: ''
                },
                variant: {
                    type: String,
                    default: ''
                },
                price: {
                    type: Number,
                    default: 0
                },
                quantity: {
                    type: Number,
                    default: 0
                },
                total: {
                    type: Number,
                    default: ''
                }
            }
        ],

        VAT: {
            title: {
                type: String,
                default: ''
            },
            type: {
                type: String,
                default: ''
            },
            value: {
                type: Number,
                default: 0
            }
        },

        dueAt: {
            date: {
                type: String,
                default: ''
            },
            time: {
                type: String,
                default: ''
            },
            ISO: {
                type: String,
                default: ''
            }
        },

        issuedAt: {
            date: {
                type: String,
                default: ''
            },
            time: {
                type: String,
                default: ''
            },
            ISO: {
                type: String,
                default: ''
            }
        },

        slug: String,

        business: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Business'
        },

        payment: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'PaymentLink'
        },

        transactions: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Transaction'
            }
        ]

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

InvoiceSchema.set('toJSON', { getters: true, virtuals: true });

InvoiceSchema.pre<IInvoiceDoc>('save', async function(next){
    this.slug = slugify(this.name, { lower: true });
    next();
});

// define the model constant
const Invoice: Model<IInvoiceDoc> = mongoose.model<IInvoiceDoc>('Invoice', InvoiceSchema);

export default Invoice;
