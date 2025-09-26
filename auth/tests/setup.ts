import { seedData } from '../src/config/seeds/seeder.seed'
import mongoose from 'mongoose'
import redis from '../src/middleware/redis.mw'
import colors from 'colors';
import { config } from 'dotenv'
import { deleteDBData } from '../remover'
import { generate } from '../src/utils/random.util';
import nats from '../src/events/nats';


// variables
var dbConn: any;

// timeout
jest.setTimeout(1000000);

const connectRedis = async (): Promise<void> => {

    const PORT = process.env.REDIS_PORT || '6379';
    const HOST = process.env.REDIS_HOST || '127.0.0.1';
    const PASS = process.env.REDIS_PASSWORD || '';

    await redis.connect({ user: process.env.REDIS_USER || '', password: PASS, host: HOST, port: parseInt(PORT) });

} 

const connectNats = async (): Promise<void> => {

    const gen = await generate(8, true);
    const NATS_CLIENT_ID = 'node-auth-' + gen + '-service'

    if(!process.env.NATS_CLUSTER_ID){
        throw new Error(`NATS_CLUSTER_ID must be defined`)
    }

    if(!process.env.NATS_URI){
        throw new Error(`NATS_URI must be defined`)
    }

    // connect to NATS
    await nats.connect(process.env.NATS_CLUSTER_ID, NATS_CLIENT_ID, process.env.NATS_URI, process.env.NATS_USER, process.env.NATS_PASSWORD );

    process.on('SIGINT', () => { nats.client.close() });  // watch for signal intercept or interruptions
    process.on('SIGTERM', () => { nats.client.close() })  // watch for signal termination

    nats.client.on('close', async() => {
        console.log(colors.red.inverse(`NATS connection closed. Restarting...`));
        await nats.connect(process.env.NATS_CLUSTER_ID!, NATS_CLIENT_ID, process.env.NATS_URI!, process.env.NATS_USER, process.env.NATS_PASSWORD);
        // process.exit();
    })

}

beforeAll( async () => {

    // env vars //make changes
    config();

    // conn options
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

    // connect to NATS
    await connectNats();

    // connect to redis
    await connectRedis();

    // connect to DB
    dbConn = await mongoose.connect(process.env.MONGODB_TEST_URI || '', options);
    console.log(colors.cyan.bold.underline(`Database connected: ${dbConn.connection.host}`));

    // seed data
    await seedData();

})

beforeEach( async () => {

    // write some program to run before each test
    // jest.useFakeTimers()

})

afterAll( async () => {

    // delete db data
    // await deleteDBData();

    // close connection
    await dbConn.connection.close();

})