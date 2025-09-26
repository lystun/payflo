import mongoose, { Model } from 'mongoose';
import { ICountryDoc } from '../utils/types.util'

const CountrySchema = new mongoose.Schema(

    {

        name: {
            type: String,
        },

        code2: {
            type: String,
            required: [false, 'Country code in two letters is required']
        },

        code3: {
            type: String,
            required: [false, 'Country code in three letters is required']
        },

        capital: {
            type: String,
            required: [false, 'capital is required']
        },

        region: {
            type: String,
            required: [false, 'Region is region']
        },

        subRegion: {
            type: String,
            required: [false, 'sub region is required']
        },

        currencyCode: {
            type: String,
            required: [false, 'currency code is required']
        },

        currencyImage: {
            type: String,
            required: [false, 'currency image is required']
        },

        phoneCode: {
            type: String,
            required: [false, 'phone code is required']
        },

        flag: {
            type: String,
            required: [false, 'flag is required']
        },

        states: [
            {
                code: String,
                name: String,
                subdivision: String
            }
        ],

        slug: String,

        users: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'User',
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

CountrySchema.set('toJSON', {getters: true, virtuals: true});

// Encrypt password using bcrypt
CountrySchema.pre<ICountryDoc>('save', async function (next) {
	next()
});

// define the model
const Country: Model<ICountryDoc> = mongoose.model<ICountryDoc>('Country', CountrySchema);

export default Country;