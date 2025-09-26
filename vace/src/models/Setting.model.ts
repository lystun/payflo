import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { ISettingDoc } from '../utils/types.util'

const SettingSchema = new mongoose.Schema(

    {

        settlement: {

            currency: {
                type: String,
                default: 'NGN'
            },

            label: {
                type: String,
                default: 'T+1'
            },

            days: {
                type: Number,
                default: 1
            },

            nextPayout: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            },

            settleInto: {
                type: String,
                enum: ['wallet', 'bank'],
                default: 'bank'
            }

        },

        feeInflow: {

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

            markup: {
                type: Number,
                default: 0
            },

            providerMarkup: {
                type: Number,
                default: 0
            },

            vatType: {
                type: String,
                enum: ['percentage', 'flat'],
                default: 'percentage'
            },

            vatValue: {
                type: Number,
                default: 0
            },

            stampDuty: {
                type: Number,
                default: 0
            }

        },

        feeOutflow: {

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

            markup: {
                type: Number,
                default: 0
            },

            providerMarkup: {
                type: Number,
                default: 0
            },

            vatType: {
                type: String,
                enum: ['percentage', 'flat'],
                default: 'percentage'
            },

            vatValue: {
                type: Number,
                default: 0
            },

            stampDuty: {
                type: Number,
                default: 0
            }
        },

        cardFee: {

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

            vatType: {
                type: String,
                enum: ['percentage', 'flat'],
                default: 'percentage'
            },

            vatValue: {
                type: Number,
                default: 0
            },

            stampDuty: {
                type: Number,
                default: 0
            }

        },

        billsFee: {

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

            vatType: {
                type: String,
                enum: ['percentage', 'flat'],
                default: 'percentage'
            },

            vatValue: {
                type: Number,
                default: 0
            },

            stampDuty: {
                type: Number,
                default: 0
            }

        },

        transferFee: {

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

            vatType: {
                type: String,
                enum: ['percentage', 'flat'],
                default: 'percentage'
            },

            vatValue: {
                type: Number,
                default: 0
            },

            stampDuty: {
                type: Number,
                default: 0
            }

        },

        inflowFee: {

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

            vatType: {
                type: String,
                enum: ['percentage', 'flat'],
                default: 'percentage'
            },

            vatValue: {
                type: Number,
                default: 0
            },

            stampDuty: {
                type: Number,
                default: 0
            }

        },

        paymentLink: {
            request: {
                type: String,
                enum: ['active', 'inactive'],
                default: 'active'
            },
            product: {
                type: String,
                enum: ['active', 'inactive'],
                default: 'active'
            },
            invoice: {
                type: String,
                enum: ['active', 'inactive'],
                default: 'active'
            }
        },

        invoice: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active'
        },

        product: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active'
        },

        refund: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active'
        },

        wallet: {
            inflow: {
                type: String,
                enum: ['active', 'inactive'],
                default: 'active'
            },
            outflow: {
                type: String,
                enum: ['active', 'inactive'],
                default: 'active'
            }
        },

        bills: {
            airtime: {
                type: String,
                enum: ['active', 'inactive'],
                default: 'active'
            },
            data: {
                type: String,
                enum: ['active', 'inactive'],
                default: 'active'
            },
            cable: {
                type: String,
                enum: ['active', 'inactive'],
                default: 'active'
            },
            electricity: {
                type: String,
                enum: ['active', 'inactive'],
                default: 'active'
            }
        },

        account: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active'
        },

        domain: {
            type: String,
            enum: ['live', 'test', 'neutral'],
            default: 'test'
        },

        incognito: {
            type: Boolean,
            default: false
        },

        chargeVat: {
            type: Boolean,
            default: true
        },

        card: {

            hostToHost: {
                type: String,
                enum: ['active', 'inactive'],
                default: 'active'
            },

            tokenize: {
                type: String,
                enum: ['active', 'inactive'],
                default: 'inactive'
            }

        },

        business: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Business'
        }

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

SettingSchema.set('toJSON', { getters: true, virtuals: true });

SettingSchema.pre<ISettingDoc>('save', async function (next) {
    next();
});

// define the model constant
const Setting: Model<ISettingDoc> = mongoose.model<ISettingDoc>('Setting', SettingSchema);

export default Setting;