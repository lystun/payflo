import { FilterQuery, PipelineStage } from "mongoose";
import { IPaymentLinkDoc, IUserDoc, IWalletDoc } from "../utils/types.util";
import PaymentLink from "../models/PaymentLink.model";
import { TransactionFeatureType, TransactionStatus, UserType } from "../utils/enums.util";
import { dateToday, formatISO, leadingNum } from "@btffamily/vacepay";
import Transaction from "../models/Transaction.model";

interface IAmountCount {
    totalAmount: number,
    amount?: number,
    count: number
}

class PaymentLinkRepository {

    constructor() { }

    /**
     * @name findById
     * @param id 
     * @param populate 
     * @returns 
     */
    public async findById(id: any, populate: boolean = false): Promise<IPaymentLinkDoc | null> {

        const dataPop = [
            { path: 'business', select: '_id email officialEmail name' },
            { path: 'transactions', select: '_id amount reference createdAt updatedAt' },
            { path: 'product' },
            { path: 'invoice' },
            { path: 'subaccounts' }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IPaymentLinkDoc> = { _id: id };

        // find wallet
        const wallet = await PaymentLink.findOne(query).populate(pop);

        return wallet;

    }

    /**
     * @name aggregateTotal
     * @param user 
     * @returns 
     */
    public async aggregateTotal(user: IUserDoc): Promise<{ totalAmount: number, count: number }> {

        let result: { totalAmount: number, count: number } = { totalAmount: 0, count: 0 };

        if (user.userType === UserType.SUPER || user.userType === UserType.ADMIN) {

            const gpl: PipelineStage = {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$totalAmount" },
                    count: { $sum: 1 }
                }
            }

            const aggregated = await PaymentLink.aggregate([gpl]);

            if(aggregated[0]){
                result = {
                    totalAmount: aggregated[0] ? aggregated[0].totalAmount : 0,
                    count: aggregated[0].count
                }
            }

        } else if (user.userType === UserType.BUSINESS) {

            const mpl: PipelineStage = {
                $match: {
                    $and: [
                        { business: user._id }
                    ]
                }
            }

            const gpl: PipelineStage = {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$totalAmount" },
                    count: { $sum: 1 }
                }
            }

            const aggregated = await PaymentLink.aggregate([mpl, gpl]);

            if (aggregated[0]) {
                result = {
                    totalAmount: aggregated[0] ? aggregated[0].totalAmount : 0,
                    count: aggregated[0].count
                }
            }

        }

        return result;

    }

    /**
     * @name aggregateDailyInflow
     * @param user 
     * @param dates 
     * @returns 
     */
    public async aggregateDailyInflow(user: IUserDoc, dates?: { from: string, to: string }): Promise<IAmountCount> {

        let result: IAmountCount = { totalAmount: 0, count: 0 };
        let start: string = '', end: string = '';

        if (dates) {
            const cvf = dateToday(dates.from);
            const cvt = dateToday(dates.to)

            start = `${cvf.year}-${leadingNum(cvf.month)}-${leadingNum(cvf.date)}`;
            end = `${cvt.year}-${leadingNum(cvt.month)}-${leadingNum(cvt.date + 1)}`;

        } else {
            const today = dateToday(Date.now());
            start = `${today.year}-${leadingNum(today.month)}-${leadingNum(today.date)}`;
            end = `${today.year}-${leadingNum(today.month)}-${leadingNum(today.date + 1)}`;
        }

        if (user.userType === UserType.SUPER || user.userType === UserType.ADMIN) {

            const mpl: PipelineStage = {
                $match: {
                    status: TransactionStatus.SUCCESSFUL,
                    feature: TransactionFeatureType.PAYMENT_LINK,
                    createdAt: { $gte: new Date(start), $lt: new Date(end) }
                }
            }

            const gpl: PipelineStage = {
                $group: {
                    _id: null,
                    amount: { $sum: "$amount" },
                    fee: { $sum: "$fee" },
                    vat: { $sum: "$vatFee" },
                    revenue: { $sum: "$revenue.amount" },
                    count: { $sum: 1 },
                    data: {
                        $push: {
                            createdAt: "$createdAt",
                            totalAmount: "$amount"
                        }
                    }
                }
            }

            const aggregated = await Transaction.aggregate([mpl, gpl]);

            if (aggregated[0]) {

                result = {
                    totalAmount: aggregated[0].amount,
                    count: aggregated[0].count
                }

            }


        } else if (user.userType === UserType.BUSINESS) {

            const mpl: PipelineStage = {
                $match: {
                    $and: [
                        { business: user._id },
                        { status: TransactionStatus.SUCCESSFUL },
                        { feature: TransactionFeatureType.PAYMENT_LINK },
                        { createdAt: { $gte: new Date(start), $lt: new Date(end) } },
                    ]
                }
            }

            const gpl: PipelineStage = {
                $group: {
                    _id: null,
                    amount: { $sum: "$amount" },
                    fee: { $sum: "$fee" },
                    vat: { $sum: "$vatFee" },
                    revenue: { $sum: "$revenue.amount" },
                    count: { $sum: 1 },
                    data: {
                        $push: {
                            createdAt: "$createdAt",
                            totalAmount: "$amount"
                        }
                    }
                }
            }

            const aggregated = await Transaction.aggregate([mpl, gpl]);

            if (aggregated[0]) {

                result = {
                    totalAmount: aggregated[0].amount,
                    count: aggregated[0].count
                }

            }

        }

        return result;

    }

    /**
     * @name aggregatePaymentInflowByDate
     * @param payment 
     * @param dates 
     * @returns 
     */
    public async aggregatePaymentInflowByDate(payment: IPaymentLinkDoc, dates?: { from: string, to: string }): Promise<IAmountCount> {

        let result: IAmountCount = { totalAmount: 0, count: 0, amount: 0 };
        let start: string = '', end: string = '';

        if (dates) {
            const cvf = dateToday(dates.from);
            const cvt = dateToday(dates.to)

            start = `${cvf.year}-${leadingNum(cvf.month)}-${leadingNum(cvf.date)}`;
            end = `${cvt.year}-${leadingNum(cvt.month)}-${leadingNum(cvt.date + 1)}`;

        } else {
            const today = dateToday(Date.now());
            start = `${today.year}-${leadingNum(today.month)}-${leadingNum(today.date)}`;
            end = `${today.year}-${leadingNum(today.month)}-${leadingNum(today.date + 1)}`;
        }

        const mpl: PipelineStage = {
            $match: {
                $and: [
                    { payment: payment._id },
                    { feature: TransactionFeatureType.PAYMENT_LINK },
                    { status: TransactionStatus.SUCCESSFUL },
                    { createdAt: { $gte: new Date(start), $lt: new Date(end) } },
                ]
            }
        }

        const gpl: PipelineStage = {
            $group: {
                _id: null,
                amount: { $sum: "$amount" },
                count: { $sum: 1 },
                fee: { $sum: "$fee" },
                vat: { $sum: "$vatFee" },
                revenue: { $sum: "$revenue.amount" },
                data: {
                    $push: {
                        createdAt: "$createdAt",
                        amount: "$amount",
                        fee: "$fee",
                        reference: "$reference"
                    }
                }
            }
        }

        const aggregated = await Transaction.aggregate([mpl, gpl]);

        if (aggregated[0]) {

            result = {
                totalAmount: aggregated[0].amount,
                amount: aggregated[0].amount - aggregated[0].fee,
                count: aggregated[0].count
            }

        }

        return result;

    }

    /**
     * @name aggregatePaymentLinkInflow
     * @param payment 
     * @param dates 
     * @returns 
     */
    public async aggregatePaymentLinkInflow(payment: IPaymentLinkDoc): Promise<IAmountCount> {

        let result: IAmountCount = { totalAmount: 0, count: 0, amount: 0 };

        const mpl: PipelineStage = {
            $match: {
                $and: [
                    { payment: payment._id },
                    { feature: TransactionFeatureType.PAYMENT_LINK },
                    { status: TransactionStatus.SUCCESSFUL }
                ]
            }
        }

        const gpl: PipelineStage = {
            $group: {
                _id: null,
                amount: { $sum: "$amount" },
                count: { $sum: 1 },
                fee: { $sum: "$fee" },
                vat: { $sum: "$vatFee" },
                revenue: { $sum: "$revenue.amount" },
                data: {
                    $push: {
                        createdAt: "$createdAt",
                        amount: "$amount",
                        fee: "$fee",
                        reference: "$reference"
                    }
                }
            }
        }

        const aggregated = await Transaction.aggregate([mpl, gpl]);

        if (aggregated[0]) {

            result = {
                totalAmount: aggregated[0].amount,
                amount: aggregated[0].amount - aggregated[0].fee,
                count: aggregated[0].count
            }

        }

        return result;

    }

}

export default new PaymentLinkRepository()