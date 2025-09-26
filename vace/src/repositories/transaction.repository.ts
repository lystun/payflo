import { FilterQuery, PipelineStage } from "mongoose";
import { IAmountCount, IBusinessDoc, ISettlementDoc, ITransactionDoc, IUserDoc } from "../utils/types.util";
import Transaction from "../models/Transaction.model";
import { AggSettlementAnalyticsDTO, AggregateAnalyticsByProviderDTO, AggregateFilterAnalyticsDTO, AggregateGraphDataDTO, AggregateTotalBySBSDTO, AggregateTotalDTO } from "../dtos/transaction.dto";
import { SettlementStatus, TransactionFeatureType, TransactionStatus, UserType } from "../utils/enums.util";
import { dateToday, leadingNum, monthsOfYear } from "@btffamily/vacepay";
import BusinessRepository from "./business.repository";
import Card from "../models/Card.model";
import TransactionMapper from "../mappers/transaction.mapper";

interface IFilterAnalytics {
    successful?: IAmountCount,
    pending?: IAmountCount,
    refunded?: IAmountCount
    revenue?: IAmountCount
    expenses?: IAmountCount
    inflow?: IAmountCount
}

interface ISplitFee {
    fee: number,
    vat: number,
    stamp: number,
    amount: number,
    feeAmount: number,
    revenue: number
}

class TransactionRepository {

    constructor() { }

    /**
     * @name findById
     * @param id 
     * @param populate 
     * @returns 
     */
    public async findById(id: any, populate: boolean = false): Promise<ITransactionDoc | null> {

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
            {
                path: 'payment', populate: [
                    { path: 'product' },
                    { path: 'invoice' },
                    { path: 'subaccounts' }
                ]
            },
            { path: 'wallet' },
            { path: 'provider' },
            { path: 'linkedTransaction' },
            { path: 'provider' },
            { path: 'chargeback' },
            { path: 'refund' },
            { path: 'refunds' },
            { path: 'product' },
            { path: 'invoice' },
            { path: 'subaccount' },
            { path: 'settlement' }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<ITransactionDoc> = { _id: id };

        // find transaction
        const transaction = await Transaction.findOne(query).populate(pop);

        return transaction;

    }

    /**
     * @name findByReference
     * @param param 
     * @param populate 
     * @returns 
     */
    public async findByReference(reference: string, populate: boolean = false): Promise<ITransactionDoc | null> {

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
            {
                path: 'payment', populate: [
                    { path: 'product' },
                    { path: 'invoice' },
                    { path: 'subaccounts' }
                ]
            },
            { path: 'wallet' },
            { path: 'provider' },
            { path: 'linkedTransaction' },
            { path: 'chargeback' },
            { path: 'refund' },
            { path: 'refunds' },
            { path: 'product' },
            { path: 'invoice' },
            { path: 'subaccount' },
            { path: 'settlement' }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<ITransactionDoc> = { $or: [{ reference: reference }, { merchantRef: reference }, { providerRef: reference }] };

        // find transaction
        const transaction = await Transaction.findOne(query).populate(pop);

        return transaction;

    }

    /**
     * @name findByReferenceAndSelectCard
     * @param reference 
     * @param populate 
     * @returns 
     */
    public async findByReferenceAndSelectCard(reference: string, populate: boolean = false): Promise<ITransactionDoc | null> {

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
            {
                path: 'payment', populate: [
                    { path: 'product' },
                    { path: 'invoice' },
                    { path: 'subaccounts' }
                ]
            },
            { path: 'wallet' },
            { path: 'provider' },
            { path: 'linkedTransaction' },
            { path: 'provider' },
            { path: 'chargeback' },
            { path: 'refund' },
            { path: 'refunds' },
            { path: 'product' },
            { path: 'invoice' },
            { path: 'subaccount' },
            { path: 'settlement' }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<ITransactionDoc> = { $or: [{ reference: reference }, { merchantRef: reference }, { providerRef: reference }] };

        // find transaction
        let transaction = await Transaction.findOne(query).populate(pop);

        if (transaction) {

            const card = await Card.findOne({ _id: transaction.card }).select('+authCode +cardData');

            if (card) {
                transaction.card = card;
            }

        }

        return transaction;

    }

    /**
     * @name findByIdAndSelectRevenue
     * @param id 
     * @param populate 
     * @returns 
     */
    public async findByIdAndSelectRevenue(id: any, populate: boolean = false): Promise<ITransactionDoc | null> {

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
            {
                path: 'payment', populate: [
                    { path: 'product' },
                    { path: 'invoice' },
                    { path: 'subaccounts' }
                ]
            },
            { path: 'card', select: '+authCode +cardData' },
            { path: 'wallet' },
            { path: 'provider' },
            { path: 'linkedTransaction' },
            { path: 'provider' },
            { path: 'chargeback' },
            { path: 'refund' },
            { path: 'refunds' },
            { path: 'product' },
            { path: 'invoice' },
            { path: 'subaccount' },
            { path: 'settlement' }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<ITransactionDoc> = { _id: id };

        // find transaction
        const transaction = await Transaction.findOne(query).select("+revenue +revenue.amount +revenue.unitAmount +revenue.reversed +revenue.unitReversed").populate(pop);

        return transaction;

    }

    /**
     * @name findByReferenceAndSelectRevenue
     * @param reference 
     * @param populate 
     * @returns 
     */
    public async findByReferenceAndSelectRevenue(reference: string, populate: boolean = false): Promise<ITransactionDoc | null> {

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
            {
                path: 'payment', populate: [
                    { path: 'product' },
                    { path: 'invoice' },
                    { path: 'subaccounts' }
                ]
            },
            { path: 'card', select: '+authCode +cardData' },
            { path: 'wallet' },
            { path: 'provider' },
            { path: 'linkedTransaction' },
            { path: 'provider' },
            { path: 'chargeback' },
            { path: 'refund' },
            { path: 'refunds' },
            { path: 'product' },
            { path: 'invoice' },
            { path: 'subaccount' },
            { path: 'settlement' }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<ITransactionDoc> = { $or: [{ reference: reference }, { merchantRef: reference }, { providerRef: reference }] };

        // find transaction
        const transaction = await Transaction.findOne(query).select("+revenue +revenue.amount +revenue.unitAmount +revenue.reversed +revenue.unitReversed").populate(pop);

        return transaction;

    }

    /**
     * @name findByReferenceAndStatus
     * @param ref 
     * @param status 
     * @param populate 
     * @returns 
     */
    public async findByReferenceAndStatus(ref: string, status: string, populate: boolean = false): Promise<ITransactionDoc | null> {

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
            {
                path: 'payment', populate: [
                    { path: 'product' },
                    { path: 'invoice' },
                    { path: 'subaccounts' }
                ]
            },
            { path: 'wallet' },
            { path: 'provider' },
            { path: 'linkedTransaction' },
            { path: 'provider' },
            { path: 'chargeback' },
            { path: 'refund' },
            { path: 'refunds' },
            { path: 'product' },
            { path: 'invoice' },
            { path: 'subaccount' },
            { path: 'settlement' }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<ITransactionDoc> = { reference: ref, status: status };

        // find transaction
        const transaction = await Transaction.findOne(query).populate(pop);

        return transaction;

    }

    /**
     * @name findByFeatureOrType
     * @param param 
     * @param populate 
     * @returns 
     */
    public async findByFeatureOrType(param: string, populate: boolean = false): Promise<ITransactionDoc | null> {

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
            {
                path: 'payment', populate: [
                    { path: 'product' },
                    { path: 'invoice' },
                    { path: 'subaccounts' }
                ]
            },
            { path: 'wallet' },
            { path: 'provider' },
            { path: 'linkedTransaction' },
            { path: 'provider' },
            { path: 'chargeback' },
            { path: 'refund' },
            { path: 'refunds' },
            { path: 'product' },
            { path: 'invoice' },
            { path: 'subaccount' },
            { path: 'settlement' }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<ITransactionDoc> = { $or: [{ feature: param }, { type: param }] };

        // find transaction
        const transaction = await Transaction.findOne(query).populate(pop);

        return transaction;

    }

    /**
     * @name findByReferenceAndFeature
     * @param data 
     * @param populate 
     * @returns 
     */
    public async findByReferenceAndFeature(data: { reference: string, feature: string }, populate: boolean = false): Promise<ITransactionDoc | null> {

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
            {
                path: 'payment', populate: [
                    { path: 'product' },
                    { path: 'invoice' },
                    { path: 'subaccounts' }
                ]
            },
            { path: 'wallet' },
            { path: 'provider' },
            { path: 'linkedTransaction' },
            { path: 'provider' },
            { path: 'chargeback' },
            { path: 'refund' },
            { path: 'refunds' },
            { path: 'product' },
            { path: 'invoice' },
            { path: 'subaccount' },
            { path: 'settlement' }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<ITransactionDoc> = { $and: [{ feature: data.feature }, { reference: data.reference }] };

        // find transaction
        const transaction = await Transaction.findOne(query).populate(pop);

        return transaction;

    }

    /**
     * @name settlementTotalByBusiness
     * @param businessId 
     * @param settlementId 
     * @returns 
     */
    public async settlementTransactionsByBusiness(businessId: any, settlementId: any): Promise<Array<ITransactionDoc>> {

        // define filter query
        const query: FilterQuery<ITransactionDoc> = { $and: [{ business: businessId }, { settlement: settlementId }] };

        // find transactions
        const transactions = await Transaction.find(query);

        return transactions;

    }

    private async splitFees(data: any): Promise<ISplitFee> {

        let fee = data.fee ? parseFloat(data.fee) : 0;
        let vat = data.vat ? parseFloat(data.vat) : 0;
        let stamp = data.stamp ? parseFloat(data.stamp) : 0
        let amount = data.amount ? parseFloat(data.amount) : 0
        let revenue = data.revenue ? parseFloat(data.revenue) : 0

        const combinedFee = fee + vat + stamp;
        let feeAmount = amount - combinedFee;

        return { amount, feeAmount, fee, vat, stamp, revenue }

    }

    /**
     * @name aggregateTotal
     * @param data 
     * @returns 
     */
    public async aggregateTotal(data: AggregateTotalDTO): Promise<{ amount: number, feeAmount: number }> {

        let result: { amount: number, feeAmount: number } = { amount: 0, feeAmount: 0 }
        const { user } = data;

        if (user.userType === UserType.SUPER || user.userType === UserType.ADMIN) {

            const gpl: PipelineStage = {
                $group: {
                    _id: null,
                    amount: { $sum: "$amount" },
                    fee: { $sum: "$fee" },
                    vat: { $sum: "$vatFee" },
                    stamp: { $sum: "$stampFee" },
                    revenue: { $sum: "$revenue.amount" }
                }
            }

            const aggregated = await Transaction.aggregate([gpl]);

            if (aggregated[0]) {

                const splitFee = await this.splitFees(aggregated[0]);

                result = {
                    amount: splitFee.amount,
                    feeAmount: splitFee.feeAmount
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
                    fee: { $sum: "$fee" },
                    vat: { $sum: "$vatFee" },
                    stamp: { $sum: "$stampFee" },
                    revenue: { $sum: "$revenue.amount" }
                }
            }

            const aggregated = await Transaction.aggregate([mpl, gpl]);

            if (aggregated[0]) {

                const splitFee = await this.splitFees(aggregated[0]);

                result = {
                    amount: splitFee.amount,
                    feeAmount: splitFee.feeAmount
                }

            }

        }

        return result;

    }

    /**
     * @name aggregateTotal
     * @param data 
     * @returns 
     */
    public async aggregateTotalByStatus(data: AggregateTotalDTO): Promise<{ amount: number, feeAmount: number }> {

        let result: { amount: number, feeAmount: number } = { amount: 0, feeAmount: 0 }
        const { user, status } = data;

        if ((user.userType === UserType.SUPER || user.userType === UserType.ADMIN) && status) {

            const mpl: PipelineStage = {
                $match: {
                    status: status
                }
            }

            const gpl: PipelineStage = {
                $group: {
                    _id: null,
                    amount: { $sum: "$amount" },
                    fee: { $sum: "$fee" },
                    vat: { $sum: "$vatFee" },
                    stamp: { $sum: "$stampFee" },
                    revenue: { $sum: "$revenue.amount" }
                }
            }

            const aggregated = await Transaction.aggregate([mpl, gpl]);

            if (aggregated[0]) {

                const splitFee = await this.splitFees(aggregated[0]);

                result = {
                    amount: splitFee.amount,
                    feeAmount: splitFee.feeAmount
                }

            }


        } else if (user.userType === UserType.BUSINESS && status) {

            const mpl: PipelineStage = {
                $match: {
                    $and: [
                        { business: user._id },
                        { status: status }
                    ]
                }
            }

            const gpl: PipelineStage = {
                $group: {
                    _id: null,
                    amount: { $sum: "$amount" },
                    fee: { $sum: "$fee" },
                    vat: { $sum: "$vatFee" },
                    stamp: { $sum: "$stampFee" },
                    revenue: { $sum: "$revenue.amount" }
                }
            }

            const aggregated = await Transaction.aggregate([mpl, gpl]);

            if (aggregated[0]) {

                const splitFee = await this.splitFees(aggregated[0]);

                result = {
                    amount: splitFee.amount,
                    feeAmount: splitFee.feeAmount
                }

            }

        }

        return result;

    }

    /**
     * @name aggregateSettlementAmount
     * @param data 
     * @returns 
     */
    public async aggregateSettlementAmount(data: AggregateTotalBySBSDTO): Promise<number> {

        const { settlement, business, status } = data;
        let result: IAmountCount = {
            amount: 0, count: 0, providerFee: 0, revenue: 0, totalAmount: 0, vat: 0, fee: 0
        }

        const mpl: PipelineStage = {
            $match: {
                $and: [
                    { settlement: settlement._id },
                    { business: business._id },
                    { feature: TransactionFeatureType.PAYMENT_LINK },
                    { "settle.status": status }
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
                stamp: { $sum: "$stampFee" },
                revenue: { $sum: "$revenue.amount" }
            }
        }

        const aggregated = await Transaction.aggregate([mpl, gpl]);

        if (aggregated[0]) {

            const splitFee = await this.splitFees(aggregated[0]);

            result.totalAmount = splitFee.amount;
            result.fee = splitFee.fee;
            result.vat = splitFee.vat;
            result.revenue = splitFee.revenue;
            result.amount = splitFee.feeAmount;
            result.providerFee = splitFee.fee - splitFee.revenue;
            result.count = aggregated[0].count

        }

        return result.amount;

    }

    /**
     * @name aggregateSettlementAnalytics
     * @param data 
     * @returns 
     */
    public async aggregateSettlementAnalytics(data: AggSettlementAnalyticsDTO): Promise<IAmountCount> {

        let result: IAmountCount = {
            amount: 0, count: 0, providerFee: 0, settlementAmount: 0,
            revenue: 0, totalAmount: 0, vat: 0, fee: 0
        }

        const { settlement, business } = data;

        const mpl: PipelineStage = {
            $match: {
                $and: [
                    { settlement: settlement._id },
                    { business: business._id },
                    { feature: TransactionFeatureType.PAYMENT_LINK },
                    {
                        $or: [
                            { status: TransactionStatus.SUCCESSFUL },
                            { status: TransactionStatus.COMPLETED },
                            { status: TransactionStatus.PAID }
                        ]
                    }
                ]
            },

        }

        const duempl: PipelineStage = {
            $match: {
                $and: [
                    { settlement: settlement._id },
                    { business: business._id },
                    { feature: TransactionFeatureType.PAYMENT_LINK },
                    { "settle.status": SettlementStatus.PENDING },
                    {
                        $or: [
                            { status: TransactionStatus.SUCCESSFUL },
                            { status: TransactionStatus.COMPLETED },
                            { status: TransactionStatus.PAID }
                        ]
                    }
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
                stamp: { $sum: "$stampFee" },
                revenue: { $sum: "$revenue.amount" },
                data: {
                    $push: {
                        amount: "$amount",
                        fee: "$fee",
                        vatFee: "$vatFee",
                        stampFee: "$stampFee",
                        status: "$status",
                        business: "$business",
                        reference: "$reference",
                        createdAt: "$createdAt",
                        updatedAt: "$updatedAt",
                    }
                }
            }
        }

        const aggregated = await Transaction.aggregate([mpl, gpl]);
        const dueGrated = await Transaction.aggregate([duempl, gpl]);

        if (aggregated[0] && dueGrated[0]) {

            const gplFee = await TransactionMapper.mapGPLFee(aggregated);
            const dueGplFee = await TransactionMapper.mapGPLFee(dueGrated);

            result.totalAmount = gplFee.amount;
            result.fee = gplFee.fee;
            result.vat = gplFee.vat;
            result.revenue = gplFee.revenue;
            result.providerFee = result.fee! - result.revenue;
            result.count = gplFee.count;

            // amount due calculation
            const dueVatAndFee = dueGplFee.fee + dueGplFee.vat;
            result.amount = dueGplFee.amount - dueVatAndFee;

        } else if (aggregated[0]) {

            const gplFee = await TransactionMapper.mapGPLFee(aggregated);

            result.totalAmount = gplFee.amount;
            result.fee = gplFee.fee;
            result.vat = gplFee.vat;
            result.revenue = gplFee.revenue;
            result.providerFee = result.fee! - result.revenue;
            result.count = gplFee.count;

            // amount settled calculation
            const vatAndFee = gplFee.fee + gplFee.vat;
            result.amount = result.totalAmount - vatAndFee;

        }

        return result;

    }


    /**
     * @name aggregateDueSettlement
     * @param data 
     * @returns 
     */
    public async aggregateDueSettlement(data: { settlement: ISettlementDoc, businessId: any }): Promise<IAmountCount> {

        let result: IAmountCount = { amount: 0, count: 0, providerFee: 0, revenue: 0, totalAmount: 0, vat: 0 }

        const { settlement, businessId } = data;

        const mpl: PipelineStage = {
            $match: {
                $and: [
                    { settlement: settlement._id },
                    { business: businessId },
                    { feature: TransactionFeatureType.PAYMENT_LINK },
                    { "settle.status": SettlementStatus.PENDING }
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
                stamp: { $sum: "$stampFee" },
                revenue: { $sum: "$revenue.amount" }
            }
        }

        const aggregated = await Transaction.aggregate([mpl, gpl]);

        if (aggregated[0]) {

            const splitFee = await this.splitFees(aggregated[0]);

            result.totalAmount = splitFee.amount;
            result.fee = splitFee.fee;
            result.vat = splitFee.vat;
            result.revenue = splitFee.revenue;
            result.amount = splitFee.feeAmount
            result.providerFee = splitFee.fee - splitFee.revenue;
            result.count = aggregated[0].count

        }

        return result;

    }

    /**
     * @name aggregateDailyTotal
     * @param user 
     * @returns 
     */
    public async aggregateDailyRevenue(user: IUserDoc, dates?: { from: string, to: string }): Promise<IAmountCount> {

        let result: IAmountCount = { totalAmount: 0, amount: 0, count: 0, providerFee: 0, revenue: 0, vat: 0 };
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
                    feature: TransactionFeatureType.PAYMENT_LINK,
                    status: TransactionStatus.SUCCESSFUL,
                    createdAt: { $gte: new Date(start), $lt: new Date(end) }
                }
            }

            const gpl: PipelineStage = {
                $group: {
                    _id: null,
                    amount: { $sum: "$amount" },
                    count: { $sum: 1 },
                    fee: { $sum: "$fee" },
                    vat: { $sum: "$vatFee" },
                    stamp: { $sum: "$stampFee" },
                    revenue: { $sum: "$revenue.amount" },
                    data: {
                        $push: {
                            createdAt: "$createdAt",
                            amount: "$amount",
                            status: "$status",
                            level: "$level"
                        }
                    }
                }
            }

            const aggregated = await Transaction.aggregate([mpl, gpl]);

            if (aggregated[0]) {

                const splitFee = await this.splitFees(aggregated[0]);

                result.amount = splitFee.feeAmount;
                result.totalAmount = splitFee.amount;
                result.revenue = splitFee.revenue;
                result.vat = splitFee.vat;
                result.providerFee = splitFee.fee - splitFee.revenue;
                result.count = aggregated[0].count;

            }


        } else if (user.userType === UserType.BUSINESS) {

            const business = await BusinessRepository.findByUser(user, true);

            if (business) {

                const mpl: PipelineStage = {
                    $match: {
                        $and: [
                            { business: business._id },
                            { feature: TransactionFeatureType.PAYMENT_LINK },
                            { status: TransactionStatus.SUCCESSFUL },
                            { createdAt: { $gte: new Date(start), $lt: new Date(end) } }
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
                        stamp: { $sum: "$stampFee" },
                        revenue: { $sum: "$revenue.amount" },
                        data: {
                            $push: {
                                createdAt: "$createdAt",
                                amount: "$amount",
                                status: "$status",
                                level: "$level"
                            }
                        }
                    }
                }

                const aggregated = await Transaction.aggregate([mpl, gpl]);

                if (aggregated[0]) {

                    const splitFee = await this.splitFees(aggregated[0]);

                    result.amount = splitFee.feeAmount;
                    result.totalAmount = splitFee.amount;
                    result.revenue = splitFee.revenue;
                    result.vat = splitFee.vat;
                    result.providerFee = splitFee.fee - splitFee.revenue;
                    result.count = aggregated[0].count;

                }

            }


        }


        return result;

    }

    /**
     * @name aggregateDailyExpense
     * @param user 
     * @returns 
     */
    public async aggregateDailyExpense(user: IUserDoc, dates?: { from: string, to: string }): Promise<IAmountCount> {

        let result: IAmountCount = { totalAmount: 0, amount: 0, count: 0, providerFee: 0, revenue: 0, vat: 0 };
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
                    createdAt: { $gte: new Date(start), $lt: new Date(end) },
                    $or: [
                        { feature: TransactionFeatureType.WALLET_TRANSFER },
                        { feature: TransactionFeatureType.WALLET_WITHDRAW },
                        { feature: TransactionFeatureType.WALLET_BILL },
                        { feature: TransactionFeatureType.WALLET_AIRTIME },
                        { feature: TransactionFeatureType.WALLET_DATA },
                        { feature: TransactionFeatureType.WALLET_VAS }
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
                    stamp: { $sum: "$stampFee" },
                    revenue: { $sum: "$revenue.amount" },
                    data: {
                        $push: {
                            createdAt: "$createdAt",
                            amount: "$amount",
                            status: "$status",
                            level: "$level"
                        }
                    }
                }
            }

            const aggregated = await Transaction.aggregate([mpl, gpl]);

            if (aggregated[0]) {

                const splitFee = await this.splitFees(aggregated[0]);

                result.amount = splitFee.feeAmount;
                result.totalAmount = splitFee.amount;
                result.revenue = splitFee.revenue;
                result.vat = splitFee.vat;
                result.providerFee = splitFee.fee - splitFee.revenue;
                result.count = aggregated[0].count;

            }


        } else if (user.userType === UserType.BUSINESS) {

            const business = await BusinessRepository.findByUser(user, true);

            if (business) {

                const mpl: PipelineStage = {
                    $match: {
                        $and: [
                            { business: business._id },
                            { status: TransactionStatus.SUCCESSFUL },
                            { createdAt: { $gte: new Date(start), $lt: new Date(end) } },
                            {
                                $or: [
                                    { feature: TransactionFeatureType.WALLET_TRANSFER },
                                    { feature: TransactionFeatureType.WALLET_WITHDRAW },
                                    { feature: TransactionFeatureType.WALLET_BILL },
                                    { feature: TransactionFeatureType.WALLET_AIRTIME },
                                    { feature: TransactionFeatureType.WALLET_DATA },
                                    { feature: TransactionFeatureType.WALLET_VAS }
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
                        fee: { $sum: "$fee" },
                        vat: { $sum: "$vatFee" },
                        stamp: { $sum: "$stampFee" },
                        revenue: { $sum: "$revenue.amount" },
                        data: {
                            $push: {
                                createdAt: "$createdAt",
                                amount: "$amount",
                                status: "$status",
                                level: "$level"
                            }
                        }
                    }
                }

                const aggregated = await Transaction.aggregate([mpl, gpl]);

                if (aggregated[0]) {

                    const splitFee = await this.splitFees(aggregated[0]);

                    result.amount = splitFee.feeAmount;
                    result.totalAmount = splitFee.amount;
                    result.revenue = splitFee.revenue;
                    result.vat = splitFee.vat;
                    result.providerFee = splitFee.fee - splitFee.revenue;
                    result.count = aggregated[0].count;

                }

            }


        }

        return result;

    }

    /**
     * @name aggregateDailyInflow
     * @param user 
     * @returns 
     */
    public async aggregateDailyInflow(user: IUserDoc, dates?: { from: string, to: string }): Promise<IAmountCount> {

        let result: IAmountCount = { totalAmount: 0, amount: 0, count: 0, providerFee: 0, revenue: 0, vat: 0 };
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
                    feature: TransactionFeatureType.BANK_ACCOUNT,
                    createdAt: { $gte: new Date(start), $lt: new Date(end) }
                }
            }

            const gpl: PipelineStage = {
                $group: {
                    _id: null,
                    amount: { $sum: "$amount" },
                    count: { $sum: 1 },
                    fee: { $sum: "$fee" },
                    vat: { $sum: "$vatFee" },
                    stamp: { $sum: "$stampFee" },
                    revenue: { $sum: "$revenue.amount" },
                    data: {
                        $push: {
                            createdAt: "$createdAt",
                            amount: "$amount",
                            status: "$status",
                            level: "$level"
                        }
                    }
                }
            }

            const aggregated = await Transaction.aggregate([mpl, gpl]);

            if (aggregated[0]) {

                const splitFee = await this.splitFees(aggregated[0]);

                result.amount = splitFee.feeAmount;
                result.totalAmount = splitFee.amount;
                result.revenue = splitFee.revenue;
                result.vat = splitFee.vat;
                result.providerFee = splitFee.fee - splitFee.revenue;
                result.count = aggregated[0].count;

            }


        } else if (user.userType === UserType.BUSINESS) {

            const business = await BusinessRepository.findByUser(user, true);

            if (business) {

                const mpl: PipelineStage = {
                    $match: {
                        $and: [
                            { business: business._id },
                            { feature: TransactionFeatureType.BANK_ACCOUNT },
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
                        stamp: { $sum: "$stampFee" },
                        revenue: { $sum: "$revenue.amount" },
                        data: {
                            $push: {
                                createdAt: "$createdAt",
                                amount: "$amount",
                                status: "$status",
                                level: "$level"
                            }
                        }
                    }
                }

                const aggregated = await Transaction.aggregate([mpl, gpl]);

                if (aggregated[0]) {

                    const splitFee = await this.splitFees(aggregated[0]);

                    result.amount = splitFee.feeAmount;
                    result.totalAmount = splitFee.amount;
                    result.revenue = splitFee.revenue;
                    result.vat = splitFee.vat;
                    result.providerFee = splitFee.fee - splitFee.revenue;
                    result.count = aggregated[0].count;

                }

            }


        }

        return result;

    }

    /**
     * @name aggregateIncomeGraph
     * @param data 
     * @returns 
     */
    public async aggregateIncomeGraph(data: AggregateGraphDataDTO): Promise<Array<any>> {

        let monthList = monthsOfYear();
        let result: Array<any> = [];
        let aggregated: Array<any> = [];

        const { user, dates } = data;
        const today = dateToday(Date.now());

        if (user.userType === UserType.SUPER || user.userType === UserType.ADMIN) {


            if (!dates) {

                const mpl: PipelineStage = {
                    $match: {
                        feature: TransactionFeatureType.PAYMENT_LINK,
                        status: TransactionStatus.SUCCESSFUL
                    }
                }

                const gpl: PipelineStage = {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' }
                        },
                        count: { $sum: 1 },
                        total: { $sum: '$amount' },
                        fee: { $sum: '$fee' },
                        vat: { $sum: "$vatFee" },
                        stamp: { $sum: "$stampFee" },
                        revenue: { $sum: "$revenue.amount" },
                        data: {
                            $push: {
                                _id: "$_id",
                                id: "$id",
                                merchantRef: "$merchantRef",
                                reference: "$reference",
                                providerRef: "$providerRef",
                                amount: "$amount",
                                business: "$business",
                                status: "$status",
                                type: "$type"
                            }
                        }
                    }
                }

                aggregated = await Transaction.aggregate([mpl, gpl]);

            }


        } else if (user.userType === UserType.BUSINESS) {

            const business = await BusinessRepository.findByUser(user, true);

            if (business) {

                if (!dates) {

                    const mpl: PipelineStage = {
                        $match: {
                            business: business._id,
                            feature: TransactionFeatureType.PAYMENT_LINK,
                            status: TransactionStatus.SUCCESSFUL
                        }
                    }

                    const gpl: PipelineStage = {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' }
                            },
                            count: { $sum: 1 },
                            total: { $sum: '$amount' },
                            fee: { $sum: '$fee' },
                            vat: { $sum: "$vatFee" },
                            stamp: { $sum: "$stampFee" },
                            revenue: { $sum: "$revenue.amount" },
                            data: {
                                $push: {
                                    _id: "$_id",
                                    id: "$id",
                                    merchantRef: "$merchantRef",
                                    reference: "$reference",
                                    providerRef: "$providerRef",
                                    amount: "$amount",
                                    business: "$business",
                                    status: "$status",
                                    type: "$type"
                                }
                            }
                        }
                    }

                    aggregated = await Transaction.aggregate([mpl, gpl]);

                }

            }


        }

        // process income aggregate to get graph data
        for (let i = 0; i < monthList.length; i++) {

            let month = monthList[i];
            let item = aggregated.find((x) => x._id.month === (month.id + 1))

            if (item) {

                let graph: any = {
                    label: month.name.toLowerCase().slice(0, 3),
                    name: month.name,
                    index: month.id + 1,
                    year: item._id.year,
                    count: item.count,
                    total: item.total,
                    data: item.data
                };

                result.push(graph)

            } else {

                let graph: any = {
                    label: month.name.toLowerCase().slice(0, 3),
                    name: month.name,
                    index: month.id + 1,
                    year: today.year,
                    count: 0,
                    total: 0,
                    data: []
                };

                result.push(graph)

            }

        }

        return result;

    }

    /**
     * @name aggregateTransactionGraph
     * @param data 
     * @returns 
     */
    public async aggregateTransactionGraph(data: AggregateGraphDataDTO): Promise<Array<any>> {

        let monthList = monthsOfYear();
        let result: Array<any> = [];
        let aggregated: Array<any> = [];

        const { user, dates } = data;
        const today = dateToday(Date.now());


        if (user.userType === UserType.SUPER || user.userType === UserType.ADMIN) {


            if (!dates) {

                const mpl: PipelineStage = {
                    $match: {
                        $or: [
                            { status: TransactionStatus.SUCCESSFUL },
                            { status: TransactionStatus.COMPLETED }
                        ]
                    }
                }

                const gpl: PipelineStage = {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' }
                        },
                        count: { $sum: 1 },
                        total: { $sum: '$amount' },
                        fee: { $sum: '$fee' },
                        vat: { $sum: "$vatFee" },
                        stamp: { $sum: "$stampFee" },
                        revenue: { $sum: "$revenue.amount" },
                        data: {
                            $push: {
                                _id: "$_id",
                                id: "$id",
                                merchantRef: "$merchantRef",
                                reference: "$reference",
                                providerRef: "$providerRef",
                                amount: "$amount",
                                business: "$business",
                                status: "$status",
                                type: "$type"
                            }
                        }
                    }
                }

                aggregated = await Transaction.aggregate([mpl, gpl]);

            }


        } else if (user.userType === UserType.BUSINESS) {

            const business = await BusinessRepository.findByUser(user, true);

            if (business) {

                if (!dates) {

                    const mpl: PipelineStage = {
                        $match: {
                            business: business._id,
                            $or: [
                                { status: TransactionStatus.SUCCESSFUL },
                                { status: TransactionStatus.COMPLETED }
                            ]
                        }
                    }

                    const gpl: PipelineStage = {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' }
                            },
                            count: { $sum: 1 },
                            total: { $sum: '$amount' },
                            fee: { $sum: '$fee' },
                            vat: { $sum: "$vatFee" },
                            stamp: { $sum: "$stampFee" },
                            revenue: { $sum: "$revenue.amount" },
                            data: {
                                $push: {
                                    _id: "$_id",
                                    id: "$id",
                                    merchantRef: "$merchantRef",
                                    reference: "$reference",
                                    providerRef: "$providerRef",
                                    amount: "$amount",
                                    business: "$business",
                                    status: "$status",
                                    type: "$type"
                                }
                            }
                        }
                    }

                    aggregated = await Transaction.aggregate([mpl, gpl]);

                }

            }


        }

        // process income aggregate to get graph data
        for (let i = 0; i < monthList.length; i++) {

            let month = monthList[i];
            let item = aggregated.find((x) => x._id.month === (month.id + 1))

            if (item) {

                let graph: any = {
                    label: month.name.toLowerCase().slice(0, 3),
                    name: month.name,
                    index: month.id + 1,
                    year: item._id.year,
                    count: item.count,
                    total: item.total,
                    data: item.data
                };

                result.push(graph)

            } else {

                let graph: any = {
                    label: month.name.toLowerCase().slice(0, 3),
                    name: month.name,
                    index: month.id + 1,
                    year: today.year,
                    count: 0,
                    total: 0,
                    data: []
                };

                result.push(graph)

            }

        }

        return result;

    }

    /**
     * @name aggregateFilterAnalytics
     * @param data 
     * @returns 
     */
    public async aggregateFilterAnalytics(data: AggregateFilterAnalyticsDTO): Promise<IFilterAnalytics> {

        let result: IFilterAnalytics = {};
        const { user, model, dates } = data;

        if (user.userType === UserType.SUPER || user.userType === UserType.ADMIN) {

            // process for transaction model
            if (!model) {

                const mpl: PipelineStage = {
                    $match: {
                        status: TransactionStatus.SUCCESSFUL,
                        createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) }
                    }
                }

                const gpl: PipelineStage = {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        amount: { $sum: "$amount" },
                        fee: { $sum: "$fee" },
                        vat: { $sum: "$vatFee" },
                        stamp: { $sum: "$stampFee" },
                        revenue: { $sum: "$revenue.amount" },
                        data: {
                            $push: {
                                createdAt: "$createdAt",
                                amount: "$amount",
                                status: "$status",
                                level: "$level"
                            }
                        }
                    }
                }

                const pmpl: PipelineStage = {
                    $match: {
                        status: TransactionStatus.PENDING,
                        createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) }
                    }
                }

                const rmpl: PipelineStage = {
                    $match: {
                        status: TransactionStatus.REFUNDED,
                        createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) }
                    }
                }

                const lkmpl: PipelineStage = {
                    $match: {
                        status: TransactionStatus.SUCCESSFUL,
                        feature: TransactionFeatureType.PAYMENT_LINK,
                        createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) }
                    }
                }

                const aggregated = await Transaction.aggregate([mpl, gpl]);
                const _pAgg = await Transaction.aggregate([pmpl, gpl]);
                const _rAgg = await Transaction.aggregate([rmpl, gpl]);
                const revAgg = await Transaction.aggregate([lkmpl, gpl]);
                const revenue = await this.aggregateDailyRevenue(user, { from: dates.today, to: dates.today });
                const expenses = await this.aggregateDailyExpense(user, { from: dates.today, to: dates.today });
                const inflow = await this.aggregateDailyInflow(user, { from: dates.today, to: dates.today });


                if (aggregated[0]) {

                    const splitFee = await this.splitFees(aggregated[0]);

                    result.successful = {
                        amount: splitFee.feeAmount,
                        totalAmount: splitFee.amount,
                        revenue: splitFee.revenue,
                        vat: splitFee.vat,
                        providerFee: splitFee.fee - splitFee.revenue,
                        count: aggregated[0].count,
                    }

                }

                if (_pAgg[0]) {

                    const splitFee = await this.splitFees(_pAgg[0]);

                    result.pending = {
                        amount: splitFee.feeAmount,
                        totalAmount: splitFee.amount,
                        revenue: splitFee.revenue,
                        vat: splitFee.vat,
                        providerFee: splitFee.fee - splitFee.revenue,
                        count: _pAgg[0].count,
                    }

                }

                if (_rAgg[0]) {
                    const splitFee = await this.splitFees(_rAgg[0]);

                    result.refunded = {
                        amount: splitFee.feeAmount,
                        totalAmount: splitFee.amount,
                        revenue: splitFee.revenue,
                        vat: splitFee.vat,
                        providerFee: splitFee.fee - splitFee.revenue,
                        count: _rAgg[0].count,
                    }
                }

                if (revAgg[0]) {
                    const splitFee = await this.splitFees(revAgg[0]);

                    result.revenue = {
                        amount: splitFee.feeAmount,
                        totalAmount: splitFee.amount,
                        revenue: splitFee.revenue,
                        vat: splitFee.vat,
                        providerFee: splitFee.fee - splitFee.revenue,
                        count: revAgg[0].count,
                    }
                }

                result.revenue = revenue;
                result.expenses = expenses;
                result.inflow = inflow;

            }

            // process for other models
            if (model) {

                let mpdata = {
                    status: TransactionStatus.SUCCESSFUL,
                    createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) }
                },
                    pmdata = {
                        status: TransactionStatus.PENDING,
                        createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) }
                    },
                    rfdata = {
                        status: TransactionStatus.REFUNDED,
                        createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) }
                    },
                    lkdata = {
                        status: TransactionStatus.SUCCESSFUL,
                        feature: TransactionFeatureType.PAYMENT_LINK,
                        createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) }
                    };

                const mpl: PipelineStage = {
                    $match: { ...model, ...mpdata }
                }

                const gpl: PipelineStage = {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        amount: { $sum: "$amount" },
                        fee: { $sum: "$fee" },
                        vat: { $sum: "$vatFee" },
                        stamp: { $sum: "$stampFee" },
                        revenue: { $sum: "$revenue.amount" },
                        data: {
                            $push: {
                                createdAt: "$createdAt",
                                amount: "$amount",
                                status: "$status",
                                level: "$level"
                            }
                        }
                    }
                }

                const pmpl: PipelineStage = {
                    $match: { ...model, ...pmdata }
                }

                const rmpl: PipelineStage = {
                    $match: { ...model, ...rfdata }
                }

                const lkmpl: PipelineStage = {
                    $match: { ...model, ...lkdata }
                }

                const aggregated = await Transaction.aggregate([mpl, gpl]);
                const _pAgg = await Transaction.aggregate([pmpl, gpl]);
                const _rAgg = await Transaction.aggregate([rmpl, gpl]);
                const revAgg = await Transaction.aggregate([lkmpl, gpl]);

                if (aggregated[0]) {

                    const splitFee = await this.splitFees(aggregated[0]);

                    result.successful = {
                        amount: splitFee.feeAmount,
                        totalAmount: splitFee.amount,
                        revenue: splitFee.revenue,
                        vat: splitFee.vat,
                        providerFee: splitFee.fee - splitFee.revenue,
                        count: aggregated[0].count,
                    }

                }

                if (_pAgg[0]) {

                    const splitFee = await this.splitFees(_pAgg[0]);

                    result.pending = {
                        amount: splitFee.feeAmount,
                        totalAmount: splitFee.amount,
                        revenue: splitFee.revenue,
                        vat: splitFee.vat,
                        providerFee: splitFee.fee - splitFee.revenue,
                        count: _pAgg[0].count,
                    }

                }

                if (_rAgg[0]) {
                    const splitFee = await this.splitFees(_rAgg[0]);

                    result.refunded = {
                        amount: splitFee.feeAmount,
                        totalAmount: splitFee.amount,
                        revenue: splitFee.revenue,
                        vat: splitFee.vat,
                        providerFee: splitFee.fee - splitFee.revenue,
                        count: _rAgg[0].count,
                    }
                }

                if (revAgg[0]) {
                    const splitFee = await this.splitFees(revAgg[0]);

                    result.revenue = {
                        amount: splitFee.feeAmount,
                        totalAmount: splitFee.amount,
                        revenue: splitFee.revenue,
                        vat: splitFee.vat,
                        providerFee: splitFee.fee - splitFee.revenue,
                        count: revAgg[0].count,
                    }
                }

            }


        } else if (user.userType === UserType.BUSINESS) {

            const business = await BusinessRepository.findByUser(user, true);

            if (business) {

                // process for transaction model
                if (!model) {

                    const mpl: PipelineStage = {
                        $match: {
                            $and: [
                                { business: business._id },
                                { status: TransactionStatus.SUCCESSFUL },
                                { createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) } }
                            ]
                        }
                    }

                    const gpl: PipelineStage = {
                        $group: {
                            _id: null,
                            count: { $sum: 1 },
                            amount: { $sum: "$amount" },
                            fee: { $sum: "$fee" },
                            vat: { $sum: "$vatFee" },
                            stamp: { $sum: "$stampFee" },
                            revenue: { $sum: "$revenue.amount" },
                            data: {
                                $push: {
                                    createdAt: "$createdAt",
                                    amount: "$amount",
                                    status: "$status",
                                    level: "$level"
                                }
                            }
                        }
                    }

                    const pmpl: PipelineStage = {
                        $match: {
                            $and: [
                                { business: business._id },
                                { status: TransactionStatus.PENDING },
                                { createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) } }
                            ]
                        }
                    }

                    const rmpl: PipelineStage = {
                        $match: {
                            $and: [
                                { business: business._id },
                                { status: TransactionStatus.REFUNDED },
                                { createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) } }
                            ]
                        }
                    }

                    const lkmpl: PipelineStage = {
                        $match: {
                            $and: [
                                { business: business._id },
                                { status: TransactionStatus.SUCCESSFUL },
                                { feature: TransactionFeatureType.PAYMENT_LINK },
                                { createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) } }
                            ]
                        }
                    }

                    const aggregated = await Transaction.aggregate([mpl, gpl]);
                    const _pAgg = await Transaction.aggregate([pmpl, gpl]);
                    const _rAgg = await Transaction.aggregate([rmpl, gpl]);
                    const revenue = await this.aggregateDailyRevenue(user, { from: dates.today, to: dates.today });
                    const expenses = await this.aggregateDailyExpense(user, { from: dates.today, to: dates.today });
                    const inflow = await this.aggregateDailyInflow(user, { from: dates.today, to: dates.today });

                    if (aggregated[0]) {

                        const splitFee = await this.splitFees(aggregated[0]);

                        result.successful = {
                            amount: splitFee.feeAmount,
                            totalAmount: splitFee.amount,
                            revenue: splitFee.revenue,
                            vat: splitFee.vat,
                            providerFee: splitFee.fee - splitFee.revenue,
                            count: aggregated[0].count,
                        }

                    }

                    if (_pAgg[0]) {

                        const splitFee = await this.splitFees(_pAgg[0]);

                        result.pending = {
                            amount: splitFee.feeAmount,
                            totalAmount: splitFee.amount,
                            revenue: splitFee.revenue,
                            vat: splitFee.vat,
                            providerFee: splitFee.fee - splitFee.revenue,
                            count: _pAgg[0].count,
                        }

                    }

                    if (_rAgg[0]) {
                        const splitFee = await this.splitFees(_rAgg[0]);

                        result.refunded = {
                            amount: splitFee.feeAmount,
                            totalAmount: splitFee.amount,
                            revenue: splitFee.revenue,
                            vat: splitFee.vat,
                            providerFee: splitFee.fee - splitFee.revenue,
                            count: _rAgg[0].count,
                        }
                    }

                    result.revenue = revenue;
                    result.expenses = expenses;
                    result.inflow = inflow;

                }

                // process for other models
                if (model) {

                    const mpl: PipelineStage = {
                        $match: {
                            $and: [
                                { business: business._id },
                                { ...model },
                                { status: TransactionStatus.SUCCESSFUL },
                                { createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) } }
                            ]
                        }
                    }

                    const gpl: PipelineStage = {
                        $group: {
                            _id: null,
                            count: { $sum: 1 },
                            amount: { $sum: "$amount" },
                            fee: { $sum: "$fee" },
                            vat: { $sum: "$vatFee" },
                            stamp: { $sum: "$stampFee" },
                            revenue: { $sum: "$revenue.amount" },
                            data: {
                                $push: {
                                    createdAt: "$createdAt",
                                    amount: "$amount",
                                    status: "$status",
                                    level: "$level"
                                }
                            }
                        }
                    }

                    const pmpl: PipelineStage = {
                        $match: {
                            $and: [
                                { business: business._id },
                                { ...model },
                                { status: TransactionStatus.PENDING },
                                { createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) } }
                            ]
                        }
                    }

                    const rmpl: PipelineStage = {
                        $match: {
                            $and: [
                                { business: business._id },
                                { ...model },
                                { status: TransactionStatus.REFUNDED },
                                { createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) } }
                            ]
                        }
                    }

                    const lkmpl: PipelineStage = {
                        $match: {
                            $and: [
                                { business: business._id },
                                { ...model },
                                { status: TransactionStatus.SUCCESSFUL },
                                { feature: TransactionFeatureType.PAYMENT_LINK },
                                { createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) } }
                            ]
                        }
                    }

                    const aggregated = await Transaction.aggregate([mpl, gpl]);
                    const _pAgg = await Transaction.aggregate([pmpl, gpl]);
                    const _rAgg = await Transaction.aggregate([rmpl, gpl]);
                    const revAgg = await Transaction.aggregate([lkmpl, gpl]);

                    if (aggregated[0]) {

                        const splitFee = await this.splitFees(aggregated[0]);

                        result.successful = {
                            amount: splitFee.feeAmount,
                            totalAmount: splitFee.amount,
                            revenue: splitFee.revenue,
                            vat: splitFee.vat,
                            providerFee: splitFee.fee - splitFee.revenue,
                            count: aggregated[0].count,
                        }

                    }

                    if (_pAgg[0]) {

                        const splitFee = await this.splitFees(_pAgg[0]);

                        result.pending = {
                            amount: splitFee.feeAmount,
                            totalAmount: splitFee.amount,
                            revenue: splitFee.revenue,
                            vat: splitFee.vat,
                            providerFee: splitFee.fee - splitFee.revenue,
                            count: _pAgg[0].count,
                        }

                    }

                    if (_rAgg[0]) {
                        const splitFee = await this.splitFees(_rAgg[0]);

                        result.refunded = {
                            amount: splitFee.feeAmount,
                            totalAmount: splitFee.amount,
                            revenue: splitFee.revenue,
                            vat: splitFee.vat,
                            providerFee: splitFee.fee - splitFee.revenue,
                            count: _rAgg[0].count,
                        }
                    }

                    if (revAgg[0]) {
                        const splitFee = await this.splitFees(revAgg[0]);

                        result.revenue = {
                            amount: splitFee.feeAmount,
                            totalAmount: splitFee.amount,
                            revenue: splitFee.revenue,
                            vat: splitFee.vat,
                            providerFee: splitFee.fee - splitFee.revenue,
                            count: revAgg[0].count,
                        }
                    }

                }

            }


        }

        return result;

    }

    /**
     * @name aggregateAnalyticsByProvider
     * @param data 
     * @returns 
     */
    public async aggregateAnalyticsByProvider(data: AggregateAnalyticsByProviderDTO): Promise<IFilterAnalytics> {

        let result: IFilterAnalytics = {};
        const { user, provider, dates } = data;

        if (user.userType === UserType.SUPER || user.userType === UserType.ADMIN) {

            // process for other models
            const mpl: PipelineStage = {
                $match: {
                    provider: provider._id,
                    status: TransactionStatus.SUCCESSFUL,
                    createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) }
                }
            }

            const gpl: PipelineStage = {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    amount: { $sum: "$amount" },
                    fee: { $sum: "$fee" },
                    vat: { $sum: "$vatFee" },
                    stamp: { $sum: "$stampFee" },
                    revenue: { $sum: "$revenue.amount" },
                    data: {
                        $push: {
                            createdAt: "$createdAt",
                            amount: "$amount",
                            status: "$status",
                            level: "$level"
                        }
                    }
                }
            }

            const pmpl: PipelineStage = {
                $match: {
                    provider: provider._id,
                    status: TransactionStatus.PENDING,
                    createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) }
                }
            }

            const rmpl: PipelineStage = {
                $match: {
                    provider: provider._id,
                    status: TransactionStatus.REFUNDED,
                    createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) }
                }
            }

            const lkmpl: PipelineStage = {
                $match: {
                    provider: provider._id,
                    status: TransactionStatus.SUCCESSFUL,
                    feature: TransactionFeatureType.PAYMENT_LINK,
                    createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) }
                }
            }

            const aggregated = await Transaction.aggregate([mpl, gpl]);
            const _pAgg = await Transaction.aggregate([pmpl, gpl]);
            const _rAgg = await Transaction.aggregate([rmpl, gpl]);
            const revAgg = await Transaction.aggregate([lkmpl, gpl]);

            if (aggregated[0]) {

                const splitFee = await this.splitFees(aggregated[0]);

                result.successful = {
                    amount: splitFee.feeAmount,
                    totalAmount: splitFee.amount,
                    revenue: splitFee.revenue,
                    vat: splitFee.vat,
                    providerFee: splitFee.fee - splitFee.revenue,
                    count: aggregated[0].count,
                }

            }

            if (_pAgg[0]) {

                const splitFee = await this.splitFees(_pAgg[0]);

                result.pending = {
                    amount: splitFee.feeAmount,
                    totalAmount: splitFee.amount,
                    revenue: splitFee.revenue,
                    vat: splitFee.vat,
                    providerFee: splitFee.fee - splitFee.revenue,
                    count: _pAgg[0].count,
                }

            }

            if (_rAgg[0]) {
                const splitFee = await this.splitFees(_rAgg[0]);

                result.refunded = {
                    amount: splitFee.feeAmount,
                    totalAmount: splitFee.amount,
                    revenue: splitFee.revenue,
                    vat: splitFee.vat,
                    providerFee: splitFee.fee - splitFee.revenue,
                    count: _rAgg[0].count,
                }
            }

            if (revAgg[0]) {
                const splitFee = await this.splitFees(revAgg[0]);

                result.revenue = {
                    amount: splitFee.feeAmount,
                    totalAmount: splitFee.amount,
                    revenue: splitFee.revenue,
                    vat: splitFee.vat,
                    providerFee: splitFee.fee - splitFee.revenue,
                    count: revAgg[0].count,
                }
            }


        } else if (user.userType === UserType.BUSINESS) {

            const business = await BusinessRepository.findByUser(user, true);

            if (business) {

                const mpl: PipelineStage = {
                    $match: {
                        $and: [
                            { business: business._id },
                            { provider: provider._id },
                            { status: TransactionStatus.SUCCESSFUL },
                            { createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) } }
                        ]
                    }
                }

                const gpl: PipelineStage = {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        amount: { $sum: "$amount" },
                        fee: { $sum: "$fee" },
                        vat: { $sum: "$vatFee" },
                        stamp: { $sum: "$stampFee" },
                        revenue: { $sum: "$revenue.amount" },
                        data: {
                            $push: {
                                createdAt: "$createdAt",
                                amount: "$amount",
                                status: "$status",
                                level: "$level"
                            }
                        }
                    }
                }

                const pmpl: PipelineStage = {
                    $match: {
                        $and: [
                            { business: business._id },
                            { provider: provider._id },
                            { status: TransactionStatus.PENDING },
                            { createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) } }
                        ]
                    }
                }

                const rmpl: PipelineStage = {
                    $match: {
                        $and: [
                            { business: business._id },
                            { provider: provider._id },
                            { status: TransactionStatus.REFUNDED },
                            { createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) } }
                        ]
                    }
                }

                const lkmpl: PipelineStage = {
                    $match: {
                        $and: [
                            { business: business._id },
                            { provider: provider._id },
                            { status: TransactionStatus.SUCCESSFUL },
                            { feature: TransactionFeatureType.PAYMENT_LINK },
                            { createdAt: { $gte: new Date(dates.start), $lt: new Date(dates.end) } }
                        ]
                    }
                }

                const aggregated = await Transaction.aggregate([mpl, gpl]);
                const _pAgg = await Transaction.aggregate([pmpl, gpl]);
                const _rAgg = await Transaction.aggregate([rmpl, gpl]);
                const revAgg = await Transaction.aggregate([lkmpl, gpl]);

                if (aggregated[0]) {

                    const splitFee = await this.splitFees(aggregated[0]);

                    result.successful = {
                        amount: aggregated[0].amount - aggregated[0].fee,
                        totalAmount: aggregated[0].amount,
                        revenue: aggregated[0].revenue,
                        vat: aggregated[0].vat,
                        providerFee: aggregated[0].fee - aggregated[0].revenue,
                        count: aggregated[0].count,
                    }

                }

                if (_pAgg[0]) {

                    const splitFee = await this.splitFees(_pAgg[0]);

                    result.pending = {
                        amount: splitFee.feeAmount,
                        totalAmount: splitFee.amount,
                        revenue: splitFee.revenue,
                        vat: splitFee.vat,
                        providerFee: splitFee.fee - splitFee.revenue,
                        count: _pAgg[0].count,
                    }

                }

                if (_rAgg[0]) {
                    const splitFee = await this.splitFees(_rAgg[0]);

                    result.refunded = {
                        amount: splitFee.feeAmount,
                        totalAmount: splitFee.amount,
                        revenue: splitFee.revenue,
                        vat: splitFee.vat,
                        providerFee: splitFee.fee - splitFee.revenue,
                        count: _rAgg[0].count,
                    }
                }

                if (revAgg[0]) {
                    const splitFee = await this.splitFees(revAgg[0]);

                    result.revenue = {
                        amount: splitFee.feeAmount,
                        totalAmount: splitFee.amount,
                        revenue: splitFee.revenue,
                        vat: splitFee.vat,
                        providerFee: splitFee.fee - splitFee.revenue,
                        count: revAgg[0].count,
                    }
                }

            }


        }

        return result;

    }

}

export default new TransactionRepository