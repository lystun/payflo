import crypto from 'crypto';
import mongoose, { Model, ObjectId } from 'mongoose';
import slugify from 'slugify';


interface ICountryModel {
    build(attrs: any): ICountryDoc,
    findByName(name: string): ICountryDoc;
    findByCode(code: string): ICountryDoc;
    getCountry(id: any): ICountryDoc;
}

interface ICountryDoc extends ICountryModel, mongoose.Document {
    
    name: string;
    code2: string;
    code3: string;
    capital: string;
    region: string;
    subregion: string;
    currencyCode: string;
    currencyImage: string;
    phoneCode: string;
    flag: string;
    states: Array<object>;
    slug: string;
    base64: string;
    timezones: Array<{
        details: mongoose.Schema.Types.Mixed | any,
        name: string,
        displayName: string,
        label: string,
        countries: Array<string>,
        utcOffset: number | string
        utcOffsetStr: number | string
        dstOffset: string
        aliasOf: any
        slug: string;
    }>

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: mongoose.Schema.Types.ObjectId;
    id: mongoose.Schema.Types.ObjectId;

    // props
    build(attrs: any): ICountryDoc;
    findByName(name: string): ICountryDoc;
    findByCode(code: string): ICountryDoc;
    getCountry(id: any): ICountryDoc;
}

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

        subregion: {
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

        timezones: [
            {
                details: {
                    type: mongoose.Schema.Types.Mixed,
                    ref: 'Timezone'
                }, 

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
            }
        ],

        slug: String,

        base64: String

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
    this.slug = slugify(this.name, { lower: true });
	next()
});

CountrySchema.statics.findByName = function (name: string) {
    return this.findOne({name: name});
}

CountrySchema.statics.findByCode = function (code: string) {
    return this.findOne({phoneCode: code});
}
CountrySchema.statics.getCountry = function (id: any) {
    return this.findById({id});
}

// define the model
const Country: Model<ICountryDoc> = mongoose.model<ICountryDoc>('Country', CountrySchema);

export default Country;