import app from './config/app.config'
import colors from 'colors'
import { seedData } from './config/seeds/seeder.seed'
import connectDB from './config/db.config'
import { getMemoryStats } from './utils/memory.util'
import { Server, Socket } from 'socket.io'
import http from 'http';
import { GetWalletSocketDTO } from './dtos/wallet.dto'
import BusinessService from './services/business.service'
import { VerifySocketTxnDTO } from './dtos/transaction.dto'
import TransactionService from './services/transaction.service'
import { checkOverdueInvoices } from './crontab/invoice.cron'
import { autoGenerateAccounts } from './crontab/account.cron'
import { updateDueSettlementCron } from './crontab/settlement.cron'
import { updateBankTransactionCron } from './crontab/transaction.cron'

const connect = async (): Promise<void> => {

    // connect to DB
    await connectDB();

    // get heap statistics and log heap size 
    const heapSize = getMemoryStats()
    console.log(heapSize);

    // seed data
    await seedData();
    
    // start con-job automatically //

    /**
     * Checks and updates every overdue invoice status 
     * runs every 0 seconds of every 0th minute of every 2 hour of every day of month of every month of every day of week
     * Basically runs every 2 hours
     */
    // checkOverdueInvoices('0 */2 * * *');

    //BANK: basically runs every within the 12 - 1 PM hour
    // updateBankTransactionCron('0 */12 */23 * * *');

    // re-process settlement overview
    // basically runs every 1AM
    updateDueSettlementCron('0 */1 */24 * * *')

}

connect();  // initialize connection and seed data

// create server
const server = http.createServer(app);

// define PORT
const PORT = process.env.PORT || 5000;

// define socket server //
const ioServer = new Server(server, { 
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE']
    },
    allowEIO3: true,
    pingTimeout: 20000,
    path: '/socket/',
    transports: ['websocket'],
    cookie: false,
});

// REAL_TIME.IO using socket
ioServer.on('connection', (so: Socket) => {

    // get wallet details
    so.on('get-wallet', async (data: GetWalletSocketDTO) => {

        const { businessId } = data;
        const wallet = await BusinessService.getWalletViaSocket({ businessId });

        so.emit('wallet-data', wallet);

    });


    so.on('verify-transaction', async (data: VerifySocketTxnDTO) => {
        const { reference } = data;
        const transaction = await TransactionService.verifySocketTransaction({ reference });

        so.emit('transaction-data', transaction)
    });
    

    // process disconnect
    so.on('disconnect', () => {
        so.emit('disconnected')
    })

})

server.listen(PORT, () => {
    console.log(colors.yellow.bold(`Vace-core service running in ${process.env.APP_ENV} on port ${PORT}`));
})

// catch unhandled promise rejections
process.on('unhandledRejection', (err: any, promise) => {
    console.log(colors.red(`err: ${err.message}`));
    server.close(() => process.exit(1));
    ioServer.close()
})

