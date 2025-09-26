import crypto from 'crypto';
import mongoose, { Model, ObjectId } from 'mongoose';
import slugify from 'slugify';


interface IAssetModel {

    findByName(name: any): IAssetDoc,
}

interface IAssetDoc extends IAssetModel,  mongoose.Document {

    name: string;
    type: string;
    assetID: string;
    url: string;
    body: string;
    isEnabled: boolean;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: mongoose.Schema.Types.ObjectId;
    id: mongoose.Schema.Types.ObjectId;

    // props
    findByName(name: any): IAssetDoc,
    
}

const AssetSchema = new mongoose.Schema(

    {

        name:{
			type: String,
            required: [true, 'asset name is required'],
            unique: [true, 'asset name already exists']
		},

        assetID: {
            type: String
        },

        type:{
			type: String,
            required: [true, 'asset type is required'],
            enum: ['image', 'text', 'file']
		},
		
		isEnabled: {
			type: Boolean,
            default: true
		},

        body: {
            type: String
        },

        url: {
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

AssetSchema.set('toJSON', {getters: true, virtuals: true});

// Encrypt password using bcrypt
AssetSchema.pre<IAssetDoc>('save', async function (next) {
	next()
});

// define the model
const Asset: Model<IAssetDoc> = mongoose.model<IAssetDoc>('Asset', AssetSchema);

export default Asset;