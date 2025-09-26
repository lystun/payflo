import mongoose, { Model, ObjectId } from 'mongoose';
import slugify from 'slugify';
import { IUserDoc } from '../utils/types.util'

const UserSchema = new mongoose.Schema (

    {

        userId: {
            type: mongoose.Schema.Types.Mixed,
            default: null
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

        email: {
			type: String,
            default: ''
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
