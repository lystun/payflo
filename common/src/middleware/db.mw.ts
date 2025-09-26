import mongoose, { Model, Schema } from 'mongoose';
import colors from 'colors'


let dbConn: any = null; //use global var

const options: object = {

    useNewUrlParser: true,
    autoIndex: true,
    maxPoolSize: 1000,
    wtimeoutMS:60000,
    connectTimeoutMS: 60000,
    socketTimeoutMS: 60000,
    serverSelectionTimeoutMS: 60000,
    family: 4,
    useUnifiedTopology: true

}

const cert = `${__dirname.split('middleware')[0]}src/ca-certificate.crt`;
// console.log(__dirname);

export const connectDB = async (authType: string, authDB: string): Promise<void> => {

    if(authType === 'development' || authType === 'production' || authType === 'staging'){

        dbConn = mongoose.createConnection(authDB, options);

    }else if(authType === 'cloud'){

        const cloudDBString = authDB + `&tls=true&tlsCAFile=${cert}`;
        dbConn = mongoose.createConnection(cloudDBString, options);

    }else {
        console.log('Authentication type is required');
    }

}

export const getRoleModel = async (authType: string, authDB: string): Promise<Model<Schema>> => {

    // console.log(authDB);
    await connectDB(authType, authDB);
    const model = await dbConn.collection('roles');
    return model;

}