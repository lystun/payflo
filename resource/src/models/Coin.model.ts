import crypto from 'crypto';
import mongoose, { Model, ObjectId } from 'mongoose';
import slugify from 'slugify';


interface ICoinModel {
    findByName(name: any): ICoinDoc,
}

interface ICoinDoc extends ICoinModel,  mongoose.Document {

    name: string;
    label: string;
    symbol: string;
    isFiat: boolean;
    isStable: boolean;
    isMajor: boolean;
    isEnabled: boolean;
    trades: Array<{ name: string, fee: number, enabled:boolean }>;
    icon: string;
    blockchain: string;
    slug: string;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: mongoose.Schema.Types.ObjectId;
    id: mongoose.Schema.Types.ObjectId;

    // props
    findByName(name: any): ICoinDoc,
    
}

const CoinSchema = new mongoose.Schema(

    {

        name:{
			type: String,
            required: [true, 'coin name is required'],
            unique: [true, 'coin name already exist']
		},

        label:{
			type: String,
            required: [true, 'coin label is required'],
            unique: [true, 'coin label already exist']
		},

        symbol: {
            type: String,
            required: [true, 'coin symbol is required'],
            enum: ['BTC', 'ETH', 'LTC', 'USDT', 'USDC', 'NGNT', 'BSCNGNT']
        },

        isFiat:{
			type: Boolean,
            default: false
		},

        isStable:{
			type: Boolean,
            default: false
		},

        isMajor:{
			type: Boolean,
            default: false
		},
		
		isEnabled: {
			type: Boolean,
            default: true
		},

        trades:[
            {
                name: {
                    type: String
                },

                fee: {
                    type: Number
                },

                enabled: {
                    type: Boolean
                }
            }
        ],

        blockchain: {
            type: String,
            enum: ['ETH', 'BTC', 'LTC', 'USDT']
        },

        icon: {
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

CoinSchema.set('toJSON', {getters: true, virtuals: true});

// Encrypt password using bcrypt
CoinSchema.pre<ICoinDoc>('save', async function (next) {
    this.slug = slugify(this.name, { lower: true });
	next()
});

// define the model
const Coin: Model<ICoinDoc> = mongoose.model<ICoinDoc>('Coin', CoinSchema);

export default Coin;