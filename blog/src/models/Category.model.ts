import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { ICategoryDoc } from '../utils/types.util'

const CategorySchema = new mongoose.Schema (

    {

        name: {
            type: String,
            required: [true, 'category name is required']
        },

        description: {
            type: String
        },

        code: {
            type: String
        },

        slug: String,

        isEnabled: {
            type: Boolean,
            default: true
        },

        posts: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Post'
            }
        ],

        tags: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Tag'
            }
        ],

        user: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'User'
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

CategorySchema.set('toJSON', { getters: true, virtuals: true });

CategorySchema.pre<ICategoryDoc>('save', async function(next){
    this.slug = slugify(this.name, { lower: true });
    next();
});

CategorySchema.statics.findByCategoryId = (id) => {
    return Category.findOne({userId: id});
}

// define the model constant
const Category: Model<ICategoryDoc> = mongoose.model<ICategoryDoc>('Category', CategorySchema);

export default Category;
