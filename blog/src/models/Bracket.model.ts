import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IBracketDoc } from '../utils/types.util'

const BracketSchema = new mongoose.Schema (

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

BracketSchema.set('toJSON', { getters: true, virtuals: true });

BracketSchema.pre<IBracketDoc>('save', async function(next){
    this.slug = slugify(this.name, { lower: true });
    next();
});

BracketSchema.statics.getBrackets = (id) => {
    return Bracket.findOne({userId: id});
}

// define the model constant
const Bracket: Model<IBracketDoc> = mongoose.model<IBracketDoc>('Bracket', BracketSchema);

export default Bracket;
