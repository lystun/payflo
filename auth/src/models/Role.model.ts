import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IRoleDoc } from '../utils/types.util'

const RoleSchema = new mongoose.Schema (

    {

        name: {
            type: String,
            required: [true, 'please add a role name']
        },

        description: {
            type: String,
            required: [true, 'please add a role description'],
            maxlength: [255, 'role description cannot be more than 255 characters']
        },

        slug: String,

        users: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'User'
            }
        ],

        resources: [
            {
                type: mongoose.Schema.Types.Mixed,
                ref: 'Resource'
            }
        ]

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

RoleSchema.set('toJSON', { getters: true, virtuals: true });

RoleSchema.pre<IRoleDoc>('save', async function(next){
    this.slug = slugify(this.name, { lower: true });
    next();
});

RoleSchema.statics.findByName = (roleName) => {
    return Role.findOne({name: roleName});
}

RoleSchema.statics.getRoleName = (roleId) => {
    return Role.findById(roleId);
}

RoleSchema.statics.getAllRoles = () => {
    return Role.find({});
}

// define the model constant
const Role: Model<IRoleDoc> = mongoose.model<IRoleDoc>('Role', RoleSchema);

export default Role;
