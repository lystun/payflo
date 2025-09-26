import mongoose, { Model, ObjectId } from 'mongoose';
import slugify from 'slugify';
import { IBusinessDoc } from '../utils/types.util'

const BusinessSchema = new mongoose.Schema(

    {
        tier: {
            type: String,
            default: '0'
        },

        merhcantID: {
            type: String,
            default: ''
        },

        legal: {

            bvnNumber: {
                type: String,
                default: ''
            },

            ninNumber: {
                type: String,
                default: ''
            }

        },

        dailyTransaction: {

            label: {
                type: String,
                default: '0'
            },

            limit: {
                type: Number,
                default: 0
            }

        },

        emailCode: String,
        emailCodeExpire: Date,

        transactionPin: {
            type: String,
            default: '',
            select: false
        },

        name: {
            type: String,
            default: ''
        },

        displayName: {
            type: String,
            default: ''
        },

        description: {
            type: String,
            default: ''
        },

        profile: {
            type: String,
            default: ''
        },

        staffStrength: {
            type: String,
            default: ''
        },

        industry: {
            type: String,
            default: ''
        },

        category: {
            type: String,
            default: ''
        },

        onboard: {
            step: {
                type: Number,
                default: 0
            },
            stage: {
                type: String,
                default: 'pending'
            }
        },
        owner: {

            firstName: {
                type: String,
                default: ''
            },

            lastName: {
                type: String,
                default: ''
            },

            middleName: {
                type: String,
                default: ''
            },

            name: {
                type: String,
                default: ''
            },

            dob: {
                type: String,
                default: ''
            },

            nationality: {
                type: String,
                default: ''
            },

            idCard: {
                type: String,
                default: ''
            },

            utilityDoc: {
                type: String,
                default: ''
            },

            address: {
                type: String,
                default: ''
            },

            bvn: {
                type: String,
                default: ''
            },
        },

        location: {
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
            },
            postalCode: {
                type: String,
                default: ''
            },
            country: {
                id: {
                    type: mongoose.Schema.Types.Mixed,
                    default: null
                },
                name: {
                    type: String,
                    default: ''
                },
                code2: {
                    type: String,
                    default: ''
                },
                phoneCode: {
                    type: String,
                    default: ''
                },
            },
        },

        businessType: {
            type: String,
            enum: ['corporate', 'sme-business', 'smb-business', 'entrepreneur'],
            default: 'sme-business'
        },

        phoneNumber: {
            type: String,
            default: ''
        },

        phoneCode: {
            type: String,
            default: ''
        },

        logo: {
            type: String,
            default: ''
        },

        cover: {
            type: String,
            default: ''
        },

        email: {
            type: String,
            default: ''
        },

        officialEmail: {
            type: String,
            default: ''
        },

        socials: [
            {
                _id: false,

                name: {
                    type: String,
                    default: ''
                },
                url: {
                    type: String,
                    default: ''
                },
                username: {
                    type: String,
                    default: ''
                },
                description: {
                    type: String,
                    default: ''
                },
            }
        ],

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
            bankCode: {
                type: String,
                default: ''
            },
            platformCode: {
                type: String,
                default: ''
            },
            updatedAt: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            },
        },

        banks: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Bank',
                default: null
            },
        ],

        card: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Card',
            default: null
        },

        cards: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Card',
                default: null
            },
        ],

        user: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'User'
        },

        wallet: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Wallet'
        },

        accounts: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Account'
            },
        ],

        transactions: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Transaction'
            },
        ],

        beneficiaries: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Beneficiary'
            },
        ],

        products: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Product'
            },
        ],

        payments: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'PaymentLink'
            },
        ],

        invoices: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Invoice'
            },
        ],

        subaccounts: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Subaccount'
            },
        ],

        settlements: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Settlement'
            },
        ],

        refunds: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Refund'
            },
        ],

        settings: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Setting'
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

BusinessSchema.set('toJSON', { getters: true, virtuals: true });

BusinessSchema.pre<IBusinessDoc>('save', async function (next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

BusinessSchema.statics.getAllBusinesses = async () => {
    return Business.find();
}

// define the model constant
const Business: Model<IBusinessDoc> = mongoose.model<IBusinessDoc>('Business', BusinessSchema);

export default Business;
