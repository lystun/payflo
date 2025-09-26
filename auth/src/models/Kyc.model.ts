import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IKycDoc } from '../utils/types.util'


const KycSchema = new mongoose.Schema (

    {

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

        avatar: {
            type: String,
            default: ''
        },

        dob: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        age: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        marital: {
            type: String,
            enum: ['single', 'married', 'divorced', 'separated', 'widowed'],
            default: 'single'
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

        utilityDoc: {
            type: String,
            default: ''
        },

        idType: {
            type: String,
            enum: ['card','passport','license', 'nin-slip']
        },

        idData: {
            front: {
                type: String,
                default: ''
            },
            back: {
                type: String,
                default: ''
            }
        },

        faceId: {
            type: String,
            default: ''
        },

        gender: {
            type: String,
            enum: ['male', 'female']
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

        liveness: {
            isLive: {
                type: Boolean,
                default: false,
            },
            imageUrl: {
                type: String,
                default: ''
            },
            externalDatabaseRefID: {
                type: String,
                default: ''
            },
            message: {
                type: String,
                default: ''
            },
            customerRef: {
                type: String,
                default: ''
            },
            status: {
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

        isAdult: {
            type: Boolean
        },

        slug: String,

        phoneCode: {
            type: String,
            default: '+234'
        },

        phoneNumber: {
            type: String,
            default: ''
        },

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

KycSchema.set('toJSON', { getters: true, virtuals: true });

KycSchema.pre<IKycDoc>('save', async function(next){
    this.slug = slugify(this.firstName, { lower: true });
    next();
});

KycSchema.statics.getAllKycs = () => {
    return Kyc.find({});
}

// define the model constant
const Kyc: Model<IKycDoc> = mongoose.model<IKycDoc>('Kyc', KycSchema);

export default Kyc;
