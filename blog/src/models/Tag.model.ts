import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { ITagDoc } from '../utils/types.util'


const TagSchema = new mongoose.Schema (

    {

        name: {
            type: String,
            required: [true, 'category name is required']
        },

        description: {
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

        categories: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Category'
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

TagSchema.set('toJSON', { getters: true, virtuals: true });

TagSchema.pre<ITagDoc>('save', async function(next){
    this.slug = slugify(this.name, { lower: true });
    next();
});

TagSchema.statics.findByTagId = (id) => {
    return Tag.findOne({userId: id});
}

// define the model constant
const Tag: Model<ITagDoc> = mongoose.model<ITagDoc>('Tag', TagSchema);

export default Tag;
