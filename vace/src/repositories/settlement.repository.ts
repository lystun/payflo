import { ObjectId, FilterQuery, PipelineStage } from "mongoose";
import { IAmountCount, IBusinessDoc, ISettlementDoc } from "../utils/types.util";
import Settlement from "../models/Settlement.model";
import Transaction from "../models/Transaction.model";
import { dateToday, formatISO } from "@btffamily/vacepay";
import { TransactionFeatureType } from "../utils/enums.util";

class SettlementRepository {

    constructor() { }

    /**
      * @name findById
      * @param id 
      * @param populate 
      * @returns 
      */
    public async findById(id: any, populate: boolean = false): Promise<ISettlementDoc | null> {

        const dataPop = [
            {
                path: 'transactions', populate: [
                    { path: 'provider' },
                    {
                        path: 'payment', populate: [
                            { path: 'subaccounts' }
                        ]
                    }
                ]
            },
            {
                path: 'businesses', populate: [
                    { path: 'settings' },
                    { path: 'wallet' },
                    { path: 'user' },
                    {
                        path: 'accounts', populate: [
                            { path: 'provider' }
                        ]
                    },
                ]
            }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<ISettlementDoc> = { _id: id };

        // find player
        const settlement = await Settlement.findOne(query).populate(pop);

        return settlement;

    }

    /**
     * @name findByIdAndFetchTransactions
     * @param id 
     * @returns 
     */
    public async findByIdAndFetchTransactions(id: any): Promise<ISettlementDoc | null> {

        const dataPop = [
            {
                path: 'transactions', populate: [
                    { path: 'provider' },
                    {
                        path: 'payment', populate: [
                            { path: 'subaccounts' }
                        ]
                    },
                    { path: "business" }
                ]
            }
        ]

        // define filter query
        const query: FilterQuery<ISettlementDoc> = { _id: id };

        // find player
        const settlement = await Settlement.findOne(query).populate(dataPop);

        return settlement;

    }

    /**
     * @name findByCode
     * @param code 
     * @param populate 
     * @returns 
     */
    public async findByCode(code: string, populate: boolean = false): Promise<ISettlementDoc | null> {

        const dataPop = [
            {
                path: 'transactions', populate: [
                    { path: 'provider' },
                    {
                        path: 'payment', populate: [
                            { path: 'subaccounts' }
                        ]
                    }
                ]
            },
            {
                path: 'businesses', populate: [
                    { path: 'settings' },
                    { path: 'wallet' },
                    { path: 'user' },
                    {
                        path: 'accounts', populate: [
                            { path: 'provider' }
                        ]
                    },
                ]
            }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<ISettlementDoc> = { code: code };

        // find player
        const settlement = await Settlement.findOne(query).populate(pop);

        return settlement;

    }

    /**
     * @name findByDate
     * @param date 
     * @param populate 
     * @returns 
     */
    public async findByDate(date: string, populate: boolean = false): Promise<ISettlementDoc | null> {

        const today = dateToday(date);
        const formatted = formatISO(today.ISO)

        const dataPop = [
            {
                path: 'transactions', populate: [
                    { path: 'provider' },
                    {
                        path: 'payment', populate: [
                            { path: 'subaccounts' }
                        ]
                    }
                ]
            },
            {
                path: 'businesses', populate: [
                    { path: 'settings' },
                    { path: 'wallet' },
                    { path: 'user' },
                    {
                        path: 'accounts', populate: [
                            { path: 'provider' }
                        ]
                    },
                ]
            }
        ]

        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<ISettlementDoc> = { "created.date": formatted.date };

        // find player
        const settlement = await Settlement.findOne(query).populate(pop);

        return settlement;

    }

    /**
     * @name aggregateTransactionMetrics
     * @param settlement 
     * @returns 
     */
    public async aggregateTransactionMetrics(settlement: ISettlementDoc): Promise<IAmountCount> {

        let result: IAmountCount = {
            amount: 0, count: 0, providerFee: 0, revenue: 0, totalAmount: 0, vat: 0, fee: 0
        }

        const mpl: PipelineStage = {
            $match: {
                $and: [
                    { settlement: settlement._id },
                    { feature: TransactionFeatureType.PAYMENT_LINK }
                ]
            },

        }

        const gpl: PipelineStage = {
            $group: {
                _id: null,
                count: { $sum: 1 },
                amount: { $sum: "$amount" },
                fee: { $sum: "$fee" },
                vat: { $sum: "$vatFee" },
                revenue: { $sum: "$revenue.amount" }
            }
        }

        const aggregated = await Transaction.aggregate([mpl, gpl]);

        if (aggregated[0]) {

            result.totalAmount = aggregated[0].amount;
            result.fee = aggregated[0].fee;
            result.vat = aggregated[0].vat;
            result.revenue = aggregated[0].revenue;
            result.amount = result.totalAmount - (result.fee! + result.vat)
            result.providerFee = result.fee! - result.revenue;
            result.count = aggregated[0].count

        }

        return result;

    }

}

export default new SettlementRepository