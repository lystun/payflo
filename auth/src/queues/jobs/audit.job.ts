import { NewAuditDTO } from "../../dtos/audit.dto";
import AuditService from "../../services/audit.service";
import { IJobData } from "../../utils/types.util";
import BullQueue from "../bull.queue";
import QueueChnannels from "../channel.queue";

export const createAuditJob = async (data: NewAuditDTO) => {

    const auditQueue = new BullQueue(QueueChnannels.Audit);

    const job: IJobData = {
        data: data,
        delay: 100,
        name: 'create-audit-job'
    }
    auditQueue.addToQueue([job])

    // process job
    auditQueue.processJobs(async (data) => {
        AuditService.createAudit(data);
    })

}