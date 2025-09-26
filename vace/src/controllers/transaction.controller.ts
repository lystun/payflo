import crypto from 'crypto';
import mongoose, { ObjectId, Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { asyncHandler, strIncludesEs6, arrayIncludes, isString, dateToday, leadingNum } from '@btffamily/vacepay'
import { generate } from '../utils/random.util';
import { uploadBase64File } from '../utils/google.util'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import User from '../models/User.model'

import nats from '../events/nats';
import { NewAuditDTO } from '../dtos/audit.dto';
import SystemService from '../services/system.service';
import Business from '../models/Business.model';
import { IBusinessDoc, IPagination, IProviderDoc, IResult, ISearchQuery, ISettingDoc, ITransactionDoc, IUserDoc, IWalletDoc } from '../utils/types.util';
import { advanced, search } from '../utils/result.util';
import Account from '../models/Account.model';
import Transaction from '../models/Transaction.model';
import InitiateRefund from '../services/provider.service';
import { FilterTransactionDTO } from '../dtos/transaction.dto';
import TransactionService from '../services/transaction.service';
import TransactionRepository from '../repositories/transaction.repository';
import { TransactionFeatureType, TransactionStatus, UserType } from '../utils/enums.util';
import userService from '../services/user.service';
import Card from '../models/Card.model';
import chargebackRepository from '../repositories/chargeback.repository';
import CardService from '../services/card.service';
import businessService from '../services/business.service';
import WalletService from '../services/wallet.service';
import { ExportTransactionDTO } from '../dtos/export.dto';
import { exportTransactionJob } from '../queues/jobs/transaction.job';

/**
 * @name getTransactions
 * @description Get reource from database
 * @route GET /vace/v1/transactions
 */
export const getTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json(res.advancedResults);
});

export const filterDate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let chargebacks: any = null
    const user = await User.findOne({ _id: req.user._id });
    
    if(user){
        chargebacks = await chargebackRepository.aggregateTotalPending(user)
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: chargebacks.data ? chargebacks.data : chargebacks,
        message: 'successful',
        status: 200
    })

});

/**
 * @name getTransaction
 * @description Get reource from database
 * @route GET /vace/v1/transactions/:id
 */
export const getTransaction = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const transaction = await TransactionRepository.findById(req.params.id, true)

    if (!transaction) {
        return next(new ErrorResponse('Error', 404, ['transaction does not exist']))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: transaction,
        message: 'successful',
        status: 200
    })

});

/**
 * @name getTransactionByReference
 * @description Get reource from database
 * @route GET /vace/v1/transactions/:ref
 */
export const getTransactionByReference = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let transaction: ITransactionDoc | null = null;

    transaction = await TransactionRepository.findByReference(req.params.ref, true)

    if (!transaction) {
        return next(new ErrorResponse('Error', 404, ['transaction does not exist']))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: transaction,
        message: 'successful',
        status: 200
    })

});

/**
 * @name getCardData
 * @description Get a reource from database
 * @route GET /vace/v1/transactions/card-data/:ref
 * @access Superadmin | Admin
 */
export const getCardData = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let resultData: any = {};
    const transaction = await TransactionRepository.findByReference(req.params.ref, false);

    if (!transaction) {
        return next(new ErrorResponse('Error', 404, ['transaction does not exist']))
    }

    if (transaction.feature !== TransactionFeatureType.PAYMENT_LINK) {
        return next(new ErrorResponse('Error', 404, ['card information not found']))
    }

    const card = await Card.findOne({ transaction: transaction._id }).select('+cardData');

    if (!card) {
        return next(new ErrorResponse('Error', 404, ['card information not found']))
    }

    // decrypt card data
    const decrypt = await SystemService.decryptData({
        payload: card.cardData,
        separator: '-',
        password: transaction.reference
    });

    if (!decrypt.error) {

        const panCrypt: any = {}

        resultData = {
            pan: panCrypt,
            expiryMonth: decrypt.data.expiryMonth,
            expiryYear: decrypt.data.expiryYear
        }

    }


    res.status(200).json({
        error: false,
        errors: [],
        data: resultData,
        message: 'successful',
        status: 200
    })

})

/**
 * @name syncTransactions
 * @description Get reource from database
 * @route POST /vace/v1/transactions/sync
 */
export const syncTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const allowed = ['card', 'bank', 'bills']
    const { type } = req.body;

    if (!type) {
        return next(new ErrorResponse('Error', 400, ['sync type is required']))
    }

    if (!arrayIncludes(allowed, type)) {
        return next(new ErrorResponse('Error', 400, [`invalid sync type. choose from ${allowed.join(',')}`]))
    }

    if (type === 'card') {
        // updateCardTransactionJob()
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            status: 'success'
        },
        message: 'successful',
        status: 200
    })

});

/**
 * @name verifyTransaction
 * @description Get reource from database
 * @route POST /vace/v1/transactions/verify
 */
export const verifyTransaction = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { reference } = req.body;

    if (!reference) {
        return next(new ErrorResponse('Error', 400, ['reference is required']))
    }

    const transaction = await TransactionRepository.findByReference(reference, true)

    if (!transaction) {
        return next(new ErrorResponse('Error', 404, ['transaction does not exist']))
    }

    // TODO: verify transaction by provider ( i.e. call provider API )

    res.status(200).json({
        error: false,
        errors: [],
        data: transaction,
        message: 'successful',
        status: 200
    })

});

/**
 * @name cancelTransaction
 * @description Get reource from database
 * @route POST /vace/v1/transactions/cancel
 */
export const cancelTransaction = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { reference } = req.body;

    if (!reference) {
        return next(new ErrorResponse('Error', 400, ['reference is required']))
    }

    const transaction = await Transaction.findOne({ reference: reference });

    if (!transaction) {
        return next(new ErrorResponse('Error', 404, ['transaction does not exist']))
    }

    if (transaction.feature !== TransactionFeatureType.PAYMENT_LINK) {
        return next(new ErrorResponse('Error', 403, ['cannot change transaction status']))
    }

    if (transaction.status === TransactionStatus.PENDING) {
        transaction.status = TransactionStatus.CANCELLED;
        await transaction.save();
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            status: transaction.status
        },
        message: 'successful',
        status: 200
    })

});

/**
 * @name failTransaction
 * @description Get reource from database
 * @route POST /vace/v1/transactions/fail
 */
export const failTransaction = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { reference } = req.body;

    if (!reference) {
        return next(new ErrorResponse('Error', 400, ['reference is required']))
    }

    const transaction = await Transaction.findOne({ reference: reference });

    if (!transaction) {
        return next(new ErrorResponse('Error', 404, ['transaction does not exist']))
    }

    if (transaction.feature !== TransactionFeatureType.PAYMENT_LINK) {
        return next(new ErrorResponse('Error', 403, ['cannot change transaction status']))
    }

    if (transaction.status === TransactionStatus.PENDING) {
        transaction.status = TransactionStatus.FAILED;
        await transaction.save();
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            status: transaction.status
        },
        message: 'successful',
        status: 200
    })

});

/**
 * @name cancelTransaction
 * @description Get reource from database
 * @route POST /vace/v1/transactions/reverse
 */
export const reverseTransactionAmount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let reverseTransaction: ITransactionDoc | null = null;
    const { reference } = req.body;

    if (!reference) {
        return next(new ErrorResponse('Error', 400, ['reference is required']))
    }

    const transaction = await TransactionRepository.findByReferenceAndSelectRevenue(reference, true);

    if (!transaction) {
        return next(new ErrorResponse('Error', 404, ['transaction does not exist']))
    }

    if (transaction.status !== TransactionStatus.FAILED) {
        return next(new ErrorResponse('Error', 403, [`transaction is currently ${transaction.status}`]))
    }

    const business: IBusinessDoc = transaction.business
    const settings: ISettingDoc = business.settings;
    const wallet: IWalletDoc = business.wallet;
    const provider: IProviderDoc = transaction.provider;
    const account = businessService.getAccontByProvider(business.accounts, provider.name);

    if (transaction.feature === TransactionFeatureType.WALLET_BILL ||
        transaction.feature === TransactionFeatureType.WALLET_AIRTIME ||
        transaction.feature === TransactionFeatureType.WALLET_DATA ||
        transaction.feature === TransactionFeatureType.WALLET_VAS) {

           reverseTransaction = await WalletService.reverseMoneyToWallet({
                account,
                isWebhook: false,
                provider,
                transaction,
                wallet,
                business,
                addFee: false
            });
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: reverseTransaction ? reverseTransaction : null,
        message: 'successful',
        status: 200
    })

});

/**
 * @name searchTransactions
 * @description Get a reource from database
 * @route POST /vace/v1/transactions/search
 * @access Superadmin | Admin
 */
export const searchTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { reference } = req.body;

    if (!reference) {
        return next(new ErrorResponse('Error', 400, [`reference is required`]))
    }

    const pop = [
        { path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
    ]

    const query: ISearchQuery = {
        model: Transaction,
        ref: null,
        value: null,
        data: [
            { reference: { $regex: reference, $options: 'i' } },
            { reference: { $regex: reference, $options: 'i' } },
            { providerRef: { $regex: reference, $options: 'i' } },
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
 * @name filterTransactions
 * @description Get a reource from database
 * @route POST /vace/v1/transactions/filter
 * @access Superadmin | Admin
 */
export const filterTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as FilterTransactionDTO;
    const { type } = req.body as FilterTransactionDTO;
    let result: IPagination = { count: 0, total: 0, data: [], pagination: { next: { limit: 0, page: 1 }, prev: { limit: 0, page: 1 } } }
    let analytics: any = {};

    // define basic parameters
    const filters = TransactionService.defineFilterQuery(body);
    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]

    // process normal filter
    if (!type) {

        const query: ISearchQuery = {
            model: Transaction,
            ref: null,
            value: null,
            data: filters.length > 0 ? filters : [{ status: TransactionStatus.SUCCESSFUL }],
            query: null,
            queryParam: req.query,
            populate: pop,
            operator: 'and'
        }

        result = await search(query); // search from DB

    }

    if (type) {

        const validate = await TransactionService.validateFilterSelect(body);

        if (validate.error) {
            return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
        }

        // get loggedIn user
        const loggedIn = await userService.getLoggedInUser({ req, isAdmin: true });
        const user: IUserDoc = loggedIn.data.user;

        // define request query params
        const params = await TransactionService.defineFilterDateRange(body);

        // set the params
        req.query.from = params.from
        req.query.to = params.to;

        // search
        const query: ISearchQuery = {
            model: Transaction,
            ref: null,
            value: null,
            data: filters,
            query: null,
            queryParam: req.query,
            populate: pop,
            operator: 'and'
        }

        result = await search(query); // search from DB
        analytics = await TransactionRepository.aggregateFilterAnalytics({ user, dates: params })

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
 * @name exportTransactions
 * @description Get a reource from database
 * @route POST /terra/v1/transactions/export
 * @access Superadmin | Admin
 */
export const exportTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as ExportTransactionDTO;

    // define basic parameters
    const filters = TransactionService.defineExportQuery(body);
    const pop = [
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

    const validate = await TransactionService.validateExportSelect(body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    // get loggedIn user
    const loggedIn = await userService.getLoggedInUser({ req, isAdmin: true });
    const user: IUserDoc = loggedIn.data.user;

    // define request query params
    const params = await TransactionService.defineExportDateRange(body);

    // set the params
    req.query.from = params.from
    req.query.to = params.to;

    let business = await Business.findOne({ email: process.env.SUPERADMIN_EMAIL });

    if (business && (user.userType === UserType.SUPER || user.userType === UserType.ADMIN)) {

        exportTransactionJob({
            email: user.email,
            business: business,
            params: params,
            filters: filters,
            populate: pop,
            queryParam: req.query,
            isAdmin: true
        })

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: [],
        message: 'successful',
        status: 200
    })

})

