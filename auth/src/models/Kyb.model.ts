import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IKYBDoc } from '../utils/types.util'

const KybSchema = new mongoose.Schema (

    {

        businessName: {
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

        autoComplete: {
            type: Boolean,
            default: false
        },

        category: {
            type: String,
            default: ''
        },

        industry: {
            type: String,
            default: ''
        },

        phoneCode: {
            type: String,
            default: ''
        },

        officialEmail: {
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
        },

        postalCode: {
            type: String,
            default: ''
        },

        regCategory: {
            type: String,
            enum: ['business-name','limited-liability','privately-held','ngo-organization','plc-organization'],
            default: 'business-name'
        },

        regType: {
            type: String,
            enum: ['starter', 'registered'],
            default: 'starter'
        },

        cacNumber: {
            type: String,
            default: ''
        },

        tinNumber: {
            type: String,
            default: ''
        },

        websiteUrl: {
            type: String,
            default: ''
        },

        certificate: {
            type: String,
            default: ''
        },

        socials: [
            {
                name: {
                    type: String,
                    default: ''
                },

                url: {
                    type: mongoose.Schema.Types.Mixed,
                    default: null
                },

                username: {
                    type: mongoose.Schema.Types.Mixed,
                    default: null
                },

                description: {
                    type: mongoose.Schema.Types.Mixed,
                    default: null
                }
            },
        ],

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

            nin: {
                type: String,
                default: ''
            },
        },

        bvn: {
            type: String,
            default: ''
        },

        bvnData: {
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
            phoneNumber: {
                type: String,
                default: ''
            },
            gender: {
                type: String,
                default: ''
            },
            dob: {
                type: String,
                default: ''
            },
            customer: {
                type: String,
                default: ''
            }
        },

        nin: {
            type: String,
            default: ''
        },

        ninData: {
            firstName: {
                type: String,
                default: ''
            },
            middleName: {
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
            gender: {
                type: String,
                default: ''
            },
            customer: {
                type: String,
                default: ''
            },
            photo: {
                type: String,
                default: ''
            }
        },

        cacData: {
            rcNumber: {
                type: String,
                default: ''
            },
            companyName: {
                type: String,
                default: ''
            },
            address: {
                type: String,
                default: ''
            },
            regDate: {
                type: String,
                default: ''
            },
        },

        bank: {

            accountNo: {
                type: String,
                default: ''
            },

            accountName: {
                type: String,
                default: ''
            },

            bankName: {
                type: String,
                default: ''
            },

            bankCode: {
                type: String,
                default: ''
            },
        },

        slug: String,

        country: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Country'
        },

        user: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'User'
        }

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

KybSchema.set('toJSON', { getters: true, virtuals: true });

KybSchema.pre<IKYBDoc>('save', async function(next){
    this.slug = slugify(this.businessName, { lower: true });
    next();
});

KybSchema.statics.getAllKybs = () => {
    return Kyb.find({});
}

// define the model constant
const Kyb: Model<IKYBDoc> = mongoose.model<IKYBDoc>('Kyb', KybSchema);

export default Kyb;
