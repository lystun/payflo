import crypto from 'crypto';
import mongoose, { ObjectId, Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { asyncHandler, strIncludesEs6, arrayIncludes, isString, notDefined, isZero, isNeg } from '@btffamily/vacepay'
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
import { IAccountDoc, IBusinessDoc, IPagination, IProviderDoc, ISearchQuery, IUserDoc, IWalletDoc } from '../utils/types.util';
import { advanced, search } from '../utils/result.util';
import Account from '../models/Account.model';
import Provider from '../models/Provider.model';
import WalletService from '../services/wallet.service';
import ProviderService from '../services/provider.service';
import BusinessService from '../services/business.service';
import { BusinessType, ProviderNameType, UserType } from '../utils/enums.util';
import BankService from '../services/bank.service';
import NinepsbService from '../services/providers/ninepsb.service';
import { PSBApiResponseDTO } from '../dtos/providers/ninepsb.dto';
import Subaccount from '../models/Subaccount.model';
import Transaction from '../models/Transaction.model';
import { FilterTransactionDTO } from '../dtos/transaction.dto';
import TransactionService from '../services/transaction.service';
import { CreateSubaccountRequestDTO, FilterSubaccountDTO, UpdateSubaccountDTO } from '../dtos/subaccount.dto';
import SubaccountService from '../services/subaccount.service';
import { ResolvedBankDTO } from '../dtos/provider.dto';
import UserService from '../services/user.service';
import TransactionRepository from '../repositories/transaction.repository';

/**
 * @name getSubaccounts
 * @description Get reource from database
 * @route GET /vace/v1/subaccounts
 */
export const getSubaccounts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json(res.advancedResults);
});

/**
 * @name getSubaccount
 * @description Get a reource from database
 * @route GET /vace/v1/subaccounts/:id
 */
export const getSubaccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const subacccount = await Subaccount.findOne({ _id: req.params.id }).populate([
        { path: 'business', select: '_id email officialEmail name' },
        { path: 'transactions', select: '_id amount reference createdAt updatedAt' }
    ]);

    if (!subacccount) {
        return next(new ErrorResponse('Error', 404, ['subacccount does not exist']))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: subacccount,
        message: 'successful',
        status: 200
    })

});

/**
 * @name getSubaccountByCode
 * @description Get a reource from database
 * @route GET /vace/v1/subaccounts/by-code
 */
export const getSubaccountByCode = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const subacccount = await Subaccount.findOne({ code: req.params.code }).populate([
        { path: 'business', select: '_id email officialEmail name' },
        { path: 'transactions', select: '_id amount reference createdAt updatedAt' }
    ]);

    if (!subacccount) {
        return next(new ErrorResponse('Error', 404, ['subacccount does not exist']))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: subacccount,
        message: 'successful',
        status: 200
    })

});

/**
 * @name getTransactions
 * @description Get a reource from database
 * @route GET /vace/v1/subaccounts/transactions/:id
 */
export const getTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const subacccount = await Subaccount.findOne({ _id: req.params.id }).populate([
        { path: 'business', select: '_id email officialEmail name' }
    ]);

    if (!subacccount) {
        return next(new ErrorResponse('Error', 404, ['subacccount does not exist']))
    }

    const result = await advanced(Transaction, [], 'status', req, 'subacccount', subacccount._id, null, 'absolute');

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
 * @route POST /vace/v1/subaccounts/filter-transactions/:id
 * @access Superadmin | Admin
 */
export const filterTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let analytics: any = {};
    let result: IPagination = { count: 0, total: 0, data: [], pagination: { next: { limit: 0, page: 1 }, prev: { limit: 0, page: 1 } } }

    const body = req.body as FilterTransactionDTO;
    const { type } = req.body as FilterTransactionDTO;

    const subacccount = await Subaccount.findOne({ _id: req.params.code }).populate([
        { path: 'business', select: '_id email officialEmail name' }
    ]);

    if (!subacccount) {
        return next(new ErrorResponse('Error', 404, ['subacccount does not exist']))
    }

    const filters = TransactionService.defineFilterQuery(body);
    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]

    // process normal filter
    if(!type){

        const query: ISearchQuery = {
            model: Transaction,
            ref: 'subaccount',
            value: subacccount._id,
            data: filters,
            query: null,
            queryParam: req.query,
            populate: pop,
            operator: 'and'
        }
    
        result = await search(query); // search from DB

    }

    // process filter and select 
    if(type){

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
            ref: 'subaccount',
			value: subacccount._id,
            data: filters,
            query: null,
            queryParam: req.query,
            populate: pop,
            operator: 'and'
        }

        result = await search(query); // search from DB
        analytics = await TransactionRepository.aggregateFilterAnalytics({
            user,
            model: { subacccount: subacccount._id }, 
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
 * @name searchTransactions
 * @description Get a reource from database
 * @route POST /vace/v1/subaccounts/search-transactions/:id
 * @access Business
 */
export const searchTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { reference } = req.body;

    if (!reference) {
        return next(new ErrorResponse('Error', 400, [`reference is required`]))
    }

    const subacccount = await Subaccount.findOne({ _id: req.params.id })

    if (!subacccount) {
        return next(new ErrorResponse('Error', 404, ['subacccount link does not exist']))
    }

    const pop = [
        { path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
    ]

    const query: ISearchQuery = {
        model: Transaction,
        ref: 'subacccount',
        value: subacccount._id,
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
 * @name searchSubaccounts
 * @description Get a reource from database
 * @route POST /vace/v1/subaccounts/search
 * @access Superadmin | Admin
 */
export const searchSubaccounts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { key } = req.body;

    if (!key) {
        return next(new ErrorResponse('Error', 400, [`search key is required`]))
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
            { email: { $regex: key, $options: 'i' } },
            { "bank.accountNo": { $regex: key, $options: 'i' } },
            { "bank.accountName": { $regex: key, $options: 'i' } }
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
 * @route POST /vace/v1/subaccounts/filter
 * @access Superadmin | Admin
 */
export const filterSubaccounts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as FilterSubaccountDTO;

    const filters = SubaccountService.defineFilterQuery(body);

    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]

    const query: ISearchQuery = {
        model: Subaccount,
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
 * @name createSubaccount
 * @description Create a reource in the database
 * @route POST /vace/v1/subaccounts/:id
 * @access Superadmin | Admin | Business
 */
export const createSubaccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let bankDetails: any = {};
    const { name, description, accountNo, bankCode, email, phoneCode, phoneNumber, split } = req.body as CreateSubaccountRequestDTO;

    const validate = await SubaccountService.validateCreateSubaccount(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    const business = await Business.findOne({ _id: req.params.id }).populate([
        { path: 'user' },
        { path: 'wallet' },
        {
            path: 'accounts', populate: [
                { path: 'provider' }
            ]
        },
        { path: 'banks.details' },
    ])

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    if (!BusinessService.isCompliant(business.user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    const providerName = await ProviderService.configProviderName('bank');
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider;

    // resolve account number
    if (accountNo && bankCode) {

        // resolve bank acount that was provided
        const _bank = await BankService.getBank(bankCode, provider.name);

        if (!_bank) {
            return next(new ErrorResponse('Error', 400, ['invalid bank details. select a valid bank']))
        }

        const resolve = await BankService.resolveBankAccount({ bankCode: _bank.platformCode, accountNo: accountNo, name: provider.name })

        if (resolve.error) {
            return next(new ErrorResponse('Error', 403, [`${resolve.message}`]));
        }

        let resolvedBank: ResolvedBankDTO = resolve.data;

        bankDetails = {
            accountNo: resolvedBank.accountNo,
            accountName: resolvedBank.accountName,
            name: _bank.name,
            legalName: resolvedBank.bankName,
            bankCode: resolvedBank.bankCode,
            platformCode: resolvedBank.platformCode,
        }

    }

    const create = await SubaccountService.createSubaccount({
        business,
        name,
        bank: bankDetails,
        email,
        phoneCode: phoneCode ? phoneCode : '+234',
        phoneNumber,
        split,
        description
    });

    if (create.error) {
        return next(new ErrorResponse('Error', 500, [`${create.message}`]))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: create.data,
        message: 'successful',
        status: 200
    })

});

/**
 * @name enableSubaccount
 * @description Update a reource in the database
 * @route PUT /vace/v1/subaccounts/enable/:id
 * @access Superadmin | Admin | Business
 */
export const enableSubaccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const subaccount = await Subaccount.findOne({ _id: req.params.id })

    if (!subaccount) {
        return next(new ErrorResponse('Error', 404, ['subaccount does not exist']))
    }

    if (subaccount.isEnabled === false) {
        subaccount.isEnabled = true;
        await subaccount.save();
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            name: subaccount.name,
            isEnabled: subaccount.isEnabled
        },
        message: 'successful',
        status: 200
    })

});

/**
 * @name disableSubaccount
 * @description Update a reource in the database
 * @route PUT /vace/v1/subaccounts/disable/:id
 * @access Superadmin | Admin | Business
 */
export const disableSubaccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const subaccount = await Subaccount.findOne({ _id: req.params.id })

    if (!subaccount) {
        return next(new ErrorResponse('Error', 404, ['subaccount does not exist']))
    }

    if (subaccount.isEnabled === true) {
        subaccount.isEnabled = false;
        await subaccount.save();
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            name: subaccount.name,
            isEnabled: subaccount.isEnabled
        },
        message: 'successful',
        status: 200
    })

});

/**
 * @name updateSubaccount
 * @description Create a reource in the database
 * @route PUT /vace/v1/subaccounts/:id
 * @access Superadmin | Admin | Business
 */
export const updateSubaccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let bankDetails: any = {};
    const { name, description, accountNo, bankCode, email, phoneCode, phoneNumber, split } = req.body as UpdateSubaccountDTO;

    const validate = await SubaccountService.validateUpdateSubaccount(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    const subacccount = await Subaccount.findOne({ _id: req.params.id }).populate([
        {
            path: 'business', populate: [
                { path: 'user' },
                { path: 'wallet' },
                {
                    path: 'accounts', populate: [
                        { path: 'provider' }
                    ]
                },
            ]
        }
    ])

    if (!subacccount) {
        return next(new ErrorResponse('Error', 404, ['subacccount does not exist']))
    }

    const business: IBusinessDoc = subacccount.business;

    if (!BusinessService.isCompliant(business.user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    const providerName = await ProviderService.configProviderName('bank');
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider;

    // resolve account number
    if (accountNo && bankCode) {

        // resolve bank acount that was provided
        const _bank = await BankService.getBank(bankCode, provider.name);

        if (!_bank) {
            return next(new ErrorResponse('Error', 400, ['invalid bank details. select a valid bank']))
        }

        const resolve = await BankService.resolveBankAccount({ bankCode: _bank.platformCode, accountNo: accountNo, name: provider.name })

        if (resolve.error) {
            return next(new ErrorResponse('Error', 403, [`${resolve.message}`]));
        }

        let resolvedBank: ResolvedBankDTO = resolve.data;
        let nameSplit = _bank.name.toLowerCase().split(' ');

        bankDetails = {
            accountNo: resolvedBank.accountNo,
            accountName: resolvedBank.accountName,
            name: _bank.name,
            legalName: _bank.legalName,
            bankCode: resolvedBank.bankCode,
            platformCode: resolvedBank.platformCode
        }

    }

    subacccount.name = name ? name : subacccount.name;
    subacccount.description = description ? description : subacccount.description;
    subacccount.email = email ? email : subacccount.email;
    subacccount.phoneCode = phoneCode ? phoneCode : subacccount.phoneCode;
    subacccount.phoneNumber = phoneNumber ? phoneNumber : subacccount.phoneNumber;
    subacccount.bank = {
        accountName: bankDetails.accountName ? bankDetails.accountName : subacccount.bank.accountName,
        accountNo: bankDetails.accountNo ? bankDetails.accountNo : subacccount.bank.accountNo,
        name: bankDetails.name ? bankDetails.name : subacccount.bank.name,
        legalName: bankDetails.legalName ? bankDetails.legalName : subacccount.bank.legalName,
        bankCode: bankDetails.bankCode ? bankDetails.bankCode : subacccount.bank.bankCode,
        platformCode: bankDetails.platformCode ? bankDetails.platformCode : subacccount.bank.platformCode
    }
    subacccount.split = {
        type: split.type ? split.type : subacccount.split.type,
        value: split.value ? split.value : subacccount.split.value
    }
    await subacccount.save();

    res.status(200).json({
        error: false,
        errors: [],
        data: subacccount,
        message: 'successful',
        status: 200
    })

});