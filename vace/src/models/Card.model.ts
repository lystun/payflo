import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { ICardDoc } from '../utils/types.util'

const CardSchema = new mongoose.Schema(

    {
        cardHolder: {
            type: String,
            default: ''
        },

        cardBin: {
            type: String,
            default: ''
        },

        cardLast: {
            type: String,
            default: ''
        },

        expiryMonth: {
            type: String,
            default: ''
        },

        expiryYear: {
            type: String,
            default: ''
        },

        cardType: {
            type: String,
            default: ''
        },

        brand: {
            type: String,
            default: ''
        },

        authCode: {
            type: String,
            default: '',
            select: false
        },

        metadata: {

            reference: {
                type: String,
                default: ''
            },

            status: {
                type: String,
                default: ''
            }

        },

        cardData: {
            type: String,
            default: '',
            select: false
        },

        authorization: {
            token: {
                type: String,
                default: '',
            },
            authCode: {
                type: String,
                default: ''
            },
            step: {
                type: String,
                default: ''
            },
            extUrl: {
                type: String,
                default: ''
            }
        },

        panData: {

            pan: {
                type: String,
                default: '',
                select: false
            },

            expiryMonth: {
                type: String,
                default: '',
                select: false
            },

            expiryYear: {
                type: String,
                default: '',
                select: false
            }
            
        },

        country: {
            type: String,
            default: ''
        },

        currency: {
            type: String,
            default: ''
        },

        countryCode: {
            type: String,
            default: ''
        },

        redirectUrl: {
            type: String,
            default: ''
        },

        slug: String,

        transaction: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Transaction'
        },

        business: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Business'
        }

    },

    {
        timestamps: true,
        versionKey: '_version',
        toJSON: {
            transform(doc, ret) {
                ret.id = ret._id
            }
        }
    }

)

CardSchema.set('toJSON', { getters: true, virtuals: true });

CardSchema.pre<ICardDoc>('save', async function (next) {
    this.slug = slugify(`card${this.cardBin}`, { lower: true });
    next();
});

// define the model constant
const Card: Model<ICardDoc> = mongoose.model<ICardDoc>('Card', CardSchema);

export default Card;
