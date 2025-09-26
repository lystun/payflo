import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IBeneficiaryDoc } from '../utils/types.util'

const BeneficiarySchema = new mongoose.Schema (

    {

        code: {
            type: String,
            default: ''
        },

        isEnabled: {
            type: Boolean,
            default: true
        },

        accountNo: {
            type: String,
            default: ''
        },

        accountName: {
            type: String,
            default: ''
        },

        bank: {
            bankId: {
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

            name: {
                type: String,
                default: ''
            },

            legalName: {
                type: String,
                default: ''
            },
        },

        providers: [
            {
                _id: false,
                
                id: {
                    type: String,
                    default: ''
                },

                name: {
                    type: String,
                    default: ''
                },

                bankCode: {
                    type: String,
                    default: ''
                },

                longCode: {
                    type: String,
                    default: ''
                },

                active: {
                    type: Boolean,
                    default: true
                },

                metadata: {
                    
                    payWithBank: {
                        type: Boolean,
                        default: false
                    },

                    isDeleted: {
                        type: Boolean,
                        default: false
                    },

                    createdAt: {
                        type: String,
                        default: ''
                    },

                    updatedAt: {
                        type: String,
                        default: ''
                    },

                }
            }
        ],

        slug: String,

        business: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Business'
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

BeneficiarySchema.set('toJSON', { getters: true, virtuals: true });

BeneficiarySchema.pre<IBeneficiaryDoc>('save', async function(next){
    this.slug = slugify(`${this.code}`, { lower: true });
    next();
});

// define the model constant
const Beneficiary: Model<IBeneficiaryDoc> = mongoose.model<IBeneficiaryDoc>('Beneficiary', BeneficiarySchema);

export default Beneficiary;
