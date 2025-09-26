import { Random, arrayIncludes, dateIsEqual, dateToday, leadingNum } from "@btffamily/vacepay";
import BusinessRepository from "../../repositories/business.repository";
import SettlementRepository from "../../repositories/settlement.repository";
import { IAccountDoc, IBusinessDoc, IJobData, IPaymentLinkDoc, IProviderDoc, ISettingDoc, ISettlementDoc, ISettlementPayout, ISubaccountDoc, ITransactionDoc, IWalletDoc } from "../../utils/types.util";
import BullQueue from "../bull.queue";
import QueueChnannels from "../channel.queue";
import dayjs from 'dayjs';
import customParse from 'dayjs/plugin/customParseFormat';
import VacepayService from "../../services/vacepay.service";
import SettlementService from "../../services/settlement.service";
import BusinessService from "../../services/business.service";
import Settlement from "../../models/Settlement.model";
import { SettlementStatus } from "../../utils/enums.util";
import Business from "../../models/Business.model";
import { RefreshSettlementReportDTO } from "../../dtos/settlement.dto";
dayjs.extend(customParse);

/**
 * @name clearSettlementsOverviewJob
 */
export const updateDueSettlementJob = async () => {

    const updateQueue = new BullQueue(QueueChnannels.Settlement);

    // define job
    const job: IJobData = {
        data: { settle: "data" },
        delay: 100,
        name: 'update-settlement-overview'
    }

    await updateQueue.addToQueue([job]); // add to queue
    updateQueue.processJobs(async (data) => {

        // get all settlement unsettled
        const settlements = await Settlement.find({ $or: [ { status: SettlementStatus.PENDING }, { status: SettlementStatus.PROCESSING } ] })

        if(settlements.length > 0){

            for(let i = 0; i < settlements.length; i++){

                let settlement = settlements[i]

                // today
                let due = await SettlementService.getDueSettlementOverview({
                    type: 'today',
                    settlement,
                });

                // past
                let past = await SettlementService.getDueSettlementOverview({
                    type: 'past',
                    settlement,
                });

                settlement.overview.dueToday = {
                    amount: due.amount,
                    businesses: due.count
                }

                settlement.overview.pastDue = {
                    amount: past.amount,
                    businesses: past.count
                }

                await settlement.save();

            }

        }


    });

}

/**
 * @name refreshSettlementReportJob
 * @param settlementId 
 */
export const refreshSettlementReportJob = async (settlementId: any) => {

    const updateQueue = new BullQueue(`${QueueChnannels.Settlement}.${Random.randomCode(6, true)}`);

    // define job
    const job: IJobData = {
        data: { settlementId: settlementId },
        delay: 100,
        name: 'refresh-settlement-report'
    }

    await updateQueue.addToQueue([job]); // add to queue
    updateQueue.processJobs(async (data) => {

        const { settlementId } = data;
        prcoessefreshSettlementReportJob(settlementId)

    });

}

/**
 * @name prcoessefreshSettlementReportJob
 * @param settlementId 
 */
const prcoessefreshSettlementReportJob = async (settlementId: any) => {

    const settlement = await SettlementRepository.findById(settlementId, false);
    if(settlement){
        await SettlementService.refreshSettlementReport({ settlement })
    }
    
}

/**
 * @name runSettlementJob
 * @description Method runs lump settlement job => using the queue
 * @param settlement 
 */
export const runSettlementJob = async (settlement: ISettlementDoc, forceRun: boolean, addPast: boolean): Promise<void> => {

    const settleQueue = new BullQueue(QueueChnannels.LumpSettlement);

    // define job
    const job: IJobData = {
        data: { settlementId: settlement._id, forceRun, addPast },
        delay: 100,
        name: 'run-lump-settlement'
    }

    settleQueue.addToQueue([job]); // add to queue

    settleQueue.processJobs(async (data) => {

        const { settlementId, forceRun, addPast } = data;
        prcoessRunSettlementJob(settlementId, forceRun, addPast)

    });


}

/**
 * @name prcoessRunSettlementJob
 * @description Processes the run limp settlement function from the service
 * @param id 
 */
const prcoessRunSettlementJob = async (id: any, forceRun: boolean, addPast: boolean) => {
    await SettlementService.runLumpSettlement({ settlementId: id, forceRun, addPast })
}

/**
 * @name runBusinessSettlementJob
 * @param settlement 
 * @param business 
 */
export const runBusinessSettlementJob = async (settlement: ISettlementDoc, business: IBusinessDoc, force: boolean): Promise<void> => {

    const settleQueue = new BullQueue(QueueChnannels.LumpSettlement);

    // define job
    const job: IJobData = {
        data: { settlementId: settlement._id, businessId: business._id, force: force },
        delay: 100,
        name: 'run-business-lump-settlement'
    }

    settleQueue.addToQueue([job]); // add to queue

    settleQueue.processJobs(async (data) => {
        const { settlementId, businessId, force } = data;
        prcoessRunBusinessSettlementJob(settlementId, businessId, force)
        
    });


}

/**
 * @name prcoessRunBusinessSettlementJob
 * @param id 
 * @param business 
 */
const prcoessRunBusinessSettlementJob = async (id: any, businessId: any, force: boolean) => {
    await SettlementService.runLumpBusinessSettlement({
        settlementId: id,
        businessId: businessId,
        forceRun: force
    });
}
