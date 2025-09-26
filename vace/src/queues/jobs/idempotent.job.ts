import { StoreRequestKeyDTO } from "../../dtos/security/idempotent.dto";
import IdempotentService from "../../services/security/idempotent.service";
import BullQueue from "../bull.queue";
import QueueChnannels from "../channel.queue";

/**
 * @name addBeneficiaryJob
 * @param data 
 */
export const saveIdempotentKeyJob = async (data: StoreRequestKeyDTO) => {

    // create queue
    const addIdempQueue = new BullQueue(QueueChnannels.StoreIdemptKey);

    // add job to queue
    addIdempQueue.addToQueue([{
        data: data,
        delay: 100,
        name: 'add-idempt-job'
    }]);

    // process queue
    addIdempQueue.processJobs(async (data) => {

        const { key, payload, transaction, user } = data as StoreRequestKeyDTO

        await IdempotentService.storeRequestKey({
            key, payload, transaction, user
        })

    })

}