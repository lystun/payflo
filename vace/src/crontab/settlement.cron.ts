import Worker from "./worker"
import { updateDueSettlementJob } from '../queues/jobs/settlement.job'

export const updateDueSettlementCron = async (cron: string | any) => {

    const cronworker = new Worker(); // create worker instance

    // set cron expression
    cronworker.expression = cron;

    // schedule the job (starts automatically with false as first parameter)
    cronworker.schedule(false, '', () => {
        updateDueSettlementJob();
    })

}