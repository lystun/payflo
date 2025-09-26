import Cron from './worker'

export const doJob = async (cron: any | string) => {

    // set a new worker instance
    const cronworker = new Cron();

    // set the cron exoression
    cronworker.expression = cron;
    
    // schedule the job (starts automatically with false as first parameter)
    cronworker.schedule(false, '', async () => {
        console.log('running a task every second')
    })


}
