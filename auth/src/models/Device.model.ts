import mongoose, { Model, ObjectId } from 'mongoose'
import slugify from 'slugify'
import { IDeviceDoc } from '../utils/types.util'

const DeviceSchema = new mongoose.Schema(

    {

        platform: {
            type: String,
            default: ''
        },

        version: {
            type: String,
            default: ''
        },

        login: {
            type: String,
            default: ''
        },

        os: {
            name: {
                type: String,
                default: ''
            },
            shortName: {
                type: String,
                default: ''
            },
            platform: {
                type: String,
                default: ''
            },
            version: {
                type: String,
                default: ''
            }
        },

        client: {
            type: {
                type: String,
                default: ''
            },
            name: {
                type: String,
                default: ''
            },
            shortName: {
                type: String,
                default: ''
            },
            version: {
                type: String,
                default: ''
            }
        },

        details: {
            id: {
                type: String,
                default: ''
            },
            type: {
                type: String,
                default: ''
            },
            brand: {
                type: String,
                default: ''
            },
            code: {
                type: String,
                default: ''
            }
        },
        source: {
            type: String,
            default: ''
        },
        isMobile: {
            type: String,
            default: ''
        },
        isDesktop: {
            type: String,
            default: ''
        },
        browser: {
            type: String,
            default: ''
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
            transform(doc, ret) {
                ret.id = ret._id
            }
        }
    }

)

DeviceSchema.set('toJSON', { getters: true, virtuals: true });

DeviceSchema.pre<IDeviceDoc>('save', async function (next) {
    next();
});

DeviceSchema.statics.getAllDevices = () => {
    return Device.find({});
}

// define the model constant
const Device: Model<IDeviceDoc> = mongoose.model<IDeviceDoc>('Device', DeviceSchema);

export default Device;
