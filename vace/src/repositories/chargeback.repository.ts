import { FilterQuery, PipelineStage } from "mongoose";
import { IChargebackDoc, IUserDoc } from "../utils/types.util";
import { UserType } from "../utils/enums.util";
import { dateFromWeekNumber, dateToday, leadingNum, monthsOfYear, weekEndDate, weekStartDate } from "@btffamily/vacepay";
import dayjs from 'dayjs';
import customparse from 'dayjs/plugin/customParseFormat';
import customWeek from 'dayjs/plugin/weekOfYear';
import Chargeback from "../models/Chargeback.model";

dayjs.extend(customparse)
dayjs.extend(customWeek)

class ChargebackRepository {

    constructor() { }

    /**
     * @name findById
     * @param id 
     * @param populate 
     * @returns 
     */
    public async findById(id: any, populate: boolean = false): Promise<IChargebackDoc | null> {

        const dataPop = [
            {
                path: 'business', populate: [
                    { path: 'user' },
                    { path: 'wallet' },
                    {
                        path: 'accounts', populate: [
                            { path: 'provider' }
                        ]
                    },
                    { path: 'banks.details' },
                ]
            },
            { path: 'provider' },
            { path: 'transaction' }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IChargebackDoc> = { _id: id };

        // find player
        const chargeback = await Chargeback.findOne(query).populate(pop);

        return chargeback;

    }

    /**
     * @name aggregateTotal
     * @param user 
     * @returns 
     */
    public async aggregateTotal(user: IUserDoc): Promise<{ amount: number, total: number }> {

        let result: { amount: number, total: number } = { amount: 0, total: 0 }

        if (user.userType === UserType.SUPER || user.userType === UserType.ADMIN) {

            const gpl: PipelineStage = {
                $group: {
                    _id: null,
                    amount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }

            const aggregated = await Chargeback.aggregate([gpl]);

            if (aggregated[0]) {

                result = {
                    amount: aggregated[0].amount,
                    total: aggregated[0].count
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
                    amount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }

            const aggregated = await Chargeback.aggregate([mpl, gpl]);

            if (aggregated[0]) {

                result = {
                    amount: aggregated[0].amount,
                    total: aggregated[0].count
                }

            }

        }

        return result;

    }

    /**
     * @name aggregateLatestData
     * @param user 
     * @returns 
     */
    public async aggregateLatestData(user: IUserDoc): Promise<any> {

        let result: Array<any> =[], aggregated: Array<any> = [];

        const _now = new Date();
        const _l8 = dayjs(_now).subtract(8, 'week');

        const convNow = dateToday(_now);
        const convThen = dateToday(_l8);

        const start = `${convThen.year}-${leadingNum(convThen.month)}-${leadingNum(convThen.date)}`;
        const end = `${convNow.year}-${leadingNum(convNow.month)}-${leadingNum(convNow.date + 1)}`;

        if (user.userType === UserType.SUPER || user.userType === UserType.ADMIN) {

            const mpl: PipelineStage = {
                $match: {
                    createdAt: { $gte: new Date(start), $lt: new Date(end) }
                }
            }

            const gpl: PipelineStage = {
                $group: {
                    _id: {
                        week: { $week: '$createdAt' },
                    },
                    count: { $sum: 1 },
                    total: { $sum: '$amount' },
                    data: {
                        $push: {
                            _id: "$_id",
                            id: "$id",
                            timeline: "$timeline",
                            reference: "$reference",
                            providerRef: "$providerRef",
                            amount: "$amount",
                            code: "$code",
                            business: "$business",
                            status: "$status",
                            level: "$level"
                        }
                    }
                }
            }

            aggregated = await Chargeback.aggregate([mpl, gpl]);


        } else if (user.userType === UserType.BUSINESS) {

            const mpl: PipelineStage = {
                $match: {
                    business: user._id,
                    createdAt: { $gte: new Date(start), $lt: new Date(end) }
                }
            }

            const gpl: PipelineStage = {
                $group: {
                    _id: {
                        week: { $week: '$createdAt' },
                    },
                    count: { $sum: 1 },
                    total: { $sum: '$amount' },
                    data: {
                        $push: {
                            _id: "$_id",
                            id: "$id",
                            timeline: "$timeline",
                            reference: "$reference",
                            providerRef: "$providerRef",
                            amount: "$amount",
                            code: "$code",
                            business: "$business",
                            status: "$status",
                            level: "$level"
                        }
                    }
                }
            }

            aggregated = await Chargeback.aggregate([mpl, gpl]);

        }

        // process aggregated data
        for(let i = 0; i < aggregated.length; i++){

            let item = aggregated[i];
            let weekNum = parseInt(item._id.week.toString()) + 1;

            let dateFromNum = dateFromWeekNumber(weekNum);
            let weekStart = weekStartDate(dateFromNum.ISO);
            let weekEnd = weekEndDate(dateFromNum.ISO);

            result.push({
                name: `${leadingNum(weekStart.month)}/${leadingNum(weekStart.date)}`,
                date: dateFromNum.ISO,
                start: weekStart.ISO,
                end: weekEnd.ISO,
                total: item.total,
                count: item.count
            });

        }

        return result;

    }

    /**
     * @name aggregateTotal
     * @param user 
     * @returns 
     */
    public async aggregateTotalPending(user: IUserDoc): Promise<{ amount: number, total: number, data: Array<any> }> {

        let result: { amount: number, total: number, data: Array<any> } = { amount: 0, total: 0, data: [] }

        if (user.userType === UserType.SUPER || user.userType === UserType.ADMIN) {

            const mpl: PipelineStage = {
                $match: {
                    $or: [
                        { status: 'pending' },
                        { status: 'accepted' }
                    ]
                }
            }

            const gpl: PipelineStage = {
                $group: {
                    _id: null,
                    amount: { $sum: "$amount" },
                    count: { $sum: 1 },
                    data: {
                        $push: {
                            _id: "$_id",
                            amount: "$amount",
                            status: "$status",
                            level: "$level"
                        }
                    }
                }
            }

            const aggregated = await Chargeback.aggregate([mpl, gpl]);

            if (aggregated[0]) {

                result = {
                    amount: aggregated[0].amount,
                    total: aggregated[0].count,
                    data: aggregated[0].data
                }

            }


        } else if (user.userType === UserType.BUSINESS) {

            const mpl: PipelineStage = {
                $match: {
                    $and: [
                        { business: user._id },
                        {
                            $or: [
                                { status: 'pending' },
                                { status: 'accepted' }
                            ]
                        }
                    ]
                }
            }

            const gpl: PipelineStage = {
                $group: {
                    _id: null,
                    amount: { $sum: "$amount" },
                    count: { $sum: 1 },
                    data: {
                        $push: {
                            _id: "$_id",
                            amount: "$amount",
                            status: "$status",
                            level: "$level"
                        }
                    }
                }
            }

            const aggregated = await Chargeback.aggregate([mpl, gpl]);

            if (aggregated[0]) {

                result = {
                    amount: aggregated[0].amount,
                    total: aggregated[0].count,
                    data: aggregated[0].data
                }

            }

        }

        return result;

    }


}

export default new ChargebackRepository