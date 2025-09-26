import mongoose from 'mongoose'
import colors from 'colors'
import { config } from 'dotenv'

// env vars //make
config();

// models
import User from './src/models/User.model'

const options: object = {

    useNewUrlParser: true,
    autoIndex: true,
    
    maxPoolSize: 10,
    wtimeoutMS:2500,
    connectTimeoutMS: 25000,
    socketTimeoutMS: 45000,
    family: 4,
    useUnifiedTopology: true

}

// connect to db
const connectDB = async(): Promise<void> => {

    if(process.env.NODE_ENV === 'test'){
        mongoose.connect(process.env.MONGODB_TEST_URI || '', options);
    }

    if(process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production'){
        mongoose.connect(process.env.MONGODB_URI || '', options);
    }

}

// delete data
const deleteData = async () : Promise<void> => {

    try {

        await connectDB();

        await User.deleteMany();

        console.log(colors.red.inverse('data destroyed successfully...'));
        process.exit();
        
    } catch (err) {
        console.log(err);
    }

}

if(process.argv[2] === '-d'){
    deleteData();
}
