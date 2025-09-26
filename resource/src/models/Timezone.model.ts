import crypto from 'crypto';
import mongoose, { Model, ObjectId } from 'mongoose';
import slugify from 'slugify';
import { ITimezoneDoc } from '../utils/types.util'

const TimezoneSchema = new mongoose.Schema(

    {

        name: {
            type: String
        },
        displayName: {
            type: String
        },
        label: {
            type: String
        },
        countries:[
            {
                type: String
            }
        ],
        utcOffset: {
            type: mongoose.Schema.Types.Mixed
        },

        utcOffsetStr: {
            type: String
        },

        dstOffset: {
            type: String
        },

        aliasOf: {
            type: String
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

TimezoneSchema.set('toJSON', {getters: true, virtuals: true});

// Encrypt password using bcrypt
TimezoneSchema.pre<ITimezoneDoc>('save', async function (next) {
    this.slug = slugify(this.name, { lower: true });
	next()
});

// define the model
const Timezone: Model<ITimezoneDoc> = mongoose.model<ITimezoneDoc>('Timezone', TimezoneSchema);

export default Timezone;