import { FilterQuery, PipelineStage } from "mongoose";
import { IProductDoc, IUserDoc } from "../utils/types.util";
import { TransactionFeatureType, TransactionStatus, UserType } from "../utils/enums.util";
import { dateToday, leadingNum } from "@btffamily/vacepay";
import Transaction from "../models/Transaction.model";
import Product from "../models/Product.model";

interface IAmountCount {
    totalAmount: number,
    amount?: number,
    count: number
}

class ProductRepository {

    constructor() { }

    /**
     * @name aggregateTotal
     * @param user 
     * @returns 
     */
    public async aggregateTotal(user: IUserDoc): Promise<IAmountCount> {

        let result: IAmountCount = { totalAmount: 0, count: 0 };

        if (user.userType === UserType.SUPER || user.userType === UserType.ADMIN) {

            const gpl: PipelineStage = {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$inflow.value" },
                    count: { $sum: 1 }
                }
            }

            const aggregated = await Product.aggregate([gpl]);

            result = {
                totalAmount: aggregated[0] ? aggregated[0].totalAmount : 0,
                count: aggregated[0] ? aggregated[0].count : 0
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
                    totalAmount: { $sum: "$inflow.value" },
                    count: { $sum: 1 }
                }
            }

            const aggregated = await Product.aggregate([mpl, gpl]);

            result = {
                totalAmount: aggregated[0] ? aggregated[0].totalAmount : 0,
                count: aggregated[0] ? aggregated[0].count : 0
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
                    createdAt: { $gte: new Date(start), $lt: new Date(end) }
                }
            }

            const gpl: PipelineStage = {
                $group: {
                    _id: null,
                    amount: { $sum: "$inflow.value" },
                    count: { $sum: 1 },
                    data: {
                        $push: {
                            createdAt: "$createdAt",
                            inflow: "$inflow"
                        }
                    }
                }
            }

            const aggregated = await Product.aggregate([mpl, gpl]);

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
                        { createdAt: { $gte: new Date(start), $lt: new Date(end) } },
                    ]
                }
            }

            const gpl: PipelineStage = {
                $group: {
                    _id: null,
                    amount: { $sum: "$inflow.value" },
                    count: { $sum: 1 },
                    data: {
                        $push: {
                            createdAt: "$createdAt",
                            inflow: "$inflow"
                        }
                    }
                }
            }

            const aggregated = await Product.aggregate([mpl, gpl]);

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
     * @name aggregateProductInflow
     * @param payment 
     * @param dates 
     * @returns 
     */
    public async aggregateProductInflow(product: IProductDoc, dates?: { from: string, to: string }): Promise<IAmountCount> {

        let result: IAmountCount = { totalAmount: 0, count: 0, amount: 0 };
        let start: string = '', end: string = '';

        if (dates) {
            const cvf = dateToday(dates.from);
            const cvt = dateToday(dates.to)

            start = `${cvf.year}-${leadingNum(cvf.month)}-${leadingNum(cvf.date)}`;
            end = `${cvt.year}-${leadingNum(cvt.month)}-${leadingNum(cvt.date + 1)}`;

        } else {
            const today = dateToday(Date.now());
            start = `${today.year}-${leadingNum(today.month)}-${leadingNum(today.date - 1)}`;
            end = `${today.year}-${leadingNum(today.month)}-${leadingNum(today.date + 1)}`;
        }

        const mpl: PipelineStage = {
            $match: {
                $and: [
                    { product: product._id },
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
                vat: { $sum: "$vat" },
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

export default new ProductRepository()