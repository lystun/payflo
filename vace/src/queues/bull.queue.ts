import Bull, { QueueOptions, Queue, Job } from 'bull';
import { Random } from '@btffamily/vacepay';
import { IJobData } from '../utils/types.util';
import logger from '../utils/logger.util';
import ENV from '../utils/env.util';

const options: QueueOptions = {
    redis: {
        tls: {},
        connectTimeout: 80000
    },
    limiter: { max: 5, duration: 30000 }
}

class BullQueue {

    private queue: Queue;
    public redisUrl: string;

    constructor(queueName: string){

        this.redisUrl = `rediss://${process.env.REDIS_USER}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${parseInt(process.env.REDIS_PORT || '6379')}`
        this.queue = new Bull(queueName, this.redisUrl, options);

    }

    public async addToQueue (jobs: Array<IJobData>){

        for (let i = 0; i < jobs.length; i++) {

            let job: IJobData = jobs[i];
            let rand = Random.randomCode(6,true);
            let name = job.name ? job.name : '';

            await this.queue.add(job.data, {
                jobId: rand,
                lifo: false,
                delay: job.delay,
                removeOnComplete: true,
                attempts: 3
            });

        }

    }

    public async processJobs(callback: (data: any) => Promise<void>){

        // process the queue: call the callback function
        this.queue.process(async (job: Job, done: any) => {
            await callback(job.data);
            done();
        });
        
        // notify when the job is done
        this.queue.on('completed', (job:any, res:any) => {
            let message = `job with the id: ${job.id} completed`;
            if(ENV.isDev() || ENV.isStaging()){
                logger.log(message, { className: 'jq', type: 'success' });
            }
        });

        this.queue.on('error', (err: any) => {
            let message = `there was an error completing job: ${err.message}`;
            if(ENV.isDev() || ENV.isStaging()){
                logger.log(message, { className: 'jq', type: 'error' })
            }
        });

    }

    public async processRetryJobs(callback: (data: any) => Promise<void>){

        // process the queue: call the callback function
        this.queue.process(async (job: Job, done: any) => {

            try {
                await callback(job.data);
                done();

            } catch (err) {
                done(err)
            }
            
        });
        
        // notify when the job is done
        this.queue.on('completed', (job:any, res:any) => {
            let message = `job with the id: ${job.id} completed`;
            logger.log(message, { className: 'jq', type: 'success' });
        });

        this.queue.on('error', (err: any) => {
            let message = `there was an error completing job: ${err.message}`;
            logger.log(message, { className: 'jq', type: 'error' })
        });

    }

}

export default BullQueue;