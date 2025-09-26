import { IBusinessDoc, IUserDoc, IWalletDoc } from "../../utils/types.util";
import BullQueue from "../bull.queue";
import QueueChnannels from "../channel.queue";
import ProviderService from "../../services/provider.service";
import AccountRepository from "../../repositories/account.repository";
import ENV from "../../utils/env.util";
import BusinessService from "../../services/business.service";

/**
 * @name generateVirtualAccountJob
 * @param data 
 */
export const generateVirtualAccountJob = async () => {

    // get bank provider name
    const providerName = await ProviderService.configProviderName('bank');

    // create queue
    const vaQueue = new BullQueue(QueueChnannels.GenerateAccount);
    
    // add job to queue
    vaQueue.addToQueue([{
        data: { name: providerName },
        delay: 100,
        name: 'generate-va-job'
    }]);

    // process queue
    vaQueue.processJobs(async (data) => {

        const name = data.name;
        const accounts = await AccountRepository.findAndSelectEmptyAccounts(true);

        if(accounts.length > 0){

            for(let i = 0; i < accounts.length; i++){

                let account = accounts[i];
                let business: IBusinessDoc = account.business;
                let wallet: IWalletDoc = business.wallet;
                let user: IUserDoc = business.user;

                if(BusinessService.isCompliant(user) && !account.accountNo && !account.accountName){

                    await BusinessService.createBankAccount(business._id, providerName, 'permanent');

                    if(!ENV.isProduction()){
                        console.log(`generated V/A account for ${business.name}`);
                    }

                }

            }

        }else{

            if(!ENV.isProduction() && !ENV.isStaging()){
                console.log('there are no empty accounts')
            }

        }

    })

}
