import { UpdatePlatformRevenueDTO } from '../../dtos/vace.dto';
import Business from '../../models/Business.model';
import VacepayService from '../../services/vacepay.service';
import { sendGrid } from '../../utils/email.util'
import { IBusinessDoc, IJobData, ITransactionDoc, IWalletDoc } from '../../utils/types.util';
import BullQueue from '../bull.queue';
import QueueChnannels from '../channel.queue';

/**
 * @name updateVaceRevenue
 * @param data 
 */
const updatePlatformRevenue = async (data: UpdatePlatformRevenueDTO): Promise<void> => {

   const { transaction, wallet, business } = data;
   await VacepayService.updateWalletRevenue({ transaction, wallet, business });

}

const updatePlatformRevenueReversal = async (data: UpdatePlatformRevenueDTO): Promise<void> => {

    const { transaction, wallet, business } = data;
    await VacepayService.updateWalletRevenueReversal({ transaction, wallet, business });
 
 }

/**
 * @name updateVacepayRevenueJob
 * @param transaction 
 */
export const updateVacepayRevenueJob = async (transaction: ITransactionDoc): Promise<void> => {

    const vacepay = await VacepayService.getAdminBusiness()

    if(vacepay.error === false){

        const updateQueue = new BullQueue(QueueChnannels.UpdateRevenue);

        const business: IBusinessDoc = vacepay.data;
        const wallet: IWalletDoc = business.wallet;
    
        // define job
        const job: IJobData = {
            data: { 
                transaction: transaction, 
                wallet: wallet,
                business: business
            },
            delay: 100,
            name: 'Update-Revenue'
        }

        updateQueue.addToQueue([job]); // add to queue
        updateQueue.processJobs(updatePlatformRevenue);

    }


}

/**
 * @name updateRevenueReversalJob
 * @param transaction 
 */
export const updateRevenueReversalJob = async (transaction: ITransactionDoc): Promise<void> => {

    const vacepay = await VacepayService.getAdminBusiness()

    if(vacepay.error === false){

        const updateQueue = new BullQueue(QueueChnannels.UpdateRevenue);

        const business: IBusinessDoc = vacepay.data;
        const wallet: IWalletDoc = business.wallet;
    
        // define job
        const job: IJobData = {
            data: { 
                transaction: transaction, 
                wallet: wallet,
                business: business
            },
            delay: 100,
            name: 'Update-Revenue'
        }

        updateQueue.addToQueue([job]); // add to queue
        updateQueue.processJobs(updatePlatformRevenueReversal);

    }


}



