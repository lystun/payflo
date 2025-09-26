import { ObjectId, FilterQuery } from "mongoose";
import { IBankDoc, ICardDoc } from "../utils/types.util";
import Card from "../models/Card.model";
import Bank from "../models/Bank.model";
import { FindByAccountNoAndCodeDTO } from "../dtos/bank.dto";

class BankRepository {

    constructor() { }

    /**
     * @name findByAccountNo
     * @param number 
     * @param businessId 
     * @param populate 
     * @returns 
     */
    public async findByAccountNo(number: string, businessId: any, populate: boolean = false): Promise<IBankDoc | null> {

        const dataPop = [
            {
                path: 'business', populate: [
                    { path: 'user' },
                    { path: 'wallet' },
                    { path: 'settings' },
                    {
                        path: 'accounts', populate: [
                            { path: 'provider' }
                        ]
                    },
                    { path: 'banks' },
                ]
            },
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IBankDoc> = { accountNo: number, business: businessId };

        // find card
        const card = await Bank.findOne(query).populate(pop);

        return card;

    }

    /**
     * @name findByAccountNoAndCode
     * @param number 
     * @param code 
     * @param businessId 
     * @param populate 
     * @returns 
     */
    public async findByAccountNoAndCode(data: FindByAccountNoAndCodeDTO): Promise<IBankDoc | null> {

        const { businessId, bankCode, accountNo, populate } = data;

        const dataPop = [
            {
                path: 'business', populate: [
                    { path: 'user' },
                    { path: 'wallet' },
                    { path: 'settings' },
                    {
                        path: 'accounts', populate: [
                            { path: 'provider' }
                        ]
                    },
                    { path: 'banks' },
                ]
            },
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IBankDoc> = { $and: [
            { accountNo: accountNo },
            { business: businessId },
            { $or: [
                { code: bankCode },
                { platformCode: bankCode }
            ]}
        ]};

        // find card
        const card = await Bank.findOne(query).populate(pop);

        return card;

    }

}

export default new BankRepository