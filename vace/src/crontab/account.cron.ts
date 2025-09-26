import Worker from './worker'
import { generateVirtualAccountJob } from '../queues/jobs/account.job';

/**
 * @name autoGenerateAccounts
 * @param cron 
 */
export const autoGenerateAccounts = async (cron: any | string) => {

    // set a new worker instance
    const cronworker = new Worker();

    // set the cron exoression
    cronworker.expression = cron;
    
    // schedule the job (starts automatically with false as first parameter)
    cronworker.schedule(false, '', async () => {

       generateVirtualAccountJob();

    })

}

