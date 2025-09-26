import mongoose, { ObjectId, Model } from 'mongoose';
import slugify from 'slugify';
import { IUserDoc } from '../utils/types.util'

const UserSchema = new mongoose.Schema (

    {

        userId: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        savedPassword: {
            type: String,
            select: false
        },

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
                enum: ['pending', 'submitted', 'approved', 'declined', 'on-hold'],
                default: 'pending'
            },
            kyb: {
                type: String,
                enum: ['pending', 'submitted', 'approved', 'declined', 'on-hold'],
                default: 'pending'
            },
            bvnLimit: {
                type: Number,
                default: 0
            },
            ninLimit: {
                type: Number,
                default: 0
            },
        },

		security: {

			label: {
				type: String,
				default: ''
			},

			question: {
				type: String,
				default: ''
			},

			answer: {
				type: String,
				default: ''
			},

			isSubmitted: {
				type: Boolean,
				default: false
			}

		},

        phoneNumber: {
            type: String,
            default: ''
        },

        phoneCode: {
            type: String,
            default: ''
        },

        email: {
			type: String,
            default: ''
		},

        slug: {
			type: String,
            default: ''
		},
        
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

        webhook: {

            url: {
				type: String,
				default: '',
                select: false
			},

			header: {
				type: String,
				default: '',
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

			createdAt: {
				type: mongoose.Schema.Types.Mixed,
				default: null,
                select: false
			}

		},

        roles: [
			{
				type: mongoose.Schema.Types.Mixed,
                default: ''
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
		],

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
    this.slug = slugify(this.email, { lower: true });
    next();
});

UserSchema.statics.getAllUsers = async () => {
    return User.find();
}

// define the model constant
const User: Model<IUserDoc> = mongoose.model<IUserDoc>('User', UserSchema);

export default User;
