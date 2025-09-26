import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html';
import { IPostDoc } from '../utils/types.util'


const PostSchema = new mongoose.Schema (

    {

        title: {
            type: String,
            required: [true, 'post title is required'],
            trim: true
        },

        headline: {
            type: String,
            required: [true, 'post headline is required'],
            trim: true
        },

        abstract: {
            type: String,
            maxlength: [500, 'abstract cannot be more than 500 characters'],
            trim: true
        },

        body: {
            type: String,
            required: [true, 'post body is required']
        },

        markedHtml: {
            type: String
        },

        cover: {
            type: String
        },

        thumbnail: {
            type: String
        },

        wordCount: {
            type: Number,
            default: 0
        },

        publishedAt: {
            type: mongoose.Schema.Types.Mixed
        },

        slug: {
            type: String,
            unique: [true, 'slug already exists']
        },

        premalink: {
            type: String,
            default: ''
        },

        previewLink: {
            type: String,
            default: ''
        },

        isPublished: {
            type: Boolean,
            default: false
        },

        isEnabled: {
            type: Boolean,
            default: true
        },

        status: {
            type: String,
            enum: ['pending', 'published'],
            default: 'pending'
        },

        tags: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Tag'
            }
        ],

        category: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Category'
        },

        bracket: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Bracket'
        },

        comments: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Comment'
            }
        ],

        reactions: [
            {
                user: {
                    type: mongoose.Schema.Types.Mixed,
                    ref: 'User'
                },

                type: {
                    type: String,
                    enum: ['like', 'insightful', 'clap'],
                    default: 'like'
                },

                count: {
                    type: Number,
                    default: 0
                }
            }
        ],

        contributors: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'User'
            }
        ],

        author:{
            type: mongoose.Schema.Types.Mixed,
            ref: 'User'
        },

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

PostSchema.set('toJSON', { getters: true, virtuals: true });

PostSchema.pre<IPostDoc>('save', async function(next){

    this.slug = slugify(this.title, { lower: true, strict: true });

    // const strip = new JSDOM(converted);
    const converted = marked.parse(this.body);
    this.markedHtml = sanitizeHtml(converted, { 
        allowedTags: false,
        allowedAttributes: false,
        allowedSchemes: ['data', 'http', 'https', 'ftp', 'mailto', 'tel'],
        allowedSchemesByTag: { img: ['data'] },
        allowedClasses: {
            'code': [ 'language-*', 'lang-*' ],
            '*': [ 'fancy', 'simple' ]
        }
    });

    next();
});

PostSchema.statics.findByPostId = (id) => {
    return Post.findOne({userId: id});
}

// define the model constant
const Post: Model<IPostDoc> = mongoose.model<IPostDoc>('Post', PostSchema);

export default Post;
