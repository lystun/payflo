import mongoose from 'mongoose'
import colors from 'colors'
import { generate } from '../utils/random.util'

import redis from '../middleware/redis.mw'

import nats from '../events/nats';
import CountryFound from '../events/listeners/country-found';
import LocationSaved from '../events/listeners/location-saved';
import UserDeleted from '../events/listeners/user-deleted';
import AuditService from '../events/listeners/audit-created';
import NotificationCreated from '../events/listeners/notification-created';
import { Random } from '@btffamily/vacepay';
import ENV from '../utils/env.util';

const cert = `${__dirname.split('config')[0]}_data/ca-certificate.crt`;
const cloudDBString = process.env.MONGODB_CLOUD_URI + `&tls=true&tlsCAFile=${cert}`

mongoose.Promise = global.Promise;

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

const connectRedis = async (): Promise<void> => {

    const PORT = process.env.REDIS_PORT || '6379';
    const HOST = process.env.REDIS_HOST || '127.0.0.1';
    const PASS = process.env.REDIS_PASSWORD || '';

    await redis.connect({ user: process.env.REDIS_USER || '', password: PASS, host: HOST, port: parseInt(PORT) });

} 

const connectNats = async (): Promise<void> => {

    const gen = Random.randomCode(8, false);
    const NATS_CLIENT_ID = 'vace-auth-' + gen.toString() + '-service'

    if(!process.env.NATS_CLUSTER_ID){
        throw new Error(`NATS_CLUSTER_ID must be defined`)
    }

    if(!process.env.NATS_URI){
        throw new Error(`NATS_URI must be defined`)
    }

    // connect to NATS
    await nats.connect(process.env.NATS_CLUSTER_ID, NATS_CLIENT_ID, process.env.NATS_URI, process.env.NATS_USER, process.env.NATS_PASSWORD );

    process.on('SIGINT', async () => { 
        // await nats.client.close();

        // console.log(colors.cyan.inverse(`NATS Restarting...`));
        // await nats.connect(process.env.NATS_CLUSTER_ID!, NATS_CLIENT_ID, process.env.NATS_URI!, process.env.NATS_USER, process.env.NATS_PASSWORD);
    });  // watch for signal intercept or interruptions
    
    process.on('SIGTERM', async () => { 
        // await nats.client.close()

        // console.log(colors.cyan.inverse(`NATS Restarting...`));
        // await nats.connect(process.env.NATS_CLUSTER_ID!, NATS_CLIENT_ID, process.env.NATS_URI!, process.env.NATS_USER, process.env.NATS_PASSWORD);
    })  // watch for signal termination

    nats.client.on('close', async() => {
        console.log(colors.red.inverse(`NATS connection closed. Restarting...`));
        await nats.connect(process.env.NATS_CLUSTER_ID!, NATS_CLIENT_ID, process.env.NATS_URI!, process.env.NATS_USER, process.env.NATS_PASSWORD);
        // process.exit();
    })

}

const listenNats = async (): Promise<void> => {

    let log: boolean = ENV.isProduction() ? false : true;

    await new CountryFound(nats.client).listen(log);
    await new LocationSaved(nats.client).listen(log);

    await new NotificationCreated(nats.client).listen(log);
    await new AuditService(nats.client).listen(log);
    await new UserDeleted(nats.client).listen(log);

}

const connectDB = async (): Promise<void> => {

    // connect to nats
    await connectNats();

    // listen to nats
    await listenNats();

    // connect to redis
    await connectRedis();
    
    //connect to mongoose
    if(process.env.NODE_ENV === 'test'){
    
        const dbConn = await mongoose.connect(process.env.MONGODB_TEST_URI || '', options);
        console.log(colors.cyan.bold.underline(`Database {test} connected: ${dbConn.connection.host}`));
    }

    if(process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production'){
        
        const dbConn = await mongoose.connect(process.env.MONGODB_URI || '', options);
        console.log(colors.cyan.bold.underline(`Database connected: ${dbConn.connection.host}`));
    }

}

export default connectDB;

