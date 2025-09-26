import crypto from 'crypto';
import mongoose, { Model, ObjectId } from 'mongoose';
import slugify from 'slugify';
import { IBankDoc } from '../utils/types.util';

const BankSchema = new mongoose.Schema(

    {

        accountName:{
			type: String,
            default: ''
		},

        accountNo:{
			type: String,
            default: ''
		},

        name:{
			type: String,
            required: [true, 'bank name is required'],
		},

        legalName:{
			type: String,
            default: '',
		},

        code:{
			type: String,
            default: '',
		},

        platformCode: {
            type: String,
            default: '',
        },
		
		isEnabled: {
			type: Boolean,
            default: true
		},

        country:{
			type: String,
            default: 'nigeria'
		},

        currency:{
			type: String,
            default: 'NGN'
		},

        type:{
			type: String,
            default: 'nuban'
		},

        slug: String,

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

        business:{
			type: mongoose.Schema.Types.Mixed,
            ref: 'Business',
            default: null
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

BankSchema.set('toJSON', {getters: true, virtuals: true});

// Encrypt password using bcrypt
BankSchema.pre<IBankDoc>('save', async function (next) {
    this.slug = slugify(this.name, { lower: true });
	next()
});

// define the model
const Bank: Model<IBankDoc> = mongoose.model<IBankDoc>('Bank', BankSchema);

export default Bank;