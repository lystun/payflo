import app from './config/app.config'
import colors from 'colors'
import { seedData } from './config/seeds/seeder.seed'
import connectDB from './config/db.config'
import { getMemoryStats } from './utils/memory.util'
import { unlockUserAccounts, syncAdminDetails } from './crontab/user.cron'
import UserService from './services/user.service'
import { Server, Socket } from 'socket.io'
import http from 'http';
import { GetNotifySocketDTO } from './dtos/user.dto'
import NotificationService from './services/notification.service'

const connect = async (): Promise<void> => {

    // connect to DB
    await connectDB();

    // get heap statistics and log heap size 
    const heapSize = getMemoryStats()
    console.log(heapSize);

    // seed data
    await seedData();
    
    // start job automatically //

    // unlock user accounts: run every 0 seconds of every 30th minute of every hour of every day of month of every month of every day of week
    unlockUserAccounts('0 */29 * * * *');

    // sync superadmin details to all services: run every 0 seconds of every 1st minute of every 24th hour of every day of month of every month of every day of week
    syncAdminDetails('0 */1 */23 * * *');

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
    so.on('get-notification', async (data: GetNotifySocketDTO) => {

        const { userId } = data;
        const notifications = await NotificationService.getNotificationsViaSocket({ userId });

        so.emit('notification-data', notifications);

    });

    // process disconnect
    so.on('disconnect', () => {
        so.emit('disconnected')
    })

})

server.listen(PORT, () => {
    console.log(colors.yellow.bold(`Auth service running in ${process.env.APP_ENV} on port ${PORT}`));
})

// catch unhandled promise rejections
process.on('unhandledRejection', (err: any, promise) => {
    console.log(colors.red(`err: ${err.message}`));
    server.close(() => process.exit(1));
    ioServer.close
})

