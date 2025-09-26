import User from "../../models/User.model";
import DeviceService from "../../services/device.service";
import { IUserDoc } from "../../utils/types.util";
import BullQueue from "../bull.queue";
import QueueChnannels from "../channel.queue";

export const createOrUpdateDeviceJob = async (user: IUserDoc, source: string) => {

    // create queue
    const deviceQueue = new BullQueue(QueueChnannels.Device);
    
    // add job to queue
    deviceQueue.addToQueue([{
        data: { userId: user._id, source: source },
        delay: 100,
        name: 'creat-update-device-job'
    }]);

    // process queue
    deviceQueue.processJobs(async (data) => {

        const { userId, source } = data;

        const user = await User.findOne({ _id: userId });

        if(user){

            // create devices
            await DeviceService.createDevice({ user, source });

        }

        

    })

}