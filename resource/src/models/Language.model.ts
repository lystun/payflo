import crypto from 'crypto';
import mongoose, { Model, ObjectId } from 'mongoose';
import slugify from 'slugify';


interface ILangModel{
    build(attrs: any): ILangDoc,
}

interface ILangDoc extends ILangModel, mongoose.Document {

    name: string;
    label: string;
    code: string;
    slug: string;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: mongoose.Schema.Types.ObjectId;
    id: mongoose.Schema.Types.ObjectId;

    // props
    build(attrs: any): ILangDoc;
}

const LanguageSchema = new mongoose.Schema(

    {

        name: {
            type: String,
            required: [true, 'language name is required ']
        },

        label: {
            type: String
        },

        code: {
            type: String,
            required: [true, 'language code in two letters is required']
        },

        slug: String

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



LanguageSchema.set('toJSON', {getters: true, virtuals: true});

// Encrypt password using bcrypt
LanguageSchema.pre<ILangDoc>('save', async function (next) {
    this.slug = slugify(this.name, { lower: true });
	next()
});

// define the model
const Language: Model<ILangDoc> = mongoose.model<ILangDoc>('Language', LanguageSchema);

export default Language;