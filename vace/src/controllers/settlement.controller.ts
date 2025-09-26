import crypto from 'crypto';
import mongoose, { FilterQuery } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { asyncHandler, checkDateFormat, formatISO, isDefined, strIncludesEs6 } from '@btffamily/vacepay'
import { generate } from '../utils/random.util';
import { uploadBase64File } from '../utils/google.util'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import { IPagination, ISearchQuery, IUserDoc } from '../utils/types.util';
import { advanced, search } from '../utils/result.util';
import Settlement from '../models/Settlement.model';
import { FilterBusinessTransactionDTO, FilterSettlementDTO, RunSettlementDTO } from '../dtos/settlement.dto';
import SettlementService from '../services/settlement.service';
import Transaction from '../models/Transaction.model';
import { FilterTransactionDTO } from '../dtos/transaction.dto';
import TransactionService from '../services/transaction.service';
import { SettlementStatus, SettlementType, TransactionFeatureType } from '../utils/enums.util';
import SettlementRepository from '../repositories/settlement.repository';
import VacepayService from '../services/vacepay.service';
import { runBusinessSettlementJob, runSettlementJob } from '../queues/jobs/settlement.job';
import Business from '../models/Business.model';
import TransactionRepository from '../repositories/transaction.repository';
import UserService from '../services/user.service';
import SettlementHistory from '../models/SettlementHistory.model';
import BusinessRepository from '../repositories/business.repository';

/**
 * @name getSettlements
 * @description Get reource from database
 * @route GET /vace/v1/settlements
 */
export const getSettlements = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json(res.advancedResults);
});

/**
 * @name getSettlement
 * @description Get a reource from database
 * @route GET /vace/v1/settlements/:id
 */
export const getSettlement = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let settlement = await SettlementRepository.findById(req.params.id, false)

    if (!settlement) {
        return next(new ErrorResponse('Error', 404, ['settlement does not exist']))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: settlement,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getSettlementByCode
 * @description Get a reource from database
 * @route GET /vace/v1/settlements/by-code?code=
 */
export const getSettlementByCode = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const code = req.query.code as string;

    if (!code) {
        return next(new ErrorResponse('Error', 400, ['code is required']))
    }

    const settlement = await SettlementRepository.findByCode(code, true)

    if (!settlement) {
        return next(new ErrorResponse('Error', 404, ['settlement does not exist']))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: settlement,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getSettlementByDate
 * @description Get a reource from database
 * @route GET /vace/v1/settlements/by-date?date=
 */
export const getSettlementByDate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const date = req.query.date as string;

    if (!date) {
        return next(new ErrorResponse('Error', 400, ['date is required']))
    }

    if (!checkDateFormat(date)) {
        return next(new ErrorResponse('Error', 400, ['invalid date format. use YYYY-MM-DD']))
    }

    if (!strIncludesEs6(date, '-')) {
        return next(new ErrorResponse('Error', 400, ['invalid date format. use YYYY-MM-DD']))
    }

    const settlement = await SettlementRepository.findByDate(date, true);

    if (!settlement) {
        return next(new ErrorResponse('Error', 404, ['settlement does not exist']))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: settlement,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getSettlementBusinesses
 * @description Get a reource from database
 * @route GET /vace/v1/settlements/businesses/:id
 */
export const getSettlementBusinesses = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const settlement = await SettlementRepository.findById(req.params.id, false);

    if (!settlement) {
        return next(new ErrorResponse('Error', 404, ['settlement does not exist']))
    }

    // set query params
    let param: any = {};
    Object.assign(param, req.query)
    param.paginate = 'relative'

    const query: ISearchQuery = {
        model: Business,
        ref: null,
        value: null,
        data: { _id: { $in: settlement.businesses } },
        query: null,
        queryParam: param,
        populate: [],
        operator: 'in'
    }

    const result = await search(query); // search from DB

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        data: result.data,
        pagination: result.pagination,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getSettlementHistories
 * @description Get a reource from database
 * @route GET /vace/v1/settlements/histories/:id
 */
export const getSettlementHistories = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const settlement = await SettlementRepository.findById(req.params.id, false);

    if (!settlement) {
        return next(new ErrorResponse('Error', 404, ['settlement does not exist']))
    }

    // set query params
    let param: any = {};
    Object.assign(param, req.query)
    param.paginate = 'relative'

    const query: ISearchQuery = {
        model: SettlementHistory,
        ref: 'settlement',
        value: settlement._id,
        data: {},
        query: null,
        queryParam: param,
        populate: [],
        operator: null
    }

    const result = await search(query); // search from DB

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        data: result.data,
        pagination: result.pagination,
        message: 'successful',
        status: 200
    })

})

/**
 * @name searchSettlements
 * @description Get a reource from database
 * @route POST /vace/v1/settlements/search
 * @access Superadmin | Admin
 */
export const searchSettlements = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { code } = req.body;

    if (!code) {
        return next(new ErrorResponse('Error', 400, [`settlement code is required`]))
    }

    const pop = [
        {
            path: 'transactions', populate: [
                { path: 'provider' },
                { path: 'business' }
            ]
        }
    ]

    const query: ISearchQuery = {
        model: Settlement,
        ref: null,
        value: null,
        data: [
            { code: { $regex: code, $options: 'i' } },
        ],
        query: null,
        queryParam: req.query,
        populate: pop,
        operator: 'or'
    }

    const result = await search(query); // search from DB

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        data: result.data,
        pagination: result.pagination,
        message: 'successful',
        status: 200
    })

})

/**
 * @name filterSettlements
 * @description Get a reource from database
 * @route POST /vace/v1/settlements/filter
 * @access Superadmin | Admin
 */
export const filterSettlements = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as FilterSettlementDTO;

    const filters = SettlementService.defineFilterQuery(body);

    const pop = [
        {
            path: 'transactions', populate: [
                { path: 'provider' },
                { path: 'business' }
            ]
        }
    ]

    const query: ISearchQuery = {
        model: Settlement,
        ref: null,
        value: null,
        data: filters,
        query: null,
        queryParam: req.query,
        populate: pop,
        operator: 'and'
    }

    const result = await search(query); // search from DB

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        data: result.data,
        pagination: result.pagination,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getBusinessAnalytics
 * @description Get a reource from database
 * @route POST /vace/v1/settlements/business-analytics
 */
export const getBusinessAnalytics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { code, businessId } = req.body;

    if(!code){
        return next(new ErrorResponse('Error', 400, ['settlement code is required']))
    }

    if(!businessId){
        return next(new ErrorResponse('Error', 400, ['business id is required']))
    }

    const settlement = await SettlementRepository.findByCode(code, false);

    if (!settlement) {
        return next(new ErrorResponse('Error', 404, ['settlement does not exist']))
    }

    const business = await BusinessRepository.findById(businessId, false);

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const analytics = await TransactionRepository.aggregateSettlementAnalytics({
        settlement,
        business
    })
    

    res.status(200).json({
        error: false,
        errors: [],
        data: analytics,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getSettlementTransactions
 * @description Get a reource from database
 * @route GET /terra/v1/settlements/transactions/:id
 */
export const getSettlementTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { type } = req.query;
    let filters: Array<any> = [];

    const settlement = await Settlement.findOne({ _id: req.params.id });

    if (!settlement) {
        return next(new ErrorResponse('Error', 404, ['settlement record does not exist']))
    }

    if(type && type === 'settled'){
        filters = [
            { feature: { $not: { $eq: TransactionFeatureType.PAYMENT_LINK } } }
        ]
    }else {
        filters = [
            { feature: TransactionFeatureType.PAYMENT_LINK }
        ]
    }

    const query: ISearchQuery = {
        model: Transaction,
        ref: 'settlement',
        value: settlement._id,
        data: filters,
        query: null,
        queryParam: req.query,
        populate: [],
        operator: 'and'
    }

    const result = await search(query);

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: result.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name filterTransactions
 * @description Get a reource from database
 * @route POST /vace/v1/settlements/filter-transactions/:id
 * @access Superadmin | Admin
 */
export const filterTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let analytics: any = {};
    let result: IPagination = { count: 0, total: 0, data: [], pagination: { next: { limit: 0, page: 1 }, prev: { limit: 0, page: 1 } } }

    const body = req.body as FilterTransactionDTO;
    const { type } = req.body as FilterTransactionDTO;

    const settlement = await Settlement.findOne({ _id: req.params.id });

    if (!settlement) {
        return next(new ErrorResponse('Error', 404, ['settlement record does not exist']))
    }

    const filters = TransactionService.defineFilterQuery(body);

    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]

    // process normal filter
    if (!type) {

        const query: ISearchQuery = {
            model: Transaction,
            ref: 'settlement',
            value: settlement._id,
            data: filters,
            query: null,
            queryParam: req.query,
            populate: pop,
            operator: 'and'
        }

        result = await search(query); // search from DB

    }


    // process filter and select 
    if (type) {

        const validate = await TransactionService.validateFilterSelect(body);

        if (validate.error) {
            return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
        }

        const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: true });
        const user: IUserDoc = loggedIn.data.user;

        // define request query params
        const params = await TransactionService.defineFilterDateRange(body);

        // set the query params
        req.query.from = params.from
        req.query.to = params.to;

        // search
        const query: ISearchQuery = {
            model: Transaction,
            ref: 'settlement',
            value: settlement._id,
            data: filters,
            query: null,
            queryParam: req.query,
            populate: pop,
            operator: 'and'
        }

        result = await search(query); // search from DB
        analytics = await TransactionRepository.aggregateFilterAnalytics({
            user,
            model: { settlement: settlement._id },
            dates: params
        })

    }


    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        data: {
            analytics: analytics,
            transactions: result.data
        },
        pagination: result.pagination,
        message: 'successful',
        status: 200
    })

})

/**
 * @name filterBusinessTransactions
 * @description Get a reource from database
 * @route POST /vace/v1/settlements/buisiness-transactions
 * @access Superadmin | Admin
 */
export const filterBusinessTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { businessId, settlementId } = req.body as FilterBusinessTransactionDTO;

    const settlement = await Settlement.findOne({ _id: settlementId });

    if (!settlement) {
        return next(new ErrorResponse('Error', 404, ['settlement record does not exist']))
    }

    const business = await Business.findOne({ _id: businessId });

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]

    const query: ISearchQuery = {
        model: Transaction,
        ref: 'settlement',
        value: settlement._id,
        data: [
            { business: business._id }
        ],
        query: null,
        queryParam: req.query,
        populate: pop,
        operator: 'and'
    }

    const result = await search(query); // search from DB
    const totalAmount = await TransactionRepository.aggregateSettlementAmount({
        settlement,
        business,
        status: SettlementStatus.PENDING
    })

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        data: {
            totalAmount: totalAmount,
            transactions: result.data
        },
        pagination: result.pagination,
        message: 'successful',
        status: 200
    })

})

/**
 * @name searchTransactions
 * @description Get a reource from database
 * @route POST /vace/v1/settlements/search-transactions/:id
 * @access Business
 */
export const searchTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { reference } = req.body;

    if (!reference) {
        return next(new ErrorResponse('Error', 400, [`reference is required`]))
    }

    const settlement = await Settlement.findOne({ _id: req.params.id });

    if (!settlement) {
        return next(new ErrorResponse('Error', 404, ['settlement record does not exist']))
    }

    const pop = [
        { path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
    ]

    const query: ISearchQuery = {
        model: Transaction,
        ref: 'settlement',
        value: settlement._id,
        data: [
            { reference: { $regex: reference, $options: 'i' } },
            { providerRef: { $regex: reference, $options: 'i' } },
            { reference: { $regex: reference, $options: 'i' } },
            { feature: { $regex: reference, $options: 'i' } },
        ],
        query: null,
        queryParam: req.query,
        populate: pop,
        operator: 'or'
    }

    const result = await search(query); // search from DB

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        data: result.data,
        pagination: result.pagination,
        message: 'successful',
        status: 200
    })

})

/**
 * @name runSettlement
 * @description Get a reource from database
 * @route POST /vace/v1/settlements/run/:id
 * @access Business
 */
export const runSettlement = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { businessId, type, forceRun, addPast } = req.body as RunSettlementDTO;

    const validate = await SettlementService.validateRunSettlement(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    const settlement = await SettlementRepository.findById(req.params.id);

    if (!settlement) {
        return next(new ErrorResponse('Error', 404, [`settlement does not exist`]))
    }

    // check if this settlement is currently runningt
    if (settlement.isRunning) {
        return next(new ErrorResponse('Error', 403, [`settlement is currently running`]))
    }

    // check if any other settlement is currently running
    const running = await Settlement.findOne({ isRunning: true });

    if (running) {
        const formated = formatISO(running.createdAt)
        return next(new ErrorResponse('Error', 403, [`settlement for ${formated.date} is currently running`]))
    }

    if (settlement.status === SettlementStatus.COMPLETED) {
        return next(new ErrorResponse('Error', 403, [`settlement is already completed`]))
    }

    const adminWallet = await VacepayService.getAdminWallet();

    if (!adminWallet) {
        return next(new ErrorResponse('Error', 500, [`an error occured. contact admin support`]))
    }

    if (type === SettlementType.BUSINESS) {

        if (!businessId) {
            return next(new ErrorResponse('Error', 400, [`business id is required`]))
        }

        const business = await Business.findOne({ _id: businessId })

        if (!business) {
            return next(new ErrorResponse('Error', 404, [`business does not exist`]))
        }

        const exist = settlement.analytics.settled.businesses.find((x) => x.toString() === business._id.toString());

        if (exist) {
            return next(new ErrorResponse('Error', 403, [`business has already been settled`]))
        }

        const totalAmount = await TransactionRepository.aggregateSettlementAmount({
            settlement,
            business,
            status: SettlementStatus.PENDING
        });

        if (totalAmount <= 0) {
            return next(new ErrorResponse('Error', 403, [`cannot settle NGN0 to business`]))
        }

        if (adminWallet.balance.available < totalAmount) {
            return next(new ErrorResponse('Error', 403, [`available balance is too low to run settlement`]))
        }

        // set the options
        const force = isDefined(forceRun) && forceRun ? forceRun : false;

        // run the settlement with queue
        runBusinessSettlementJob(settlement, business, force);

        // update settlement immediately
        settlement.isRunning = true;
        settlement.status = SettlementStatus.PROCESSING;
        await settlement.save();

    }

    if (type === SettlementType.FULL) {

        const total = settlement.totalAmount;
        const pastAmount = settlement.overview.dueToday.amount + settlement.overview.pastDue.amount;
        const dueAmount = settlement.overview.dueToday.amount;

        if (isDefined(forceRun) && forceRun === true) {

            if (adminWallet.balance.available < total) {
                return next(new ErrorResponse('Error', 403, [`available balance is too low to run settlement`]))
            }

        } else {

            if (isDefined(addPast) && addPast === true) {

                if (settlement.overview.pastDue.businesses <= 0) {
                    return next(new ErrorResponse('Error', 403, [`no business is due to be settled`]))
                }

                if (adminWallet.balance.available < pastAmount) {
                    return next(new ErrorResponse('Error', 403, [`available balance is too low to run settlement`]))
                }

            } else {

                if (settlement.overview.dueToday.businesses === 0) {
                    return next(new ErrorResponse('Error', 403, [`no business is due to be settled`]))
                }

                if (adminWallet.balance.available < dueAmount) {
                    return next(new ErrorResponse('Error', 403, [`available balance is too low to run settlement`]))
                }

            }

        }

        // set the options
        const force = isDefined(forceRun) && forceRun ? forceRun : false;
        const past = isDefined(addPast) && addPast ? addPast : false;

        // run the settlement with queue
        runSettlementJob(settlement, force, past);

        // update settlement immediately
        settlement.isRunning = true;
        settlement.status = SettlementStatus.PROCESSING;
        await settlement.save();

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            date: settlement.created.ISO,
            isRunning: settlement.isRunning,
            status: settlement.status
        },
        message: 'currently processing. you will be notified when done',
        status: 200
    })

})