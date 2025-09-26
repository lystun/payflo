import { Random } from "@btffamily/vacepay";
import { SendOutNotificationDTO } from "../../dtos/webhook.dto";
import WebhookService from "../../services/webhook.service";
import BullQueue from "../bull.queue";
import QueueChnannels from "../channel.queue";
import ScriptService from "../../services/script.service";

interface IRunScript {
    scriptType: string
}

export const runScriptJob = async (data: IRunScript): Promise<void> => {

    const { scriptType } = data;
    const webhookQueue = new BullQueue(`${QueueChnannels.RunScript}${Random.randomCode(4,true)}`);

    // add job to queue
    webhookQueue.addToQueue([
        {
            data: data,
            delay: 100,
            name: 'run-scripts-job'
        }
    ]);

    // process queue job
    webhookQueue.processJobs(async (data) => {

        const { scriptType } = data as IRunScript;

        if(scriptType === 'settings-data'){
            ScriptService.createSettingData()
        }

        if(scriptType === 'settlement-task'){
            ScriptService.runSettlementTask()
        }

        if(scriptType === 'complete-settlement'){
            ScriptService.completeSettlements()
        }

        if(scriptType === 'bank-providers-id'){
            ScriptService.syncBankProvidersId()
        }

        if(scriptType === 'clean-reversals'){
            ScriptService.cleanReversalTransactions()
        }

        if(scriptType === 'update-after-settle'){
            ScriptService.updateAfterSettledTransactions()
        }

    });
 
}