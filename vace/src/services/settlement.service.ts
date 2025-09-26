import { Mongo, UIID, arrayIncludes, dateIsEqual, dateIsPast, dateToday, formatISO, isArray, isDefined, isNeg, leadingNum, notDefined, toDecimal } from '@btffamily/vacepay';
import { CreateRunHistoryDTO, CreateSettlementDTO, FilterSettlementDTO, GetDueSettlementOverviewDTO, MarkAsSettledDTO, ProcessGroupsDTO, ProcessRunSettlementDTO, RefreshSettlementReportDTO, ReportSettlementDTO, RunBusinessSettlementDTO, RunLumpSettlementDTO, RunSettlementDTO, SettleLumpSumDTO, SettleSubaccountsDTO, UpdateSettlementGroupDTO, UpdateSettlementOverviewDTO, UpdateSettlementPayoutDTO, UpdateSettlementReportDTO } from '../dtos/settlement.dto';
import { IBusinessDoc, IGroupPaymentLink, IGroupPaymentSum, IGroupSubaccount, IGroupTransaction, IPaymentLinkDoc, IResult, ISettingDoc, ISettlementAnalytics, ISettlementDoc, ISettlementGroup, ISettlementLump, ISettlementOverview, ISettlementPayout, ISubaccount, ISubaccountDoc, ITransactionDoc, IUserDoc, IWalletDoc } from '../utils/types.util'
import Settlement from '../models/Settlement.model';
import { BusinessType, PrefixType, ProviderNameType, SettleIntoType, SettlementStatus, SettlementType, TransactionChannelType, TransactionFeatureType, TransactionStatus, UserType, ValueType } from '../utils/enums.util';
import Transaction from '../models/Transaction.model';
import { ObjectId } from 'mongoose';
import TransactionRepository from '../repositories/transaction.repository';
import SettlementRepository from '../repositories/settlement.repository';
import VacepayService from './vacepay.service';
import ProviderService from './provider.service';
import Provider from '../models/Provider.model';
import TransactionService from './transaction.service';
import WalletService from './wallet.service';
import accountService from './account.service';
import BaniService from './providers/bani.service';
import BusinessService from './business.service';
import Business from '../models/Business.model';
import BusinessRepository from '../repositories/business.repository';
import dayjs from 'dayjs';
import customParse from 'dayjs/plugin/customParseFormat';
import ChargebackRepository from '../repositories/chargeback.repository';
import SettlementHistory from '../models/SettlementHistory.model';
import Subaccount from '../models/Subaccount.model';
dayjs.extend(customParse);

interface IOverview {
    total: number,
    completed: number,
    pending: number,
    transactions: number,
    value: number
}

class SettlementService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
      * @name validateRunSettlement
      * @param data 
      * @returns 
      */
    public async validateRunSettlement(data: RunSettlementDTO): Promise<IResult> {

        const allowed = ['full-settlement', 'business-settlement']
        let result: IResult = { error: false, message: '', code: 200, data: null };
        const { type, businessId } = data;

        if (!type) {
            result.error = true;
            result.message = 'settlement type is required'
        } else if (!arrayIncludes(allowed, type)) {
            result.error = true;
            result.message = `invalid settlement type value. choose from ${allowed.join(', ')}`
        } else if (type === SettlementType.BUSINESS && !businessId) {
            result.error = true;
            result.message = 'business id is required'
        } else {
            result.error = false;
            result.message = ''
        }

        return result;

    }

    /**
     * @name createSettlement
     * @param data 
     * @returns 
     */
    public async createSettlement(data: CreateSettlementDTO): Promise<ISettlementDoc> {

        const { date, transactions, description, business } = data;

        const today = dateToday(date ? date : Date.now());
        const formated = formatISO(today.ISO);
        const code = `${PrefixType.SETTLEMENT}${UIID(1).toUpperCase()}`

        const settlement = await Settlement.create({
            code: code,
            description: description ? description : '',
            created: {
                date: formated.date,
                time: formated.time,
                ISO: today.ISO
            },
            updated: {
                date: formated.date,
                time: formated.time,
                ISO: today.ISO
            }
        });

        business.settlements.push(settlement._id);
        await business.save()

        if (transactions && transactions.length > 0) {
            await this.updateSettlementReport({ settlement, transactions, business });
        }

        return settlement;

    }

    /**
     * STEP-FUNC - 1
     * @name reportSettlement
     * @param data 
     * @returns 
     */
    public async reportSettlement(data: ReportSettlementDTO): Promise<ISettlementDoc> {

        const { transaction, business } = data;
        const today = dateToday(Date.now());
        const formatted = formatISO(today.ISO);

        // push id into a list
        let transactions: Array<ObjectId> = [];
        transactions.push(transaction._id);

        let settlement = await SettlementRepository.findByDate(today.ISO, false);

        if (settlement) {

            settlement = await this.updateSettlementReport({ settlement, transactions, business });
            return settlement;

        } else {

            let dateCreated = `${leadingNum(today.year)}-${leadingNum(today.month)}-${today.date}`;

            const newSettlement = await this.createSettlement({
                transactions,
                description: `settlement report for ${dateCreated} at ${formatted.time}`,
                business
            })

            return newSettlement;

        }

    }

    /**
     * STEP-FUNC - SUB1
     * @name updateSettlement
     * @param data 
     * @returns 
     */
    public async updateSettlementReport(data: UpdateSettlementReportDTO): Promise<ISettlementDoc> {

        let { settlement, transactions, date, business } = data;

        const today = dateToday(date ? date : Date.now());
        const formated = formatISO(today.ISO);
        let analytics = settlement.analytics;

        if (transactions && transactions.length > 0) {

            for (let i = 0; i < transactions.length; i++) {

                let transaction = await TransactionRepository.findById(transactions[i], false)

                if (transaction && transaction !== null && transaction.feature === TransactionFeatureType.PAYMENT_LINK) {

                    if (!arrayIncludes(settlement.transactions, transaction._id.toString())) {

                        transaction.settlement = settlement._id;
                        await transaction.save();
                        settlement.transactions.push(transaction._id);

                        let vatAndFee = transaction.fee + transaction.vatFee;
                        let total = transaction.amount - vatAndFee;
                        settlement.totalAmount = settlement.totalAmount + total;

                    }

                    // add business to list of settlement businesses
                    if (!arrayIncludes(settlement.businesses, transaction.business.toString())) {
                        settlement.businesses.push(transaction.business);
                        settlement.overview.businesses = settlement.overview.businesses + 1;
                    }

                    // remove business from list of already settled businesses
                    if (arrayIncludes(analytics.settled.businesses, transaction.business.toString())) {
                        // @ts-ignore: Object is possibly 'null'.
                        let filtered = analytics.settled.businesses.filter((x) => x.toString() !== transaction.business.toString());
                        analytics.settled.businesses = filtered;
                        settlement.analytics = analytics;
                    }

                    /**
                     * Update payout-dates, overvive and groups
                     */
                    await this.updateSettlementPayout({ settlement, business, transaction });
                    await this.updateSettlementOverview({ settlement, transaction })
                    await this.updateSettlementGroup({ settlement, transaction })

                }

            }

            if (settlement.status === SettlementStatus.COMPLETED) {
                settlement.status = SettlementStatus.PROCESSING;
                settlement.isSettled = false;
            }

            if (date) {
                const today = dateToday(date);
                settlement.createdAt = today.ISO;
            }

            settlement.updated = {
                date: formated.date,
                time: formated.time,
                ISO: today.ISO
            }

            await settlement.save();

        }

        return settlement;

    }

    /**
     * @name updateSettlementPayout
     * @param data 
     */
    public async updateSettlementPayout(data: UpdateSettlementPayoutDTO): Promise<void> {

        const business = await BusinessRepository.findById(data.business._id, true);
        const settlement = await SettlementRepository.findById(data.settlement._id);
        const transaction = await TransactionRepository.findById(data.transaction._id);

        if (business && settlement && transaction) {

            const settings: ISettingDoc = business.settings;
            let payouts: Array<ISettlementPayout> = settlement.payouts;

            const today = dateToday(Date.now());
            let _addDate = dayjs(today.ISO).add(settings.settlement.days, 'day'); // add x days
            const converted = dateToday(_addDate);

            const businessIds = payouts.map((x) => {
                return x.business;
            });

            // set next payouts in payouts
            if (!arrayIncludes(businessIds, business._id.toString())) {

                payouts.push({
                    business: business._id,
                    date: converted.ISO
                });

            }

            settlement.payouts = payouts;
            await settlement.save();

            // update business settings
            if (settings.settlement.nextPayout === null || !settings.settlement.nextPayout) {
                settings.settlement.nextPayout = converted.ISO;
                await settings.save();
            } else {

                const formated = formatISO(settings.settlement.nextPayout);

                if (dateIsEqual(formated.date, converted.ISO)) {
                    settings.settlement.nextPayout = settings.settlement.nextPayout;
                } else {
                    settings.settlement.nextPayout = converted.ISO;
                }

                await settings.save();
            }

        }

    }

    /**
     * STEP-FUNC - SUB1 => INTL 1
     * @name updateSettlementOverview
     * @param data 
     */
    public async updateSettlementOverview(data: UpdateSettlementOverviewDTO): Promise<void> {

        const settlement = await SettlementRepository.findById(data.settlement._id, false);
        const transaction = await TransactionRepository.findByReferenceAndSelectRevenue(data.transaction.reference, true);

        if (settlement && transaction && transaction.feature === TransactionFeatureType.PAYMENT_LINK && transaction.status === TransactionStatus.SUCCESSFUL) {

            let overview: ISettlementOverview = settlement.overview;
            const business: IBusinessDoc = transaction.business;

            // update finance-overview
            const vatAndFee = transaction.fee + transaction.vatFee;
            const lessedAmount = transaction.amount - vatAndFee;

            overview.totalAmount = toDecimal((overview.totalAmount + transaction.amount), 2);
            overview.amount = toDecimal((overview.amount + lessedAmount), 2);
            overview.totalVat = toDecimal((overview.totalVat + transaction.vatFee), 2);
            overview.totalFee = toDecimal((overview.totalFee + transaction.fee), 2);
            overview.revenue = toDecimal((overview.revenue + transaction.revenue.amount), 2);

            /**
             * Update the dueToday overview
             * Uses today's date by default
             */
            const dueToday = await this.getDueSettlementOverview({ type: 'today', settlement });
            overview.dueToday = {
                amount: dueToday.amount,
                businesses: dueToday.count
            }

            /**
             * Update the pastDue overview
             */
            const pastDue = await this.getDueSettlementOverview({ type: 'past', settlement });
            overview.pastDue = {
                amount: pastDue.amount,
                businesses: pastDue.count
            }

            // update settlement overview
            settlement.overview = overview;
            await settlement.save()

        }

    }

    /**
     * STEP-FUNC - SUB1 => INTLSB 1
     * @name getDueSettlementOverview
     * @param settlement
     * @param date 
     */
    public async getDueSettlementOverview(data: GetDueSettlementOverviewDTO): Promise<{ amount: number, count: number }> {

        let result: { amount: number, count: number } = { amount: 0, count: 0 }
        const { settlement, type, date } = data;

        const today = date ? dateToday(date) : dateToday(Date.now());
        const formatted = formatISO(today.ISO);
        const analytics = settlement.analytics;

        if (settlement.payouts.length > 0) {

            for (let i = 0; i < settlement.payouts.length; i++) {

                let payout = settlement.payouts[i];
                let dueAt = dateToday(payout.date);
                let formattedDue = formatISO(dueAt.ISO)

                if (type === 'today' && formattedDue.date === formatted.date) {
                    let aggregate = await TransactionRepository.aggregateDueSettlement({ settlement, businessId: payout.business });

                    if (!arrayIncludes(analytics.settled.businesses, payout.business.toString())) {
                        result.amount = result.amount + aggregate.amount;
                        result.count = result.count + 1;
                    }
                }

                if (type === 'past' && dateIsPast(today.ISO, dueAt.ISO)) {

                    let aggregate = await TransactionRepository.aggregateDueSettlement({ settlement, businessId: payout.business });

                    if (!arrayIncludes(analytics.settled.businesses, payout.business.toString())) {
                        result.amount = result.amount + aggregate.amount;
                        result.count = result.count + 1;
                    }

                }

            }

        }

        return result;

    }

    /**
     * STEP-FUNC - SUB1 => INTL 2
     * @name updateSettlementGroup
     * @param data 
     */
    public async updateSettlementGroup(data: UpdateSettlementGroupDTO): Promise<void> {

        const settlement = await SettlementRepository.findById(data.settlement._id, false);
        const transaction = await TransactionRepository.findByReferenceAndSelectRevenue(data.transaction.reference, true);

        if (settlement && transaction) {

            let groups: Array<ISettlementGroup> = settlement.groups;
            const business: IBusinessDoc = transaction.business;
            const paymentLink: IPaymentLinkDoc = transaction.payment;
            const subaccounts: Array<ISubaccountDoc> = paymentLink.subaccounts;

            if (transaction.feature === TransactionFeatureType.PAYMENT_LINK && transaction.settle.status === SettlementStatus.PENDING) {

                // map out the business id
                const mappedIds = groups.map((x) => x.business);

                // add data to groups if business is not present
                if (!arrayIncludes(mappedIds, business._id.toString())) {

                    const mappedSubaccounts = subaccounts.map((x) => {

                        return {
                            _id: x._id,
                            code: x.code,
                            accountNo: x.bank.accountNo,
                            accountName: x.bank.accountName,
                            bankCode: x.bank.bankCode,
                            bankName: x.bank.legalName,
                            splitType: x.split.type,
                            splitValue: x.split.value,
                            payment: paymentLink._id,
                            amount: 0
                        }

                    })

                    groups.push({
                        business: business._id,
                        paymentLinks: [{
                            payment: paymentLink._id,
                            subaccounts: mappedSubaccounts,
                            transactions: [{
                                _id: transaction._id,
                                reference: transaction.reference,
                                amount: transaction.amount,
                                fee: transaction.fee,
                                vat: transaction.vatFee,
                                revenue: transaction.revenue.amount,
                                amountToSettle: transaction.settle.amount
                            }]
                        }],
                    })

                }

                // add data needed to group if business is present
                if (arrayIncludes(mappedIds, business._id.toString())) {

                    const mappedSubaccounts = subaccounts.map((x) => {

                        return {
                            _id: x._id,
                            code: x.code,
                            accountNo: x.bank.accountNo,
                            accountName: x.bank.accountName,
                            bankCode: x.bank.bankCode,
                            bankName: x.bank.legalName,
                            splitType: x.split.type,
                            splitValue: x.split.value,
                            payment: paymentLink._id,
                            amount: 0
                        }

                    })

                    let group = groups.find((x) => x.business.toString() === business._id.toString());
                    let groupIndex = groups.findIndex((x) => x.business.toString() === business._id.toString());

                    if (group) {

                        const paymentIds = group.paymentLinks.map((x) => x.payment);

                        // add payment-link to group if it is not existing in group
                        if (!arrayIncludes(paymentIds, paymentLink._id.toString())) {

                            group.paymentLinks.push({
                                payment: paymentLink._id,
                                subaccounts: mappedSubaccounts,
                                transactions: [{
                                    _id: transaction._id,
                                    reference: transaction.reference,
                                    amount: transaction.amount,
                                    fee: transaction.fee,
                                    vat: transaction.vatFee,
                                    revenue: transaction.revenue.amount,
                                    amountToSettle: transaction.settle.amount
                                }]
                            })

                        }

                        // update transactions & subaccounts if it already exists in group
                        // subaccounts is updated here should in case payment link sub-accounts have been changed
                        if (arrayIncludes(paymentIds, paymentLink._id.toString())) {

                            let paymentData = group.paymentLinks.find((x) => x.payment.toString() === paymentLink._id.toString());
                            let paymentDataIndex = group.paymentLinks.findIndex((x) => x.payment.toString() === paymentLink._id.toString());

                            if (paymentData) {

                                // update subaccounts
                                paymentData.subaccounts = mappedSubaccounts;

                                // add the new transaction
                                if (!arrayIncludes(paymentData.transactions, transaction._id.toString())) {
                                    paymentData.transactions.push({
                                        _id: transaction._id,
                                        reference: transaction.reference,
                                        amount: transaction.amount,
                                        fee: transaction.fee,
                                        vat: transaction.vatFee,
                                        revenue: transaction.revenue.amount,
                                        amountToSettle: transaction.settle.amount
                                    });
                                }

                                // extract qualified transactions
                                paymentData.transactions = await this.extractGroupTransactions(paymentData.transactions)

                                // put payment data back into position
                                group.paymentLinks.splice(paymentDataIndex, 1, paymentData)

                            }

                        }

                        groups.splice(groupIndex, 1, group) // replace with new data

                    }

                }

                // update settlement overview
                settlement.groups = groups;
                await settlement.save();

            }

        }

    }

    /**
     * STEP-FUNC - SUB1 => INTL 3
     * @name extractGroupTransactions
     * @description loops through list of transactions and extracts transactions not settled
     * @param data 
     * @returns 
     */
    private async extractGroupTransactions(data: Array<IGroupTransaction>): Promise<Array<IGroupTransaction>> {

        let result: Array<IGroupTransaction> = []

        for (let i = 0; i < data.length; i++) {

            let transaction = await TransactionRepository.findByReferenceAndSelectRevenue(data[i].reference, false);

            if (transaction &&
                transaction.status === TransactionStatus.SUCCESSFUL &&
                transaction.feature === TransactionFeatureType.PAYMENT_LINK &&
                transaction.settle.status === SettlementStatus.PENDING) {

                result.push({
                    _id: transaction._id,
                    amount: transaction.amount,
                    fee: transaction.fee,
                    revenue: transaction.revenue.amount,
                    vat: transaction.vatFee,
                    reference: transaction.reference,
                    amountToSettle: transaction.settle.amount
                })

            }


        }

        return result;

    }

    /**
     * @name refreshSettlementReport
     * @param data 
     */
    public async refreshSettlementReport(data: RefreshSettlementReportDTO): Promise<void> {

        const settlement = await SettlementRepository.findByIdAndFetchTransactions(data.settlement._id);

        const today = dateToday(Date.now());
        const formated = formatISO(today.ISO);
        let totalAmount: number = 0, businesses: number = 0;

        if (settlement && settlement.transactions.length > 0) {

            const transactions: Array<ITransactionDoc> = settlement.transactions;

            for (let i = 0; i < transactions.length; i++) {

                let isAllowed: boolean = false;
                let transaction = transactions[i];
                let business: IBusinessDoc = transaction.business;

                // TODO include the remaining amount of transactions partially refunded 
                if (transaction.status === TransactionStatus.SUCCESSFUL || transaction.status === TransactionStatus.COMPLETED) {
                    isAllowed = true;
                }

                if (transaction.feature === TransactionFeatureType.PAYMENT_LINK && isAllowed) {

                    let vatAndFee = transaction.fee + transaction.vatFee;
                    let total = transaction.amount - vatAndFee;
                    totalAmount = totalAmount + total;

                    if (!arrayIncludes(settlement.businesses, business._id.toString())) {
                        settlement.businesses.push(business._id);
                        businesses = businesses + 1;
                    }

                    /**
                     * Update payout-dates, overvive and groups
                     */
                    await this.updateSettlementPayout({ settlement, business, transaction });
                    await this.updateSettlementOverview({ settlement, transaction })
                    await this.updateSettlementGroup({ settlement, transaction })

                }

            }

            settlement.totalAmount = totalAmount;
            settlement.overview.businesses = businesses;
            if (settlement.status === SettlementStatus.COMPLETED) {
                settlement.status = SettlementStatus.PROCESSING;
            }
            settlement.updated = {
                date: formated.date,
                time: formated.time,
                ISO: today.ISO
            }
            await settlement.save();

        }

    }

    /**
     * @name createRunSettle
     * @param data 
     */
    public async createRunHistory(data: CreateRunHistoryDTO): Promise<void> {

        const { analytics, groups, settlement } = data;
        let initialT: Array<IGroupTransaction> = []
        let initialL: Array<ObjectId | any> = []
        let initialSub: Array<IGroupSubaccount> = []

        // reduce transactions
        let transactions = groups.reduce((acc, curr) => {
            return (acc.concat(curr.transactions))
        }, initialT)

        let paymentLinks = groups.reduce((acc, curr) => {
            return (acc.concat(curr.paymentLinks))
        }, initialL)

        let subaccounts = groups.reduce((acc, curr) => {
            return (acc.concat(curr.subaccounts))
        }, initialSub)

        const mappedBIds = groups.map((mp) => mp.business._id);
        const mappedTIds = transactions.map((mp) => mp._id)
        const mappedPIds = paymentLinks.map((mp) => mp)
        const mappedSIds = subaccounts.map((mp) => mp._id);

        const history = await SettlementHistory.create({
            amountSettled: analytics.settled.amount,
            amountShared: analytics.settled.shared,
            settledBy: settlement.settledBy,
            settlement: settlement._id,
            transactions: mappedTIds,
            businesses: mappedBIds,
            payments: mappedPIds,
            subaccounts: mappedSIds,
            groups: groups
        });

        settlement.histories.push(history._id);
        await settlement.save()

    }

    /**
     * New-Plux
     * @param type 
     * @param amount 
     * @param split 
     * @returns 
     */
    private async calculateShare(amount: number, type: string, split: number): Promise<number> {

        let result: number = 0;

        if (type === ValueType.PERCENTAGE) {
            const perce = split / 100;
            result = perce * amount;
        }

        return result;

    }

    /**
     * New-Plux
     * @param data 
     * @param lumpAmount 
     */
    private async calculateLumpSubaccount(data: Array<IGroupSubaccount>, lumpAmount: number): Promise<Array<IGroupSubaccount>> {

        let result: Array<IGroupSubaccount> = []

        for (let i = 0; i < data.length; i++) {
            let subaccount = data[i];
            subaccount.amount = await this.calculateShare(lumpAmount, subaccount.splitType, subaccount.splitValue);
            result.push(subaccount);
        }

        return result;

    }

    /**
     * @name calculateLumpSum
     * @param group 
     * @returns 
     */
    private async calculateLumpSum(group: ISettlementGroup): Promise<Array<IGroupPaymentSum>> {

        let subaccountLinks: Array<IGroupPaymentLink> = [];
        let listLinks: Array<IGroupPaymentLink> = [];
        let paymentSums: Array<IGroupPaymentSum> = []

        // separate data
        for (let i = 0; i < group.paymentLinks.length; i++) {

            let paymentData = group.paymentLinks[i];

            // extract payment-links with subaccounts from group
            if (paymentData.subaccounts.length > 0) {
                subaccountLinks.push(paymentData)
            }

            // extract payment-links without subaccounts from group
            if (paymentData.subaccounts.length === 0) {
                listLinks.push(paymentData)
            }

        }

        /**
         * process payment-links with subaccounts
         * IMPORTANT: Remove VAT fee
         */
        for (let i = 0; i < subaccountLinks.length; i++) {

            let subLink = subaccountLinks[i]

            // reduce amount
            let amt = subLink.transactions.reduce((acc, curr) => {
                return (acc + curr.amount)
            }, 0)

            // reduce fee
            let fee = subLink.transactions.reduce((acc, curr) => {
                return (acc + curr.fee)
            }, 0)

            // reduce vat
            let vat = subLink.transactions.reduce((acc, curr) => {
                return (acc + curr.vat)
            }, 0)

            // reduce revenue
            let revenue = subLink.transactions.reduce((acc, curr) => {
                return (acc + curr.revenue)
            }, 0)

            // reduce amount to settle => {totalLump}
            let totalLump = subLink.transactions.reduce((acc, curr) => {
                return (acc + curr.amountToSettle)
            }, 0)

            // calculate the lump amount, less the {fee + vat} or use {totalLump}
            let vatAndFee = vat + fee;
            let lumpAmount = totalLump;

            // calculate amount that goes to each subaccount
            let subaccountList = await this.calculateLumpSubaccount(subLink.subaccounts, lumpAmount);

            // calculate the total shared amount
            let sharedAmount = subaccountList.reduce((acc, curr) => {
                return (acc + curr.amount)
            }, 0)

            // calculate amount to settle business
            let deff = lumpAmount - sharedAmount;
            let amtToSettle = isNeg(deff) ? 0 : deff;

            paymentSums.push({
                payment: subLink.payment,
                subaccounts: subaccountList,
                transactions: subLink.transactions,
                totalAmount: amt,
                totalFee: fee,
                totalRevenue: revenue,
                totalVat: vat,
                lumpAmount: lumpAmount,
                sharedAmount: sharedAmount,
                amountToSettle: amtToSettle
            });

        }

        /**
         * process payment-links without subaccounts
         * IMPORTANT: Remove VAT fee
         */
        for (let i = 0; i < listLinks.length; i++) {

            let listLink = listLinks[i]

            // reduce amount
            let amt = listLink.transactions.reduce((acc, curr) => {
                return (acc + curr.amount)
            }, 0)

            // reduce fee
            let fee = listLink.transactions.reduce((acc, curr) => {
                return (acc + curr.fee)
            }, 0)

            // reduce vat
            let vat = listLink.transactions.reduce((acc, curr) => {
                return (acc + curr.vat)
            }, 0)

            // reduce revenue
            let revenue = listLink.transactions.reduce((acc, curr) => {
                return (acc + curr.revenue)
            }, 0)

            // reduce amount to settle => {totalLump}
            let totalLump = listLink.transactions.reduce((acc, curr) => {
                return (acc + curr.amountToSettle)
            }, 0)

            // calculate the lump amount, less the {fee + vat} or use {totalLump}
            let vatAndFee = vat + fee;
            let lumpAmount = totalLump

            // calculate amount to settle business
            let amtToSettle = lumpAmount

            paymentSums.push({
                payment: listLink.payment,
                subaccounts: [],
                transactions: listLink.transactions,
                totalAmount: amt,
                totalFee: fee,
                totalRevenue: revenue,
                totalVat: vat,
                lumpAmount: lumpAmount,
                sharedAmount: 0,
                amountToSettle: amtToSettle
            });

        }

        return paymentSums;

    }

    /**
     * @name getSettlementLump
     * @param business 
     * @param lumpList 
     * @returns 
     */
    private async mergeLumpSum(business: IBusinessDoc, lumpList: Array<IGroupPaymentSum>): Promise<ISettlementLump> {

        let initial: Array<IGroupSubaccount> = []
        let initialT: Array<IGroupTransaction> = []
        let initialL: Array<ObjectId | any> = []

        // sum up total amount
        let totalAmount = lumpList.reduce((acc, curr) => {
            return (acc + curr.totalAmount)
        }, 0)

        // sum up total fee
        let totalFee = lumpList.reduce((acc, curr) => {
            return (acc + curr.totalFee)
        }, 0)

        // sum up total vat
        let totalVat = lumpList.reduce((acc, curr) => {
            return (acc + curr.totalVat)
        }, 0)

        // sum up total revenue
        let totalRevenue = lumpList.reduce((acc, curr) => {
            return (acc + curr.totalRevenue)
        }, 0)

        // sum up lump amount
        let lumpAmount = lumpList.reduce((acc, curr) => {
            return (acc + curr.lumpAmount)
        }, 0)

        // sum up shared amount
        let sharedAmount = lumpList.reduce((acc, curr) => {
            return (acc + curr.sharedAmount)
        }, 0)

        // sum up amount to settle business
        let amountToSettle = lumpList.reduce((acc, curr) => {
            return (acc + curr.amountToSettle)
        }, 0)

        // compile all subaccounts
        let subaccounts = lumpList.reduce((acc, curr) => {
            return (acc.concat(curr.subaccounts))
        }, initial)

        // compile all transactions
        let transactions = lumpList.reduce((acc, curr) => {
            return (acc.concat(curr.transactions))
        }, initialT)

        // compile all payment-link ids
        let paymentLinks = lumpList.reduce((acc, curr) => {
            return (acc.concat(curr.payment))
        }, initialL)


        let result: ISettlementLump = {
            business: business,
            subaccounts: subaccounts,
            transactions: transactions,
            paymentLinks: paymentLinks,
            totalAmount: totalAmount,
            totalFee: toDecimal(totalFee, 2),
            totalVat: toDecimal(totalVat, 2),
            totalRevenue: totalRevenue,
            lumpAmount: lumpAmount,
            sharedAmount: toDecimal(sharedAmount, 2),
            amountToSettle: toDecimal(amountToSettle, 2),
            linksHasSub: [],
            linksNoSub: []
        }

        // process lump-list to capture links that has subaccounts
        // and links with no subaccounts
        for (let i = 0; i < lumpList.length; i++) {
            if (lumpList[i].subaccounts.length > 0) {
                result.linksHasSub.push(lumpList[i].payment)
            }
            if (lumpList[i].subaccounts.length === 0) {
                result.linksNoSub.push(lumpList[i].payment)
            }
        }

        return result;


    }

    /**
     * @name deductChargeback
     * @param data 
     * @param amount 
     * @returns 
     */
    private async deductChargeback(data: ISettlementLump, amount: number): Promise<number> {

        let result: number = 0;

        if (amount > 0) {

            if (amount <= data.amountToSettle) {
                // chargeback is deducted here
                result = data.amountToSettle - amount;
            } else {
                result = 0; // business will not be settled
            }

        } else {
            // no chargeback is deducted
            result = data.amountToSettle;
        }

        return result;

    }

    /**
     * @name processGroups
     * @param data 
     * @returns 
     */
    private async processGroups(data: ProcessGroupsDTO): Promise<Array<ISettlementLump>> {

        const { settlement, provider, forceRun, addPast, type, businessId } = data;

        const payouts: Array<ISettlementPayout> = settlement.payouts;
        const groups: Array<ISettlementGroup> = settlement.groups;
        const today = dateToday(Date.now());

        let groupList: Array<ISettlementLump> = [];

        if (type === 'bulk') {

            for (let i = 0; i < groups.length; i++) {

                let group: ISettlementGroup = groups[i];
                let business = await BusinessRepository.findById(group.business, true)

                if (business && business !== null) {

                    // check to see if business have been settled
                    // @ts-ignore: Object is possibly 'null'.
                    let exist = settlement.analytics.settled.businesses.find((x) => x.toString() === business._id.toString())

                    if (!exist) {

                        // get pending business chargebacks
                        // @ts-ignore: Object is possibly 'null'.
                        let chargeback = await ChargebackRepository.aggregateTotalPending(business.user);

                        // @ts-ignore: Object is possibly 'null'.
                        let payout = payouts.find((x) => x.business.toString() === business._id.toString())

                        if (forceRun) {

                            let lumpList = await this.calculateLumpSum(group);
                            let lumpData = await this.mergeLumpSum(business, lumpList);
                            let newAmount = await this.deductChargeback(lumpData, chargeback.amount);

                            if (newAmount > 0) {
                                // chargeback must have been deducted if needed here
                                lumpData.amountToSettle = newAmount;
                                lumpData.chargebackAmount = chargeback.amount;
                                groupList.push(lumpData)
                            }

                        }

                        else {

                            if (addPast && payout) {

                                // add payouts due in the past
                                if (dateIsEqual(payout.date, today.ISO) || dateIsPast(today.ISO, payout.date)) {

                                    let lumpList = await this.calculateLumpSum(group);
                                    let lumpData = await this.mergeLumpSum(business, lumpList);
                                    let newAmount = await this.deductChargeback(lumpData, chargeback.amount);

                                    if (newAmount > 0) {
                                        // chargeback must have been deducted if needed here
                                        lumpData.amountToSettle = newAmount;
                                        lumpData.chargebackAmount = chargeback.amount;
                                        groupList.push(lumpData)
                                    }

                                }

                            } else if (payout) {

                                // add payouts due only for the day
                                if (dateIsEqual(payout.date, today.ISO)) {

                                    let lumpList = await this.calculateLumpSum(group);
                                    let lumpData = await this.mergeLumpSum(business, lumpList)
                                    let newAmount = await this.deductChargeback(lumpData, chargeback.amount);

                                    if (newAmount > 0) {
                                        // chargeback must have been deducted if needed here
                                        lumpData.amountToSettle = newAmount;
                                        lumpData.chargebackAmount = chargeback.amount;
                                        groupList.push(lumpData)
                                    }

                                }

                            }

                        }

                    }


                }

            }

        }

        if (type === 'single' && businessId) {

            let group = groups.find((x) => x.business.toString() === businessId.toString());
            let business = await BusinessRepository.findById(businessId, true)

            if (group && business && business !== null) {

                // check to see if business have been settled
                let exist = settlement.analytics.settled.businesses.find((x) => {
                    if (business && x.toString() === business._id.toString()) {
                        return x;
                    }
                })

                if (!exist) {

                    // get pending business chargebacks
                    // @ts-ignore: Object is possibly 'null'.
                    let chargeback = await ChargebackRepository.aggregateTotalPending(business.user);
                    
                    // @ts-ignore: Object is possibly 'null'.
                    let payout = payouts.find((x) => x.business.toString() === business._id.toString())

                    if (forceRun) {

                        let lumpList = await this.calculateLumpSum(group);
                        let lumpData = await this.mergeLumpSum(business, lumpList)
                        let newAmount = await this.deductChargeback(lumpData, chargeback.amount);

                        if (newAmount > 0) {
                            // chargeback must have been deducted if needed here
                            lumpData.amountToSettle = newAmount;
                            lumpData.chargebackAmount = chargeback.amount;
                            groupList.push(lumpData)
                        }

                    }

                    else {

                        if (payout && dateIsEqual(payout.date, today.ISO)) {

                            let lumpList = await this.calculateLumpSum(group);
                            let lumpData = await this.mergeLumpSum(business, lumpList)
                            let newAmount = await this.deductChargeback(lumpData, chargeback.amount);

                            if (newAmount > 0) {
                                // chargeback must have been deducted if needed here
                                lumpData.amountToSettle = newAmount;
                                lumpData.chargebackAmount = chargeback.amount;
                                groupList.push(lumpData)
                            }

                        }

                    }

                }


            }

        }

        return groupList;

    }

    /**
     * @name settleBusiness
     * @param data 
     */
    private async settleBusiness(data: SettleLumpSumDTO): Promise<ISettlementAnalytics> {

        let response: IResult = { error: false, message: '', code: 200, data: null }
        const { business, provider, settlement, amount, group } = data;

        const wallet: IWalletDoc = business.wallet;
        const settings: ISettingDoc = business.settings;
        const user: IUserDoc = business.user;
        let analytics = data.analytics;
        const account = BusinessService.getAccontByProvider(business.accounts, provider.name)
        let destination = settings.settlement.settleInto;

        // create settlement transaction
        let transaction = await TransactionService.createSettledTransaction({
            type: 'credit',
            isSubaccount: false,
            amount: toDecimal(amount, 2),
            business: business,
            provider: provider,
            settings: settings,
            settlement: settlement,
            wallet: wallet,
            feature: TransactionFeatureType.BANK_SETTLEMENT
        });

        if (settings.settlement.settleInto === SettleIntoType.WALLET) {

            // update wallet
            await WalletService.updateWalletSettledAmount(wallet, transaction);

            // update transaction
            transaction.status = TransactionStatus.SUCCESSFUL
            transaction.channel = TransactionChannelType.WALLET_SETTLEMENT;
            transaction.narration = `Settlement of NGN${transaction.amount.toLocaleString()} into wallet`
            transaction.description = transaction.narration;
            transaction.settle.destination = SettleIntoType.WALLET;
            await transaction.save();

            // update analytics
            if (!arrayIncludes(analytics.settled.businesses, business._id.toString())) {
                analytics.settled.businesses.push(business._id);
            }

            analytics.businesses = analytics.settled.businesses.length;
            analytics.settled.amount = analytics.settled.amount + transaction.amount;

            // mark transactions as settled
            await this.markTransactionsAsSettled({ business: business, group: group, settlement: settlement });

            // send wallet settled email
            await WalletService.sendCreditTransferEmail({
                account,
                business,
                transaction: transaction,
                user
            });

            //TODO: LOG Audit for success

        }

        else if (settings.settlement.settleInto === SettleIntoType.BANK) {

            let name = business.name;
            const bank = business.bank;

            response = await BaniService.payoutToBankNGN({
                amount: toDecimal(transaction.amount, 2),
                receiverType: 'personal',
                accountName: bank.accountName,
                accountNo: bank.accountNo,
                bankCode: bank.bankCode,
                currency: wallet.currency,
                reference: transaction.reference,
                narration: `Settlement of NGN${toDecimal(transaction.amount, 2).toLocaleString()} from Vacepay to ${name}`,
            });

            if (response.error) {
                //TODO: LOG Audit for error
                transaction.status = TransactionStatus.FAILED;
                transaction.channel = TransactionChannelType.BANK_TRANSFER;
                transaction.description = transaction.narration;
                transaction.settle.destination = SettleIntoType.BANK;
                await transaction.save();
            }

            if (!response.error) {

                // update transaction
                // transaction.status = TransactionStatus.SUCCESSFUL // status is updated in webhook
                transaction.channel = TransactionChannelType.BANK_TRANSFER;
                transaction.description = transaction.narration;
                transaction.settle.destination = SettleIntoType.BANK;
                await transaction.save();

                // update analytics
                if (!arrayIncludes(analytics.settled.businesses, business._id.toString())) {
                    analytics.settled.businesses.push(business._id);
                }
                analytics.businesses = analytics.settled.businesses.length;
                analytics.settled.amount = analytics.settled.amount + transaction.amount;

                // mark transactions as settled
                await this.markTransactionsAsSettled({ business: business, group: group, settlement: settlement });

                // send bank settled email
                await WalletService.sendBankSettledEmail({
                    account,
                    business,
                    transaction: transaction,
                    user
                });

                //TODO: LOG Audit for success

            }

        }

        return analytics;

    }

    /**
     * @name settleSubaccounts
     * @param data 
     * @returns 
     */
    private async settleSubaccounts(data: SettleSubaccountsDTO): Promise<ISettlementAnalytics> {

        let response: IResult = { error: false, message: '', code: 200, data: null }

        let { business, provider, settlement, subaccounts, analytics } = data;
        const wallet: IWalletDoc = business.wallet;
        const settings: ISettingDoc = business.settings;

        for (let i = 0; i < subaccounts.length; i++) {

            let subaccData = subaccounts[i];
            let subaccount = await Subaccount.findOne({ code: subaccData.code });

            // @ts-ignore: Object is possibly 'null'.
            if (subaccount && subaccount !== null && subaccData.amount > 0) {

                // @ts-ignore: Object is possibly 'null'.
                let exist = analytics.settled.subaccounts.find((x) => x.toString() === subaccount._id.toString());

                // ensure to settle only subaccount that has not been settled
                if (!exist) {

                    // create settlement transaction
                    let transaction = await TransactionService.createSettledTransaction({
                        type: 'credit',
                        isSubaccount: true,
                        subaccount: subaccount,
                        amount: toDecimal(subaccData.amount, 2),
                        business: business,
                        provider: provider,
                        settings: settings,
                        settlement: settlement,
                        wallet: wallet,
                        feature: TransactionFeatureType.BANK_SETTLEMENT
                    });

                    if (provider.name === ProviderNameType.BANI) {

                        response = await BaniService.payoutToBankNGN({
                            amount: toDecimal(transaction.amount, 2),
                            receiverType: 'personal',
                            accountName: subaccount.bank.accountName,
                            accountNo: subaccount.bank.accountNo,
                            bankCode: subaccount.bank.bankCode,
                            currency: wallet.currency,
                            reference: transaction.reference,
                            narration: `Settlement of NGN${toDecimal(transaction.amount, 2).toLocaleString()} from Vacepay to ${subaccount.bank.accountName} via ${business.name}`,
                        });

                        if (response.error) {
                            //TODO: LOG Audit for error
                            transaction.status = TransactionStatus.FAILED;
                            transaction.channel = TransactionChannelType.BANK_TRANSFER;
                            transaction.description = transaction.narration;
                            transaction.settle.destination = SettleIntoType.BANK;
                            await transaction.save();
                        }

                        if (!response.error) {

                            // update transaction
                            // transaction.status = TransactionStatus.SUCCESSFUL // update status in webhook
                            transaction.channel = TransactionChannelType.BANK_TRANSFER;
                            transaction.description = transaction.narration;
                            transaction.settle.destination = SettleIntoType.BANK;
                            await transaction.save();
                            
                            // update analytics
                            if (!arrayIncludes(analytics.settled.subaccounts, subaccount._id.toString())) {
                                analytics.settled.subaccounts.push(subaccount._id);
                            }
                            analytics.subaccounts = analytics.settled.subaccounts.length;
                            analytics.settled.shared = analytics.settled.shared + transaction.amount;

                            //TODO: LOG Audit for success

                        }

                    }

                }

            }

        }

        return analytics;

    }

    /**
     * @name markAsSettled
     * @param data 
     */
    private async markTransactionsAsSettled(data: MarkAsSettledDTO): Promise<void> {

        const { settlement, group, business } = data;
        const linkList = group.paymentLinks;

        for (let i = 0; i < linkList.length; i++) {

            await Transaction.updateMany(
                {
                    business: business._id,
                    settlement: settlement._id,
                    payment: linkList[i],
                    status: TransactionStatus.SUCCESSFUL,
                    feature: TransactionFeatureType.PAYMENT_LINK,
                    "settle.status": SettlementStatus.PENDING,
                },
                {
                    $set: {
                        "settle.status": SettlementStatus.COMPLETED,
                        "settle.settledAt": dateToday(Date.now()).ISO
                    }
                }
            );

        }

    }

    /**
     * @name processRunSettlement
     * @param data 
     */
    public async processRunSettlement(data: ProcessRunSettlementDTO): Promise<{ analytics: ISettlementAnalytics, groups: Array<ISettlementLump> }> {

        const { groups, settlement, provider } = data;
        let analytics = settlement.analytics;

        for (let i = 0; i < groups.length; i++) {

            let group = groups[i];

            // ensure settlement runs only if there are 
            // payment links and transactions
            if (group.paymentLinks.length > 0 && group.transactions.length > 0) {

                // settle the subaccounts first
                if (group.subaccounts.length > 0) {

                    analytics = await this.settleSubaccounts({
                        business: group.business,
                        provider: provider,
                        settlement: settlement,
                        subaccounts: group.subaccounts,
                        analytics: analytics
                    });

                }

                // settle business { main-account }
                analytics = await this.settleBusiness({
                    amount: group.amountToSettle,
                    analytics: analytics,
                    business: group.business,
                    provider: provider,
                    settlement: settlement,
                    group: group
                });

                // update analytics 
                analytics.transactions = group.transactions.length;
                analytics.paymentLinks = group.paymentLinks.length;

                // deduct amountSettled + totalShared from wallet settlement
                let totalSettled = analytics.settled.amount + analytics.settled.shared;
                await WalletService.deductFromSettlement(group.business.wallet, totalSettled);

            }


        }

        return { analytics, groups };

    }

    /**
     * @name runLumpSettlement
     * @param settlementId 
     */
    public async runLumpSettlement(data: RunLumpSettlementDTO): Promise<void> {

        const { settlementId, forceRun, addPast } = data;

        const settlement = await SettlementRepository.findById(settlementId, false);
        const adminWallet = await VacepayService.getAdminWallet()
        const provider = await ProviderService.getProviderFromList('bank');

        if (settlement && adminWallet && (settlement.status === SettlementStatus.PENDING || settlement.status === SettlementStatus.PROCESSING)) {

            const totalAmount = settlement.totalAmount;

            // get all settlements organized
            const lumpList = await this.processGroups({
                type: 'bulk',
                settlement: settlement,
                addPast: addPast,
                forceRun: forceRun,
                provider: provider!
            });

            if (lumpList.length > 0) {

                // process run settlement
                const settled = await this.processRunSettlement({
                    groups: lumpList,
                    provider: provider!,
                    settlement: settlement
                });

                const analytics = settled.analytics;
                const groups = settled.groups;

                console.log("ANALYTICS")
                await console.log(analytics)
                console.log("================")

                // get the settled amount
                const settledAmount = analytics.settled.amount + analytics.settled.shared;

                // update admin wallet => remove amount settled
                await VacepayService.updateWalletSettlement(adminWallet, settledAmount);

                // update settlement analytics & stop running
                settlement.analytics = analytics;
                settlement.isRunning = false; // stop running

                await console.log('total', totalAmount)
                await console.log('settled', settledAmount)

                // update settlement dates and status
                const today = dateToday(Date.now())
                const runAt = formatISO(today.ISO);

                // today
                let due = await this.getDueSettlementOverview({
                    type: 'today',
                    settlement,
                });

                // past
                let past = await this.getDueSettlementOverview({
                    type: 'past',
                    settlement,
                });

                /**
                 * check if settlement is completely settled
                 * add condition settledAmount >= totalAmount if needed
                 */
                if (analytics.settled.businesses.length === settlement.overview.businesses) {
                    const formatted = formatISO(today.ISO);

                    settlement.status = SettlementStatus.COMPLETED;
                    settlement.isSettled = true;
                    settlement.settledAt = {
                        date: formatted.date,
                        time: formatted.time,
                        ISO: today.ISO
                    }
                    settlement.lastRunAt = {
                        date: runAt.date,
                        time: runAt.time,
                        ISO: today.ISO
                    }

                    settlement.overview.dueToday = {
                        amount: due.amount,
                        businesses: due.count
                    }

                    settlement.overview.pastDue = {
                        amount: past.amount,
                        businesses: past.count
                    }

                    await settlement.save();

                    // create run history {Runsettle} for settlement
                    await this.createRunHistory({ analytics, groups: groups, settlement })
                }

                else {

                    settlement.status = SettlementStatus.PROCESSING;
                    settlement.isSettled = false;
                    settlement.lastRunAt = {
                        date: runAt.date,
                        time: runAt.time,
                        ISO: today.ISO
                    }

                    settlement.overview.dueToday = {
                        amount: due.amount,
                        businesses: due.count
                    }

                    settlement.overview.pastDue = {
                        amount: past.amount,
                        businesses: past.count
                    }

                    await settlement.save();

                    // create run history {Runsettle} for settlement
                    await this.createRunHistory({ analytics, groups: groups, settlement })
                }


            } else {

                // update settlement dates and status
                const today = dateToday(Date.now())
                const runAt = formatISO(today.ISO);

                settlement.isRunning = false;
                settlement.lastRunAt = {
                    date: runAt.date,
                    time: runAt.time,
                    ISO: today.ISO
                }
                await settlement.save();

            }


        }

    }

    /**
     * @name runLumpBusinessSettlement
     * @param settlementId 
     * @param business 
     */
    public async runLumpBusinessSettlement(data: RunBusinessSettlementDTO): Promise<void> {

        const { businessId, forceRun, settlementId } = data;

        const settlement = await SettlementRepository.findById(settlementId, false);
        const adminWallet = await VacepayService.getAdminWallet()
        const provider = await ProviderService.getProviderFromList('bank');
        const business = await BusinessRepository.findById(businessId, true);

        if (settlement && business && adminWallet && (settlement.status === SettlementStatus.PENDING || settlement.status === SettlementStatus.PROCESSING)) {

            const totalAmount = settlement.totalAmount;

            // get all settlements organized
            const lumpList = await this.processGroups({
                type: 'single',
                settlement: settlement,
                addPast: false,
                forceRun: forceRun,
                provider: provider!,
                businessId: business._id
            });

            if (lumpList.length > 0) {

                // for(let i = 0; i < lumpList.length; i++){

                //     await console.log(lumpList[i])

                // }

                // process run settlement
                const settled = await this.processRunSettlement({
                    groups: lumpList,
                    provider: provider!,
                    settlement: settlement
                });

                const analytics = settled.analytics;
                const groups = settled.groups;

                console.log("ANALYTICS")
                await console.log(analytics)
                console.log("================")

                // get the settled amount
                const settledAmount = analytics.settled.amount + analytics.settled.shared;

                // update admin wallet => remove amount settled
                await VacepayService.updateWalletSettlement(adminWallet, settledAmount);

                // update settlement analytics & stop running
                settlement.analytics = analytics;
                settlement.isRunning = false; // stop running

                await console.log('total', totalAmount)
                await console.log('settled', settledAmount)

                // update settlement dates and status
                const today = dateToday(Date.now())
                const runAt = formatISO(today.ISO);

                // today
                let due = await this.getDueSettlementOverview({
                    type: 'today',
                    settlement,
                });

                // past
                let past = await this.getDueSettlementOverview({
                    type: 'past',
                    settlement,
                });

                /**
                 * check if settlement is completely settled
                 * add condition settledAmount >= totalAmount if needed
                 */
                if (analytics.settled.businesses.length === settlement.overview.businesses) {

                    const formatted = formatISO(today.ISO);

                    settlement.status = SettlementStatus.COMPLETED;
                    settlement.isSettled = true;
                    settlement.settledAt = {
                        date: formatted.date,
                        time: formatted.time,
                        ISO: today.ISO
                    }
                    settlement.lastRunAt = {
                        date: runAt.date,
                        time: runAt.time,
                        ISO: today.ISO
                    }

                    settlement.overview.dueToday = {
                        amount: due.amount,
                        businesses: due.count
                    }

                    settlement.overview.pastDue = {
                        amount: past.amount,
                        businesses: past.count
                    }

                    await settlement.save();

                    // create run history {Runsettle} for settlement
                    await this.createRunHistory({ analytics, groups: groups, settlement })

                } else {

                    settlement.status = settlement.status;
                    settlement.isSettled = false;
                    settlement.lastRunAt = {
                        date: runAt.date,
                        time: runAt.time,
                        ISO: today.ISO
                    }

                    settlement.overview.dueToday = {
                        amount: due.amount,
                        businesses: due.count
                    }

                    settlement.overview.pastDue = {
                        amount: past.amount,
                        businesses: past.count
                    }

                    await settlement.save();

                    // create run history {Runsettle} for settlement
                    await this.createRunHistory({ analytics, groups: groups, settlement })
                }

            } else {

                // update settlement dates and status
                const today = dateToday(Date.now())
                const runAt = formatISO(today.ISO);

                settlement.isRunning = false;
                settlement.lastRunAt = {
                    date: runAt.date,
                    time: runAt.time,
                    ISO: today.ISO
                }
                await settlement.save();
            }

        }

    }

    /**
     * @name defineFilterQuery
     * @param data 
     * @returns 
     */
    public defineFilterQuery(data: FilterSettlementDTO): Array<any> {

        let result: Array<any> = [];

        if (!notDefined(data.status)) {
            result.push({ "status": data.status })
        }

        if (!notDefined(data.isRunning, true)) {
            result.push({ "isRunning": data.isRunning })
        }

        if (!notDefined(data.isSettled, true)) {
            result.push({ "isSettled": data.isSettled })
        }

        return result;

    }

    /**
     * @name getOverview
     * @param user 
     * @returns 
     */
    public async getOverview(user: IUserDoc): Promise<IOverview> {

        let total: number = 0,
            completed: number = 0,
            pending: number = 0,
            transactions: number = 0,
            value: number = 0;

        if (user.userType === UserType.ADMIN || user.userType === UserType.SUPER) {

            total = await Settlement.countDocuments();
            completed = await Settlement.countDocuments({ status: TransactionStatus.COMPLETED })
            pending = await Settlement.countDocuments({ status: TransactionStatus.PENDING })

            const links = await Settlement.find({});

            links.forEach((x: any) => {
                value = value + x.totalAmount;
            });

            links.forEach((x: any) => {
                transactions = transactions + x.transactions.length;
            });

        }

        return {
            total,
            completed,
            pending,
            transactions,
            value
        }

    }

}

export default new SettlementService();