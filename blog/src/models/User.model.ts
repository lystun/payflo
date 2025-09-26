import mongoose, { Model, ObjectId } from 'mongoose';
import slugify from 'slugify';
import { IUserDoc } from '../utils/types.util'

const UserSchema = new mongoose.Schema (

    {

        userId: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

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

        avatar: {
            type: String,
            default: ''
        },

        userType: {
			type: String,
			enum: ['superadmin','admin','business','team','writer','user'],
			default: 'user'
		},

		businessType: {
			type: String,
			enum: ['no-type','corporate', 'sme-business', 'smb-business', 'entrepreneur'],
			default: 'no-type'
		},

        businessName: {
            type: String,
            default: ''
        },

        identity: {
            basic: {
                type: String,
                enum: ['pending', 'submitted', 'approved', 'declined', 'on-hold'],
                default: 'pending'
            },
            ID: {
                type: String,
                enum: ['pending', 'submitted', 'approved', 'declined', 'on-hold'],
                default: 'pending'
            },
            face: {
                type: String,
                enum: ['pending', 'submitted', 'approved', 'declined', 'on-hold'],
                default: 'pending'
            },
            address: {
                type: String,
                enum: ['pending', 'submitted', 'approved', 'declined', 'on-hold'],
                default: 'pending'
            },
            bvn: {
                type: String,
                enum: ['pending', 'submitted', 'approved', 'declined', 'on-hold'],
                default: 'pending'
            },
            kyc: {
                type: String,
                enum: ['pending','submitted','approved', 'declined', 'on-hold'],
                default: 'pending'
            },
            kyb: {
                type: String,
                enum: ['pending', 'submitted', 'approved', 'declined', 'on-hold'],
                default: 'pending'
            },
        },


        phoneNumber: {
            type: String,
            default: ''
        },

        email: {
			type: String,
            default: ''
		},

        isActive: {
			type: Boolean,
            default: true
		},

        posts: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Post'
            }
        ],
        
        comments: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Comment'
            }
        ],

        tags: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Tag'
            }
        ],
        
        business: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Business'
        },

        apiKey: {

			secret: {
				type: mongoose.Schema.Types.Mixed,
				default: null,
				select: false
			},

			public: {
				type: mongoose.Schema.Types.Mixed,
				default: null,
				select: false
			},

			token: {
				type: mongoose.Schema.Types.Mixed,
				default: null,
				select: false
			},

			publicToken: {
				type: mongoose.Schema.Types.Mixed,
				default: null,
				select: false
			},

			domain: {
				type: String,
				enum: ['live', 'test'],
				default: 'test',
				select: false
			},

			isActive: {
				type: Boolean,
				default: false,
				select: false
			},

			updatedAt: {
				type: mongoose.Schema.Types.Mixed,
				default: null,
				select: false
			}

		},

		keys: [
			{
				secret: {
					type: mongoose.Schema.Types.Mixed,
					default: null,
					select: false
				},
	
				public: {
					type: mongoose.Schema.Types.Mixed,
					default: null,
					select: false
				},
	
				token: {
					type: mongoose.Schema.Types.Mixed,
					default: null,
					select: false
				},
	
				publicToken: {
					type: mongoose.Schema.Types.Mixed,
					default: null,
					select: false
				},
	
				domain: {
					type: String,
					enum: ['live', 'test'],
					default: 'test',
					select: false
				},
	
				isActive: {
					type: Boolean,
					default: false,
					select: false
				},
	
				updatedAt: {
					type: mongoose.Schema.Types.Mixed,
					default: null,
					select: false
				}
			}
		],

        roles: [
			{
				type: mongoose.Schema.Types.Mixed,
                default: null
			},
		],

        permissions: [
            {
				entity: {
					type: String,
					default: '',
				},
				actions: [
					{
						type: String,
						default: '',
					}
				]
			},
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

UserSchema.set('toJSON', { getters: true, virtuals: true });

UserSchema.pre<IUserDoc>('save', async function(next){
    next();
});

UserSchema.statics.findByUserId = (id) => {
    return User.findOne({userId: id});
}

// define the model constant
const User: Model<IUserDoc> = mongoose.model<IUserDoc>('User', UserSchema);

export default User;
