import { NewAuditDTO } from "../../dtos/audit.dto";
import SystemService from "../../services/system.service";
import BullQueue from "../bull.queue";
import QueueChnannels from "../channel.queue";

/**
 * @name addBeneficiaryJob
 * @param data 
 */
export const createNewAuditJob = async (data: NewAuditDTO) => {

    // create queue
    const addAuditQueue = new BullQueue(QueueChnannels.AddBeneficiary);

    // add job to queue
    addAuditQueue.addToQueue([{
        data: data,
        delay: 100,
        name: 'add-audit-job'
    }]);

    // process queue
    addAuditQueue.processJobs(async (data) => {

        const { action, changes, entity, user, controller, description, entityId, type } = data as NewAuditDTO

        await SystemService.syncNatsData({
            audit: {
                action,
                entity,
                user: user && user._id ? user._id : '',
                controller,
                description,
                entityId,
                type,
                changes
            }
        }, 'audit.created', 'type.audit');

    })

}