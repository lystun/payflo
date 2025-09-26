import User from '../models/User.model';
import Worker from './worker'
import nats from '../events/nats';
import UserCreated from '../events/publishers/user-created';
import Role from '../models/Role.model';
import UserService from '../services/user.service'
import { UserType } from '../utils/enums.util';
import logger from '../utils/logger.util';
import SystemService from '../services/system.service';

/**
 * @name unlockUserAccounts
 * @param cron 
 */
export const unlockUserAccounts = async (cron: any | string) => {

    // set a new worker instance
    const cronworker = new Worker();

    // set the cron exoression
    cronworker.expression = cron;
    
    // schedule the job (starts automatically with false as first parameter)
    cronworker.schedule(false, '', async () => {

        // find all users
        const users = await User.find({ isLocked: true, isActive: true });

        if(users.length > 0){
            
            // unlock the accounts
            for(let i = 0; i < users.length; i++){

                if(users[i].isLocked === true){

                    users[i].isLocked = false;
                    users[i].loginLimit = 0;
                    await users[i].save();

                    logger.log(`${users[i].email} account unlocked`, { type: 'info' });

                }

            }

        }
        

    })

}

/**
 * @name syncAdminDetails
 * @param cron 
 */
export const syncAdminDetails = async (cron: any | string) => {

    // set a new worker instance
    const cronworker = new Worker();

    // set the cron exoression
    cronworker.expression = cron;
    
    // schedule the job (starts automatically with false as first parameter)
    cronworker.schedule(false, '', async () => {

        // find all role

        const role = await Role.findOne({ name: 'superadmin' });
        const user = await User.findOne({ email: process.env.SUPERADMIN_EMAIL });

        if(role && user && user.userType === UserType.SUPER){

            // publish NATS
            await SystemService.syncNatsData({ user: user, userType: 'superadmin', phoneCode: '+234' }, 'user.created', 'type.create');

            // sync superadmin APIKey
            await UserService.syncUserAPIKey(process.env.SUPERADMIN_EMAIL || '');
    
            // stop the current task ( this runs the task once )
            cronworker.event.emit('CRON COMPLETED SA');

            // listen for event
            cronworker.event.on('CRON COMPLETED SA', () => {
                console.log('cron done');
                cronworker.task.stop();
            })

        }
        

    })


}

