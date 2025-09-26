import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IProductDoc } from '../utils/types.util'

const ProductSchema = new mongoose.Schema(

    {
        analytics: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        code: {
            type: String,
            default: ''
        },

        isEnabled: {
            type: Boolean,
            default: true
        },

        name: {
            type: String,
            default: ''
        },

        price: {
            type: Number,
            default: 0
        },

        description: {
            type: String,
            default: ''
        },

        avatar: {
            type: String,
            default: ''
        },

        inflow: {
            value: {
                type: Number,
                default: 0
            },
            count: {
                type: Number,
                default: 0
            }
        },

        slug: String,

        business: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Business'
        },

        payments: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'PaymentLink'
            },
        ],

        transactions: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Transaction'
            },
        ]

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

ProductSchema.set('toJSON', { getters: true, virtuals: true });

ProductSchema.pre<IProductDoc>('save', async function (next) {
    this.slug = slugify(`${this.name}`, { lower: true });
    next();
});

// define the model constant
const Product: Model<IProductDoc> = mongoose.model<IProductDoc>('Product', ProductSchema);

export default Product;
