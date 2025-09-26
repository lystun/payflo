import crypto from 'crypto';
import mongoose, { ObjectId, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Role from './Role.model';
import { IUserDoc } from '../utils/types.util'

const UserSchema = new mongoose.Schema(

    {
		tier: {
            type: String,
			default: '0'
        },

		dailyTransaction: {

            label: {
				type: String,
				default: '0'
			},

			limit:{
				type: Number,
				default: 0
			}

        },

		avatar: {
            type: String,
			default: ''
        },

		transactionPin: {
			type: String,
			default: '',
			select: false
		},

		businessName: {
            type: String,
			default: ''
        },

        firstName: {
            type: String,
			default: 'Champ'
        },
 
        lastName: {
            type: String
        },

        phoneNumber: {
			type: String,
			default: ''
		},

		countryPhone: {
			type: String,
			default: ''
		},

		altPhone: {
			type: String,
			default: ''
		},

		phoneCode: {
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
            },
            kycStage: {
                type: String,
                default: 'pending'
            },
			kybStage: {
                type: String,
                default: 'pending'
            }
        },

        email: {
			type: String,
			required: [true, 'email is required'],
			unique: [true, 'email already exist'],
			match: [
				/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
				'a valid email is required',
			],
		},

        password: {
			type: String,
			required: [true, 'password is required'],
			minlength: [8, 'Password cannot be less than 8 characters'],
			select: false,
		},

		passwordType: {
			type: String,
			enum: ['generated', 'self', 'self-changed'],
			select: true,
		},

		savedPassword: {
			type: String,
			default: '',
			select: false
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

		status: {

			profile: {
				type: String,
				enum: ['updated', 'pending'],
				default: 'pending'
			},

			setup: {
				type: Number,
				default: 0
			},

			sub: {
				plan: {
					type: String,
					enum: ['starter','basic','standard','premium'],
					default: 'starter'
				},
				status: {
					type: String,
					enum: ['active', 'inactive'],
					default: 'active'
				}
			}

		},

        activationToken: String,
		activationTokenExpire: Date,

		resetPasswordToken: String,
		resetPasswordTokenExpire: Date,

		emailCode: String,
		emailCodeExpire: Date,

		inviteToken: String,
		inviteTokenExpire: Date,

		inviteStatus: {
			type: String,
			enum: ['pending', 'accepted', 'declined'],
			default: 'pending'
		},

		oauth: [
			{
				brand: {
					type: String,
					enum: ['google', 'facebook', 'discord']
				},

				creds: {

					accessToken: {
						type: String,
						default: ''
					},
		
					expiryDate: {
						type: mongoose.Schema.Types.Mixed,
						default: ''
					},
		
					idToken: {
						type: String,
						default: ''
					},
		
					refreshToken: {
						type: String,
						default: ''
					},
		
					scope: {
						type: String,
						default: ''
					},
		
					tokenType: {
						type: String,
						default: ''
					},

					data: {
						type: mongoose.Schema.Types.Mixed,
						default: ''
					},

				}
			}
		],

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

        isSuper: {
			type: Boolean,
			default: false
		},

        isActivated: {
			type: Boolean,
			default: false
		},

        isAdmin: {
			type: Boolean,
			default: false
		},

		isBusiness: {
			type: Boolean,
			default: false
		},

		isCustomer: {
			type: Boolean,
			default: false
		},

		isTeam: {
			type: Boolean,
			default: false
		},

        isUser: {
			type: Boolean,
			default: false
		},

		isActive: {
			type: Boolean,
			default: false
		},

        loginLimit: {
			type: Number,
			default: 0
		},

		isLocked: {
			type: Boolean,
			default: false
		},

		login: {
			last: {
				type: mongoose.Schema.Types.Mixed,
				default: ''
			},
			method: {
				type: String,
				default: 'email'
			},
		},

        country: {
			type: mongoose.Schema.Types.Mixed,
			ref: 'Country',
		},

        roles: [
			{
				type: mongoose.Schema.Types.Mixed,
				ref: 'Role',
				required: true,
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

		notifications: [
			{
				type: mongoose.Schema.Types.Mixed,
				ref: 'Notification',
			},
		],

		kyc: {
			type: mongoose.Schema.Types.Mixed,
			ref: 'Kyc',
		},

		kyb: {
			type: mongoose.Schema.Types.Mixed,
			ref: 'Kyb',
		},

		verification: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Verification'
        },

		devices: [
			{
				type: mongoose.Schema.Types.Mixed,
				ref: 'Device',
			},
		],

    },
    {

        timestamps: true,
		versionKey: '_version',
		toJSON: {
			transform(doc: any, ret){
				ret.id = ret._id
			}
		}

    }

)

UserSchema.set('toJSON', {getters: true, virtuals: true});

// Encrypt password using bcrypt
UserSchema.pre<IUserDoc>('save', async function (next) {
	
	if (!this.isModified('password')) {
		return next();
	}

	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password, salt);

	next()
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
	return jwt.sign({ id: this._id, email: this.email, roles: this.roles }, process.env.JWT_SECRET as string, {
		expiresIn: process.env.JWT_EXPIRE,
	});
};

// Match user password
UserSchema.methods.matchPassword = async function (pass: any) {

	let make: any = null;

	if(this.password && this.password.toString() !== ''){
		make = await bcrypt.compare(pass, this.password);
	}else{
		make = false;
	}

	return make;
	
};

// Match email verification code
UserSchema.methods.matchEmailCode = function (code: any) {
	return this.emailCode === code ? true : false;
}

// increase login limit
UserSchema.methods.increaseLoginLimit = function () {
	const limit = this.loginLimit + 1
	return limit;
}

// check locked status
UserSchema.methods.checkLockedStatus = function () {
	return this.isLocked;
}

//Generate and hash password token
UserSchema.methods.getResetPasswordToken = function () {
	// Generate token
	const resetToken = crypto.randomBytes(20).toString('hex');

	// Hash the token and set to resetPasswordToken field
	this.resetPasswordToken = crypto
		.createHash('sha256')
		.update(resetToken)
		.digest('hex');

	// Set expire
	this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

	return resetToken;
};

//Generate and hash activation token
UserSchema.methods.getActivationToken = function () {
	// Generate token
	const token = crypto.randomBytes(20).toString('hex');

	// Hash the token and set to resetPasswordToken field
	this.activationToken = crypto
		.createHash('sha256')
		.update(token)
		.digest('hex');

	// Set expire
	this.activationTokenExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

	return token;
};

//Generate and hash invite token
UserSchema.methods.getInviteToken = function () {
	// Generate token
	const token = crypto.randomBytes(20).toString('hex');

	// Hash the token and set to resetPasswordToken field
	this.inviteToken = crypto
		.createHash('sha256')
		.update(token)
		.digest('hex');

	// Set expire
	this.inviteTokenExpire = Date.now() + 1440 * 60 * 1000; // 24 hours

	return token;
};

// Find out if user has a role
UserSchema.methods.hasRole = async (name: any, roles: Array<ObjectId>): Promise<boolean> => {

	let flag = false;

	const _role = await Role.findOne({ name: name });

	for (let i = 0; i < roles.length; i++) {
		if (roles[i].toString() === _role?._id.toString()) {
			flag = true;
			break;
		}
	}

	return flag;
};

UserSchema.statics.findByEmail = (email) => {
	return User.findOne({ email: email });
};

// this function helps us to check with typescript
UserSchema.statics.build = (attrs: any) => {
    return new User(attrs)
}

// define the model
const User: Model<IUserDoc> = mongoose.model<IUserDoc>('User', UserSchema);

export default User;