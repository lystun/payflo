import { Random, dateToday, formatISO } from "@btffamily/vacepay"
import Invoice from "../../models/Invoice.model"
import { Request } from 'express'
import { ProviderNameType, TransactionChannelType, TransactionFeatureType, TransactionStatus, UserType } from "../../utils/enums.util"
import { IBusinessDoc, IFilterDate, IInvoiceDoc, IJobData, ISearchQuery } from "../../utils/types.util"
import BullQueue from "../bull.queue"
import QueueChnannels from "../channel.queue"
import ProviderService from "../../services/provider.service"
import ENV from "../../utils/env.util"
import Transaction from "../../models/Transaction.model"
import TransactionMapper from "../../mappers/transaction.mapper"
import { populate, search } from "../../utils/result.util"
import TransactionService from "../../services/transaction.service"
import User from "../../models/User.model"
import Business from "../../models/Business.model"
import BaniService from "../../services/providers/bani.service"
import { BaniTransactionDTO } from "../../dtos/providers/bani.dto"

interface ExportTransactionJobDTO {
    email?: string,
    populate: Array<any>,
    queryParam: any,
    filters: Array<any>,
    params: IFilterDate,
    business: IBusinessDoc,
    isAdmin: boolean
}

/**
 * @name updateBankTransactionJob
 */
export const updateBankTransactionJob = async (): Promise<void> => {

    const updateQueue = new BullQueue(QueueChnannels.UpdateTransaction);
    const job: IJobData = {
        data: { name: 'transaction' },
        delay: 100,
        name: 'update-bank-transactions'
    }

    updateQueue.addToQueue([job]);
    updateQueue.processJobs(async (data) => {

        const provider = await ProviderService.getProviderFromList('bank');

        if (provider && ENV.isProduction()) {

            const transactions = await Transaction.find({
                feature: TransactionFeatureType.PAYMENT_LINK,
                provider: provider._id,
                $or: [
                    { status: TransactionStatus.PENDING }
                ]
            });

            for (let i = 0; i < transactions.length; i++) {

                let transaction = transactions[i];

                if (provider.name === ProviderNameType.BLUSALT) {

                    let response = await BaniService.verifyPaymentStatus({ reference: transaction.reference });

                    if (!response.error) {

                        const baniResponse: BaniTransactionDTO = response.data;

                        if (!transaction.providerData) {
                            transaction.providerData = baniResponse; // get the data
                        }
                        transaction.providerRef = baniResponse.pay_ref; // get the reference
                        transaction.providerName = ProviderNameType.BANI;
                        transaction.channel = TransactionChannelType.BANK_TRANSFER;
                        transaction.status = TransactionService.getPaymentStatus(baniResponse.pay_status);
                        await transaction.save() // save to DB

                    }


                }

            }

        }

    });

}

/**
 * @name exportTransactionJob
 * @param data 
 */
export const exportTransactionJob = async (data: ExportTransactionJobDTO): Promise<void> => {

    const updateQueue = new BullQueue(`${QueueChnannels.ExportTransaction}.${Random.randomNum(4)}`);
    const job: IJobData = {
        data: {
            params: data.params,
            business: data.business,
            queryParam: data.queryParam,
            filters: data.filters,
            populate: data.populate,
            isAdmin: data.isAdmin,
            email: data.email
        },
        delay: 100,
        name: 'export-card-transactions'
    }

    updateQueue.addToQueue([job]);
    updateQueue.processJobs(async (data) => {

        const { params, filters, queryParam, populate, isAdmin, email } = data as ExportTransactionJobDTO
        const business = await Business.findOne({ _id: data.business._id });

        if(business){

            // search
            let query: ISearchQuery = {
                model: Transaction,
                ref: 'business',
                value: business._id,
                data: filters,
                query: null,
                queryParam: queryParam,
                populate: populate,
                operator: 'and'
            }
            
            // clear where clause if admin is true
            if(isAdmin){
                query.ref = null;
                query.value = null;
            }
    
            const result = await search(query); // search from DB
    
            if (result.data.length > 0) {
    
                const mapped = await TransactionMapper.mapExportTransactionList(result.data);
                result.data = mapped;
    
                await TransactionService.exportAndSendEmail({
                    email: email ? email : business.email,
                    business: business,
                    payload: result,
                    params: params
                });
    
            }

        }

    });

}