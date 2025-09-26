import { NewAuditDTO } from "../../dtos/audit.dto";
import UserService from "../../services/user.service";
import { IJobData, IUserDoc } from "../../utils/types.util";
import BullQueue from "../bull.queue";
import QueueChnannels from "../channel.queue";

export const deleteUserJob = async (user: IUserDoc) => {

    const auditQueue = new BullQueue(QueueChnannels.DeleteUser);

    const job: IJobData = {
        data: user,
        delay: 100,
        name: 'delete-user-job'
    }
    auditQueue.addToQueue([job])

    // process job
    auditQueue.processJobs(async (data) => {
        
        const user: IUserDoc = data;
        await UserService.deleteUserData(user);

    })

}