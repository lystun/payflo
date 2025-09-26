import { Random } from "@btffamily/vacepay";
import { SendOutNotificationDTO } from "../../dtos/webhook.dto";
import WebhookService from "../../services/webhook.service";
import BullQueue from "../bull.queue";
import QueueChnannels from "../channel.queue";

const sendOutNotification = async (data: SendOutNotificationDTO): Promise<void> => {

    const { transaction, business, type } = data;
    await WebhookService.sendWebhookNotification({ transaction, business, type });
 
}

export const sendWebhookNotificationJob = async (data: SendOutNotificationDTO): Promise<void> => {

    const { transaction, business, type } = data;

    let rand = Random.randomCode(6, false);
    const webhookQueue = new BullQueue(`${QueueChnannels.SendWebhook}${rand}`);

    // add job to queue
    webhookQueue.addToQueue([
        {
            data: { 
                transaction: transaction,
                business: business,
                type: type
            },
            delay: 20000,
            name: 'webhook-job'
        }
    ]);

    // process queue job
    webhookQueue.processRetryJobs(sendOutNotification);
 
}