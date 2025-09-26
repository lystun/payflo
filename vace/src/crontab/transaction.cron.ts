import Worker from "./worker"
import { updateBankTransactionJob } from "../queues/jobs/transaction.job";

/**
 * @name updateBankTransactionCron
 * @param cron 
 */
export const updateBankTransactionCron = async (cron: string | any) => {

    const cronworker = new Worker(); // create worker instance

    // set cron expression
    cronworker.expression = cron;

    // schedule the job (starts automatically with false as first parameter)
    cronworker.schedule(false, '', () => {
        updateBankTransactionJob();
    })

}