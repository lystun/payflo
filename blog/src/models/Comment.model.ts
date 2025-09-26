import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { ICommentDoc } from '../utils/types.util'

const CommentSchema = new mongoose.Schema (

    {

        body: {
            type: String,
            required: [true, 'comment body is required'],
            maxlength: [5000, 'comment body cannot be more than 5000 characters']
        },

        isEnabled: {
            type: Boolean,
            default: true
        },

        reactions: [
            {

                type: {
                    type: String,
                    enum: ['like', 'insight', 'clap'],
                    default: 'like'
                },

                count: {
                    type: Number,
                    default: 0
                }
            }
        ],

       
        post: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Post'
        },

        user: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'User'
        },

        author: {
            type: mongoose.Schema.Types.Mixed
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

CommentSchema.set('toJSON', { getters: true, virtuals: true });

CommentSchema.pre<ICommentDoc>('save', async function(next){
    next();
});

CommentSchema.statics.findByCommentId = (id) => {
    return Comment.findOne({ _id: id});
}

// define the model constant
const Comment: Model<ICommentDoc> = mongoose.model<ICommentDoc>('Comment', CommentSchema);

export default Comment;
