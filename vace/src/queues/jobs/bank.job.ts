import { IBusinessDoc, IUserDoc, IWalletDoc } from "../../utils/types.util";
import BullQueue from "../bull.queue";
import QueueChnannels from "../channel.queue";
import ProviderService from "../../services/provider.service";
import AccountRepository from "../../repositories/account.repository";
import ENV from "../../utils/env.util";
import BusinessService from "../../services/business.service";
import { AddBeneficiaryDTO } from "../../dtos/business.dto";
import BeneficiaryService from "../../services/beneficiary.service";
import BankService from "../../services/bank.service";
import { CreateBankDTO } from "../../dtos/account.dto";
import Business from "../../models/Business.model";

/**
 * @name addBeneficiaryJob
 * @param data 
 */
export const addBeneficiaryJob = async (data: AddBeneficiaryDTO) => {

    // create queue
    const addBeneQueue = new BullQueue(QueueChnannels.AddBeneficiary);
    
    // add job to queue
    addBeneQueue.addToQueue([{
        data: {
            accountName: data.accountName, 
            accountNo: data.accountNo, 
            bank: data.bank, 
            business: data.business
        },
        delay: 100,
        name: 'add-bene-job'
    }]);

    // process queue
    addBeneQueue.processJobs(async (data) => {

        const { accountName, accountNo, bank, business } = data as AddBeneficiaryDTO

        if(business && business._id){

            const _business = await Business.findOne({ _id: business._id })
    
            if(_business){
    
                await BeneficiaryService.addBeneficiary({
                    accountName,
                    accountNo,
                    bank,
                    business: _business
                })
    
            }

        }


    })

}

/**
 * @name addBankToListJob
 * @param data 
 */
export const addBankToListJob = async (data: CreateBankDTO) => {

    // create queue
    const addBankQueue = new BullQueue(QueueChnannels.AddListBank);
    
    // add job to queue
    addBankQueue.addToQueue([{
        data: data,
        delay: 100,
        name: 'add-bank-job'
    }]);

    // process queue
    addBankQueue.processJobs(async (data) => {

        const { accountName, accountNo, code, business, provider } = data as CreateBankDTO

        if(business && business._id){

            const _business = await Business.findOne({ _id: business._id });
    
            if(_business){
    
                await BankService.createBank({
                    code,
                    accountNo,
                    accountName,
                    business: _business,
                    provider: provider
                })
    
            }

        }



    })

}
