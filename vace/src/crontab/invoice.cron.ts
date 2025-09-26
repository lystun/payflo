import Worker from "./worker"
import { processUpdateOverdueJob } from '../queues/jobs/invoice.job'

export const checkOverdueInvoices = async (cron: string | any) => {

    const cronworker = new Worker(); // create worker instance

    // set cron expression
    cronworker.expression = cron;

    // schedule the job (starts automatically with false as first parameter)
    cronworker.schedule(false, '', () => {
        processUpdateOverdueJob();
    })

}