import crypto from 'crypto';
import mongoose, { ObjectId, Model, Error } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { asyncHandler, strIncludesEs6, arrayIncludes, isString, Random, dateToday, isDefined } from '@btffamily/vacepay'
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
import BusinessService from '../services/business.service';
import { IAccountDoc, IBank, IBankDoc, IBusinessBank, IBusinessDoc, IPagination, IProductDoc, IProviderDoc, ISearchQuery, ISettingDoc, IUserDoc, IWalletDoc } from '../utils/types.util';
import Bank from '../models/Bank.model';
import BankService from '../services/bank.service';
import { BusinessType, HeaderType, TransactionFeatureType, TransactionStatus, UserType } from '../utils/enums.util';
import Card from '../models/Card.model';
import { advanced, search } from '../utils/result.util';
import Transaction from '../models/Transaction.model';
import { CreateBusinessBankDTO, FilterBusinessDTO, SetBusinessChargesDTO, UpdateSettingsDTO, UpdateSettlementBankDTO } from '../dtos/business.dto';
import ProviderService from '../services/provider.service';
import Beneficiary from '../models/Beneficiary.model';
import Account from '../models/Account.model';
import Product from '../models/Product.model';
import PaymentLink from '../models/PaymentLink.model';
import { FilterProductDTO } from '../dtos/product.dto';
import ProductService from '../services/product.service';
import { FilterPaymentLinkDTO } from '../dtos/payment.link.dto';
import PaymentLinkService from '../services/payment.link.service';
import { FilterTransactionDTO } from '../dtos/transaction.dto';
import TransactionService from '../services/transaction.service';
import EmailService from '../services/email.service';
import { ResolvedBankDTO } from '../dtos/provider.dto';
import Invoice from '../models/Invoice.model';
import { FilterInvoiceDTO } from '../dtos/invoice.dto';
import InvoiceService from '../services/invoice.service';
import Subaccount from '../models/Subaccount.model';
import { FilterSubaccountDTO } from '../dtos/subaccount.dto';
import SubaccountService from '../services/subaccount.service';
import UserService from '../services/user.service';
import BusinessRepository from '../repositories/business.repository';
import WebhookService from '../services/webhook.service';
import UserRepository from '../repositories/user.repository';
import TransactionRepository from '../repositories/transaction.repository';
import ENV from '../utils/env.util';
import Settlement from '../models/Settlement.model';
import { FilterSettlementDTO } from '../dtos/settlement.dto';
import SettlementService from '../services/settlement.service';
import SettlementRepository from '../repositories/settlement.repository';
import { exportTransactionJob } from '../queues/jobs/transaction.job';
import { ExportTransactionDTO } from '../dtos/export.dto';
import BankMapper from '../mappers/bank.mapper';
import { deleteUserJob } from '../queues/jobs/user.job';

/**
 * @name getBusinesses
 * @description Get reources from database
 * @route GET /vace/v1/businesses
 */
export const getBusinesses = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json(res.advancedResults);
})

/**
 * @name searchBusinesses
 * @description Get a reource from database
 * @route POST /vace/v1/businesses/search
 * @access Superadmin | Admin
 */
export const searchBusinesses = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { key } = req.body;

    if (!key) {
        return next(new ErrorResponse('Error', 400, [`search key is required`]))
    }

    const pop = [
        { path: 'user' },
        { path: 'settings' },
        {
            path: 'accounts', populate: [
                { path: 'provider' }
            ]
        },
    ]

    const query: ISearchQuery = {
        model: Business,
        ref: null,
        value: null,
        data: [
            { name: { $regex: key, $options: 'i' } },
            { displayName: { $regex: key, $options: 'i' } },
            { code: { $regex: key, $options: 'i' } },
            { businessID: { $regex: key, $options: 'i' } },
            { email: { $regex: key, $options: 'i' } },
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
        pagination: result.pagination,
        data: result.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name filterBusinesses
 * @description Get a reource from database
 * @route POST /vace/v1/businesses/filter
 * @access Superadmin | Admin
 */
export const filterBusinesses = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as FilterBusinessDTO;

    const filters = BusinessService.defineFilterQuery(body);

    const pop = [
        { path: 'user' },
        { path: 'settings' },
        {
            path: 'accounts', populate: [
                { path: 'provider' }
            ]
        },
    ]

    const query: ISearchQuery = {
        model: Business,
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
 * @name getBusiness
 * @description Get a reource from database
 * @route GET /vace/v1/businesses/:id
 */
export const getBusiness = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let business = await BusinessRepository.findById(req.params.id, true)

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: business,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getWebhookData
 * @description Get a reource from database
 * @route GET /vace/v1/businesses/webhook/:id
 */
export const getWebhookData = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let result: any = { url: '', isActive: false, createdAt: null };

    let business = await Business.findOne({ _id: req.params.id }).populate([{ path: 'user' }])

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const webhook = await WebhookService.getWebhookData(business.user);

    if (webhook && webhook.url) {

        result = {
            url: webhook.url,
            isActive: webhook.isActive,
            createdAt: webhook.createdAt
        }

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: result,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getWalletDetails
 * @description Get a reource from database
 * @route GET /vace/v1/businesses/wallet/:id
 */
export const getWalletDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const business = await Business.findOne({ _id: req.params.id }).populate([{ path: 'wallet' }]);

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const wallet: IWalletDoc = business.wallet;

    res.status(200).json({
        error: false,
        errors: [],
        data: wallet,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getWalletTransactions
 * @description Get a reource from database
 * @route GET /vace/v1/businesses/wallet-transactions/:id
 */
export const getWalletTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const business = await Business.findOne({ _id: req.params.id }).populate([{ path: 'wallet' }]);

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const result = await advanced(Transaction, [], 'status', req, 'wallet', business.wallet._id, null, 'absolute');

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
 * @name getAccountDetails
 * @description Get a reource from database
 * @route GET /vace/v1/businesses/accounts/:id
 */
export const getBusinessAccounts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const business = await Business.findOne({ _id: req.params.id })

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const pop = [
        { path: 'provider' },
        { path: 'business' }
    ]

    const result = await advanced(Account, pop, '', req, 'business', business._id, null, 'relative');

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
 * @name getBusinessProducts
 * @description Get a reource from database
 * @route GET /vace/v1/businesses/products/:id
 */
export const getBusinessProducts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const business = await Business.findOne({ _id: req.params.id })

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const pop: Array<any> = []

    const result = await advanced(Product, pop, '', req, 'business', business._id, null, 'relative');

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
 * @name searchProducts
 * @description Get a reource from database
 * @route POST /vace/v1/businesses/search-products/:id
 * @access Business
 */
export const searchProducts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { key } = req.body;

    if (!key) {
        return next(new ErrorResponse('Error', 400, [`search key is required`]))
    }

    const business = await Business.findOne({ _id: req.params.id })

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const pop = [
        { path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
    ]

    const query: ISearchQuery = {
        model: Product,
        ref: 'business',
        value: business._id,
        data: [
            { name: { $regex: key, $options: 'i' } },
            { code: { $regex: key, $options: 'i' } },
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
 * @name filterProducts
 * @description Get a reource from database
 * @route POST /vace/v1/businesses/filter-products/:id
 * @access Superadmin | Admin
 */
export const filterProducts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as FilterProductDTO;

    const business = await Business.findOne({ _id: req.params.id })

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const filters = ProductService.defineFilterQuery(body);

    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]

    const query: ISearchQuery = {
        model: Product,
        ref: 'business',
        value: business._id,
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
 * @name getBusinessPaymentLinks
 * @description Get a reource from database
 * @route GET /vace/v1/businesses/payment-links/:id
 */
export const getBusinessPaymentLinks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const business = await Business.findOne({ _id: req.params.id })

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const pop: Array<any> = []

    const result = await advanced(PaymentLink, pop, '', req, 'business', business._id, null, 'relative');

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
 * @name searchPaymentLinks
 * @description Get a reource from database
 * @route POST /vace/v1/businesses/search-links/:id
 * @access Business
 */
export const searchPaymentLinks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { key } = req.body;

    if (!key) {
        return next(new ErrorResponse('Error', 400, [`search key is required`]))
    }

    const business = await Business.findOne({ _id: req.params.id })

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const pop = [
        { path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
    ]

    const query: ISearchQuery = {
        model: PaymentLink,
        ref: 'business',
        value: business._id,
        data: [
            { name: { $regex: key, $options: 'i' } },
            { label: { $regex: key, $options: 'i' } },
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
 * @name filterPaymentLinks
 * @description Get a reource from database
 * @route POST /vace/v1/businesses/filter-links/:id
 * @access Superadmin | Admin
 */
export const filterPaymentLinks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as FilterPaymentLinkDTO;

    const business = await Business.findOne({ _id: req.params.id })

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const filters = PaymentLinkService.defineFilterQuery(body);

    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]

    const query: ISearchQuery = {
        model: PaymentLink,
        ref: 'business',
        value: business._id,
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
 * @name getBusinessSubaccounts
 * @description Get a reource from database
 * @route GET /vace/v1/businesses/subaccounts/:id
 */
export const getBusinessSubaccounts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const business = await Business.findOne({ _id: req.params.id })

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const pop: Array<any> = [];
    const result = await advanced(Subaccount, pop, '', req, 'business', business._id, null, 'absolute');

    if (result.data.length > 0) {

        const mapped = await BankMapper.mapReplaceBankCodeList({ type: 'subaccount', subaccounts: result.data });
        result.data = mapped.subaccounts;

    }

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
 * @name searchSubaccounts
 * @description Get a reource from database
 * @route POST /vace/v1/businesses/search-subaccounts/:id
 * @access Business
 */
export const searchSubaccounts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { key } = req.body;

    if (!key) {
        return next(new ErrorResponse('Error', 400, [`search key is required`]))
    }

    const business = await Business.findOne({ _id: req.params.id })

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const pop = [
        { path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
    ]

    const query: ISearchQuery = {
        model: Subaccount,
        ref: null,
        value: null,
        data: [
            { name: { $regex: key, $options: 'i' } },
            { code: { $regex: key, $options: 'i' } },
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
 * @name filterSubaccounts
 * @description Get a reource from database
 * @route POST /vace/v1/businesses/filter-subaccounts/:id
 * @access Superadmin | Admin
 */
export const filterSubaccounts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as FilterSubaccountDTO;

    const business = await Business.findOne({ _id: req.params.id })

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const filters = SubaccountService.defineFilterQuery(body);

    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]

    const query: ISearchQuery = {
        model: Subaccount,
        ref: 'business',
        value: business._id,
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
 * @name getBusinessInvoices
 * @description Get a reource from database
 * @route GET /vace/v1/businesses/invoices/:id
 */
export const getBusinessInvoices = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const business = await Business.findOne({ _id: req.params.id })

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const pop: Array<any> = [];
    const result = await advanced(Invoice, pop, '', req, 'business', business._id, null, 'relative');

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
 * @name searchInvoices
 * @description Get a reource from database
 * @route POST /vace/v1/businesses/search-invoices/:id
 * @access Business
 */
export const searchInvoices = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { key } = req.body;

    if (!key) {
        return next(new ErrorResponse('Error', 400, [`search key is required`]))
    }

    const business = await Business.findOne({ _id: req.params.id })

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const pop = [
        { path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
    ]

    const query: ISearchQuery = {
        model: Invoice,
        ref: 'business',
        value: business._id,
        data: [
            { name: { $regex: key, $options: 'i' } },
            { number: { $regex: key, $options: 'i' } },
            { code: { $regex: key, $options: 'i' } },
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
 * @name filterInvoices
 * @description Get a reource from database
 * @route POST /vace/v1/businesses/filter-invoices/:id
 * @access Superadmin | Admin
 */
export const filterInvoices = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as FilterInvoiceDTO;

    const business = await Business.findOne({ _id: req.params.id })

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const filters = InvoiceService.defineFilterQuery(body);

    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]

    const query: ISearchQuery = {
        model: Invoice,
        ref: 'business',
        value: business._id,
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
 * @name getBusinessBanks
 * @description Get a reource from database
 * @route GET /vace/v1/businesses/banks/:id
 */
export const getBusinessBanks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const business = await Business.findOne({ _id: req.params.id })

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const pop: Array<any> = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ];

    const result = await advanced(Bank, pop, '', req, 'business', business._id, null, 'absolute');

    if (result.data.length > 0) {

        const mapped = await BankMapper.mapReplaceBankCodeList({ type: 'bank', banks: result.data });
        result.data = mapped.banks;

    }

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
 * @name getBusinessTransactions
 * @description Get a reource from database
 * @route GET /vace/v1/businesses/transactions/:id
 */
export const getBusinessTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const business = await Business.findOne({ _id: req.params.id });

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const result = await advanced(Transaction, [], 'status', req, 'business', business._id, null, 'absolute');

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
 * @route POST /vace/v1/businesses/filter-transactions/:id
 * @access Superadmin | Admin
 */
export const filterTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let analytics: any = {};
    let result: IPagination = { count: 0, total: 0, data: [], pagination: { next: { limit: 0, page: 1 }, prev: { limit: 0, page: 1 } } }

    const body = req.body as FilterTransactionDTO;
    const { type } = req.body as FilterTransactionDTO;

    const business = await Business.findOne({ _id: req.params.id }).populate([{ path: 'user' }])

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    // define basic parameters
    const filters = TransactionService.defineFilterQuery(body);
    const pop = [
        { path: 'business', select: '_id email officialEmail name' }
    ]

    // process normal filter
    if (!type) {

        const query: ISearchQuery = {
            model: Transaction,
            ref: 'business',
            value: business._id,
            data: filters.length > 0 ? filters : [{ status: TransactionStatus.SUCCESSFUL }],
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

        // define request query params
        const params = await TransactionService.defineFilterDateRange(body);

        // set the params
        req.query.from = params.from
        req.query.to = params.to;

        // search
        const query: ISearchQuery = {
            model: Transaction,
            ref: 'business',
            value: business._id,
            data: filters,
            query: null,
            queryParam: req.query,
            populate: pop,
            operator: 'and'
        }

        result = await search(query); // search from DB
        analytics = await TransactionRepository.aggregateFilterAnalytics({ user: business.user, dates: params })

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
 * @name searchTransactions
 * @description Get a reource from database
 * @route POST /vace/v1/businesses/search-transactions/:id
 * @access Business
 */
export const searchTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { reference } = req.body;

    if (!reference) {
        return next(new ErrorResponse('Error', 400, [`reference is required`]))
    }

    const business = await Business.findOne({ _id: req.params.id })

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const pop = [
        { path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
    ]

    const query: ISearchQuery = {
        model: Transaction,
        ref: 'business',
        value: business._id,
        data: [
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
 * @name getBeneficiaries
 * @description Get a reource from database
 * @route GET /vace/v1/businesses/beneficiaries/:id
 */
export const getBeneficiaries = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const business = await Business.findOne({ _id: req.params.id });

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const result = await advanced(Beneficiary, [], 'accountName', req, 'business', business._id, null, 'relative');

    if (result.data.length > 0) {

        const mapped = await BankMapper.mapReplaceBankCodeList({ type: 'beneficiary', beneficiaries: result.data });
        result.data = mapped.beneficiaries;

    }

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
 * @name getBusinessSettlements
 * @description Get a reource from database
 * @route GET /vace/v1/businesses/settlements/:id
 */
export const getBusinessSettlements = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const business = await Business.findOne({ _id: req.params.id })

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    // set query params
    let param: any = {};
    Object.assign(param, req.query)
    param.paginate = 'relative'

    const query: ISearchQuery = {
        model: Settlement,
        ref: null,
        value: null,
        data: { _id: { $in: business.settlements } },
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
 * @name getBusinessSettlement
 * @description Get a reource from database
 * @route GET /vace/v1/settlements/:id
 */
export const getBusinessSettlement = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

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
 * @name getSettlementTransactions
 * @description Get a reource from database
 * @route POST /vace/v1/businesses/settlement-transactions/:id
 */
export const getSettlementTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { type } = req.query;
    let filters: any = null;
    let operator: string = 'in';

    const { code, settlementId } = req.body;

    const business = await Business.findOne({ _id: req.params.id })

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    let settlement = await SettlementRepository.findById(settlementId, false);

    if (!settlement) {

        settlement = await SettlementRepository.findByCode(code, false);

        if (!settlement) {
            return next(new ErrorResponse('Error', 404, ['settlement does not exist']))
        }

    }

    if (type && type === 'settled') {
        operator = 'and';
        filters = [
            { settlement: settlement._id },
            { feature: { $not: { $eq: TransactionFeatureType.PAYMENT_LINK } } }
        ]
    } else {
        operator = 'in';
        filters = {
            _id: { $in: settlement.transactions }
        }
    }

    const query: ISearchQuery = {
        model: Transaction,
        ref: 'business',
        value: business._id,
        data: filters,
        query: null,
        queryParam: req.query,
        populate: [],
        operator: operator
    }

    const result = await search(query)

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
 * @name getBusinessAnalytics
 * @description Get a reource from database
 * @route POST /vace/v1/settlements/business-analytics
 */
export const getSettlementAnalytics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { code, businessId } = req.body;

    if (!code) {
        return next(new ErrorResponse('Error', 400, ['settlement code is required']))
    }

    if (!businessId) {
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
 * @name searchSettlements
 * @description Get a reource from database
 * @route POST /vace/v1/settlements/search/:id
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
 * @name addBusinessBank
 * @description Create resource in the database
 * @route PUT /vace/v1/businesses/add-bank/:id
 */
export const addBusinessBank = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const providerName = await ProviderService.configProviderName('bank');
    const { bankCode, accountNo, accountName } = req.body as CreateBusinessBankDTO;

    if (!accountNo) {
        return next(new ErrorResponse('Error', 400, ['account number is required']))
    }

    if (!bankCode) {
        return next(new ErrorResponse('Error', 400, ['bank code is required']))
    }

    const business = await BusinessRepository.findById(req.params.id, true)

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider;

    // resolve bank acount that was provided
    const inBank = await BankService.getBank(bankCode, provider.name);

    if (!inBank) {
        return next(new ErrorResponse('Error', 400, ['invalid bank code supplied']))
    }

    const bankExist = await Bank.findOne({ code: inBank.code, accountNo: accountNo, business: business._id });

    if (bankExist) {
        return next(new ErrorResponse('Error', 403, [`bank already exists for business`]));
    }

    const bank = await BankService.createBank({
        code: inBank.platformCode,
        accountName: accountName,
        accountNo: accountNo,
        business: business,
        provider: provider
    });

    if (!arrayIncludes(business.banks, bank._id.toString())) {
        business.banks.push(bank._id);
        await business.save()
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: bank,
        message: 'successful',
        status: 200
    })

})

/**
 * @name updateSettlementBank
 * @description Create resource in the database
 * @route PUT /vace/v1/businesses/update-settlement/:id
 */
export const updateSettlementBank = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const providerName = await ProviderService.configProviderName('bank');
    const { bankCode, accountNo, accountName } = req.body as UpdateSettlementBankDTO;

    if (!accountNo) {
        return next(new ErrorResponse('Error', 400, ['account number is required']))
    }

    if (!bankCode) {
        return next(new ErrorResponse('Error', 400, ['bank code is required']))
    }

    const business = await BusinessRepository.findById(req.params.id, true);

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    // get provider
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider;

    const inBank = await BankService.getBank(bankCode, provider.name);

    if (!inBank) {
        return next(new ErrorResponse('Error', 400, ['invalid bank details. select a valid bank']))
    }

    business.bank = {
        accountName: accountName,
        accountNo: accountNo,
        bankCode: inBank.code,
        platformCode: inBank.platformCode,
        name: inBank.legalName,
        updatedAt: dateToday(Date.now()).ISO
    }
    await business.save();

    res.status(200).json({
        error: false,
        errors: [],
        data: business.bank,
        message: 'successful',
        status: 200
    })

})

/**
 * @name updateWebhookData
 * @description Update a reource in database
 * @route PUT /vace/v1/businesses/webhook/:id
 */
export const updateWebhookData = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { url } = req.body;

    if (!url) {
        return next(new ErrorResponse('Error', 400, ['webhook url is required']))
    }

    const split: Array<string> = url.split('://');

    if (split.length < 2 || split[0] !== 'https') {
        return next(new ErrorResponse('Error', 400, ['invalid webhook url. include https://']))
    }

    let business = await BusinessRepository.findById(req.params.id);

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const user = await UserRepository.findByIdAndSelectKey(business.user._id, true);

    const response = await WebhookService.verifyUserWebhook({
        apiKey: user!.apiKey.secret,
        header: HeaderType.WEBHOOK,
        webhook: url
    });

    if (response.error === true) {
        return next(new ErrorResponse('Error', 400, ['invalid webhook url. webhook should exist as a POST request and return success HTTP status code']))
    }

    const whUser = await UserRepository.findByIdAndSelectWebhook(user!._id, true);
    const webhook = await WebhookService.updateWebhokData(whUser!, url);

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            url: webhook.url,
            isActive: webhook.isActive,
            createdAt: webhook.createdAt
        },
        message: 'successful',
        status: 200
    })

})

/**
 * @name setBusinessCharges
 * @description Update a reource in database
 * @route PUT /vace/v1/businesses/set-charges/:id
 */
export const setBusinessCharges = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { card, bills, inflow, transfer } = req.body as SetBusinessChargesDTO;

    const validate = await BusinessService.validateChargeSettings(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: true });
    const user: IUserDoc = loggedIn.data.user;

    if (user.userType !== UserType.SUPER && user.userType !== UserType.ADMIN) {
        return next(new ErrorResponse('Forbidden!', 403, ['unauthorized to perform action']))
    }

    let business = await Business.findOne({ _id: req.params.id }).populate([
        { path: 'settings' },
        { path: 'user' }
    ])

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    if (ENV.isProduction() && !BusinessService.isCompliant(business.user)) {
        return next(new ErrorResponse('Error', 403, ['business compliance is pending']))
    }

    let settings: ISettingDoc = business.settings;

    if (card) {
        settings = await BusinessService.updateChargeFees({ type: 'card', settings, charges: card })
    }

    if (bills) {
        settings = await BusinessService.updateChargeFees({ type: 'bills', settings, charges: bills })
    }

    if (transfer) {
        settings = await BusinessService.updateChargeFees({ type: 'transfer', settings, charges: transfer })
    }

    if (inflow) {
        settings = await BusinessService.updateChargeFees({ type: 'inflow', settings, charges: inflow })
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: settings,
        message: 'successful',
        status: 200
    })

})

/**
 * @name updateSettings
 * @description Update a reource in database
 * @route PUT /vace/v1/businesses/update-settings/:id
 */
export const updateSettings = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { settlement, incognito, wallet, bills, domain, chargeVat, paymentLink, invoice, product, refund } = req.body as UpdateSettingsDTO;

    const validate = await BusinessService.validateUpdateSettings(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: true });

    const user: IUserDoc = loggedIn.data.user;

    let business = await Business.findOne({ _id: req.params.id }).populate([
        { path: 'settings' }
    ])

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    let settings: ISettingDoc = business.settings;

    // only admin or superadmin can update charges and settlement timeline
    if (user.userType === UserType.SUPER || user.userType === UserType.ADMIN) {

        if (settlement) {
            settings = await BusinessService.updateSettlementTimeline({ settings, days: settlement.days });
        }

        if (domain) {
            settings = await BusinessService.updateDomainSettings(settings, domain);
        }

        if (isDefined(chargeVat) && (chargeVat === true || chargeVat === false)) {
            settings.chargeVat = chargeVat
            await settings.save();
        }

        // update wallet settings
        if (wallet) {
            await BusinessService.updateWalletSettings({ settings, inflow: wallet.inflow, outflow: wallet.outflow })
        }

        // update bills settings
        if (bills) {

            await BusinessService.updateBillsSettings({
                settings,
                airtime: bills.airtime,
                data: bills.data,
                cable: bills.cable,
                electricity: bills.electricity
            });

        }

        // update payment link settings
        if (paymentLink) {
            await BusinessService.updatePaymentSettings({
                settings,
                invoice: paymentLink.invoice,
                product: paymentLink.product,
                request: paymentLink.request
            })
        }

        // update resource settings
        if (invoice || refund || product) {
            await BusinessService.updateResourceSettings({
                settings,
                invoice: invoice,
                product: product,
                refund: refund
            })
        }

    }

    // update incognito
    if (isDefined(incognito) && (incognito === true || incognito === false)) {
        settings.incognito = incognito!;
        await settings.save();
    }

    // update settlement destination
    if (settlement && settlement.settleInto) {
        settings.settlement.settleInto = settlement.settleInto;
        await settings.save();
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: settings,
        message: 'successful',
        status: 200
    })

})

/**
 * @name exportTransactions
 * @description Get a reource from database
 * @route POST /terra/v1/businesses/export-transactions/:id
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

    const business = await BusinessRepository.findById(req.params.id, false);

    if (!business) {
        return next(new ErrorResponse('Error', 404, [`business does not exist`]))
    }

    // define request query params
    const params = await TransactionService.defineExportDateRange(body);

    // set the params
    req.query.from = params.from
    req.query.to = params.to;

    exportTransactionJob({
        business: business,
        params: params,
        filters: filters,
        populate: pop,
        queryParam: req.query,
        isAdmin: false
    })

    res.status(200).json({
        error: false,
        errors: [],
        data: {},
        message: 'successful',
        status: 200
    })

})

/**
 * @name deleteAccount
 * @description DELETE a reource from database
 * @route DELETE /vace/v1/businesses/:id?type=
 */
export const deleteAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const allowed = ['check', 'delete'];
    let balance: any = {}, email: string = '';

    const type = req.query.type as string;

    if (!type) {
        return next(new ErrorResponse('Error', 400, [`deletion type is require`]))
    }

    if (!arrayIncludes(allowed, type)) {
        return next(new ErrorResponse('Error', 400, [`invalid type supplied. choose from ${allowed.join(', ')}`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: false });
    const user: IUserDoc = loggedIn.data.user;
    const business: IBusinessDoc = loggedIn.data.business;
    const wallet: IWalletDoc = business.wallet;

    if (user.userType === UserType.BUSINESS) {

        balance = {
            available: wallet.balance.available,
            settlement: wallet.balance.settlement,
            locked: wallet.balance.locked
        }
        email = user.email;

        if (type === 'delete') {

            if (wallet.balance.available > 0) {
                return next(new ErrorResponse('Error', 403, [`NGN${wallet.balance.available.toLocaleString()} is still in wallet`]))
            }

            if (wallet.balance.settlement > 0) {
                return next(new ErrorResponse('Error', 403, [`settlement of NGN${wallet.balance.available.toLocaleString()} is pending`]))
            }

            if (wallet.balance.locked > 0) {
                return next(new ErrorResponse('Error', 403, [`amount of NGN${wallet.balance.available.toLocaleString()} is currently locked`]))
            }

            // run the deletion queue
            await deleteUserJob(user)

            // sync deletion to NATS
            await SystemService.syncNatsData({ user: user, email: user.email }, 'user.deleted', 'typ.delete');

        }

    }

    if (user.userType === UserType.SUPER || user.userType === UserType.ADMIN) {

        const business = await BusinessRepository.findById(req.params.id, true);

        if (!business) {
            return next(new ErrorResponse('Error', 404, [`business does not exist`]))
        }

        const wallet: IWalletDoc = business.wallet;

        balance = {
            available: wallet.balance.available,
            settlement: wallet.balance.settlement,
            locked: wallet.balance.locked
        }
        email = business.email;

        if (type === 'delete') {

            if (wallet.balance.available > 0) {
                return next(new ErrorResponse('Error', 403, [`NGN${wallet.balance.available.toLocaleString()} is still in wallet`]))
            }

            if (wallet.balance.settlement > 0) {
                return next(new ErrorResponse('Error', 403, [`settlement of NGN${wallet.balance.available.toLocaleString()} is pending`]))
            }

            if (wallet.balance.locked > 0) {
                return next(new ErrorResponse('Error', 403, [`amount of NGN${wallet.balance.available.toLocaleString()} is currently locked`]))
            }

            // sync deletion to NATS
            await SystemService.syncNatsData({ user: user, email: user.email }, 'user.deleted', 'typ.delete');

        }


    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            email: email,
            balance: balance
        },
        message: 'successful',
        status: 200
    })

})