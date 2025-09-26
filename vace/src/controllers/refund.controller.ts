import crypto from 'crypto';
import mongoose, { ObjectId, Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { arrayIncludes, asyncHandler, checkDateFormat, strIncludesEs6 } from '@btffamily/vacepay'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import { IAccountDoc, IBusinessDoc, IProviderDoc, IRefundDoc, IResult, ISearchQuery, ISettingDoc, IUserDoc, IWalletDoc } from '../utils/types.util';
import { advanced, search } from '../utils/result.util';
import Settlement from '../models/Settlement.model';
import Refund from '../models/Refund.model';
import { CreateRefundDTO, FilterRefundDTO } from '../dtos/refund.dto';
import RefundService from '../services/refund.service';
import ProviderService from '../services/provider.service';
import Transaction from '../models/Transaction.model';
import BusinessService from '../services/business.service';
import SystemService from '../services/system.service';
import User from '../models/User.model';
import { SettingStatusType, TransactionFeatureType, TransactionStatus, UserType } from '../utils/enums.util';
import BankService from '../services/bank.service';
import { ResolvedBankDTO } from '../dtos/provider.dto';
import VacepayService from '../services/vacepay.service';
import { createNewAuditJob } from '../queues/jobs/audit.job';
import TransactionRepository from '../repositories/transaction.repository';

/**
 * @name getRefunds
 * @description Get reource from database
 * @route GET /vace/v1/refunds
 */
export const getRefunds = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);   
});

/**
 * @name getRefund
 * @description Get a reource from database
 * @route GET /vace/v1/refunds/:id
 */
export const getRefund = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const refund = await Refund.findOne({ _id: req.params.id }).populate([
        { path: 'transaction'},
		{ path: 'refundedTxn'},
		{ path: 'business', select: '_id email name officialEmail' },
		{ path: 'provider' }
    ])

    if(!refund){
        return next(new ErrorResponse('Error', 404, ['refund does not exist']))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: refund,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getRefundByCode
 * @description Get a reource from database
 * @route GET /vace/v1/refunds/by-code?code=
 */
export const getRefundByCode = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

    const code = req.query.code as string;

    if(!code){
        return next(new ErrorResponse('Error', 400, ['code is required']))
    }

	const refund = await Refund.findOne({ code: code }).populate([
        { path: 'transaction'},
		{ path: 'business', select: '_id email name officialEmail' },
		{ path: 'provider' }
    ])

    if(!refund){
        return next(new ErrorResponse('Error', 404, ['refund does not exist']))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: refund,
        message: 'successful',
        status: 200
    })

})

/**
 * @name searchRefunds
 * @description Get a reource from database
 * @route POST /vace/v1/refunds/search
 * @access Superadmin | Admin
 */
export const searchRefunds = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const { code } = req.body;

	if(!code){
		return next(new ErrorResponse('Error', 400, [`refund code is required`]))
	}

	const pop = [
		{ path: 'transaction'},
		{ path: 'business', select: '_id email name officialEmail' },
		{ path: 'provider' }
	]

	const query: ISearchQuery = {
		model: Refund,
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
 * @name filterRefunds
 * @description Get a reource from database
 * @route POST /vace/v1/refunds/filter
 * @access Superadmin | Admin
 */
export const filterRefunds = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	let list: Array<IRefundDoc> = [];
	const body = req.body as FilterRefundDTO;

	const user = await User.findOne({ _id: req.user._id }).populate([
		{ path: 'business' }
	]);

	const filters = RefundService.defineFilterQuery(body);

	const pop = [
		{ path: 'transaction'},
		{ path: 'refundedTxn' },
		{ path: 'business', select: '_id email name officialEmail' },
		{ path: 'provider' }
	]

	const query: ISearchQuery = {
		model: Refund,
		ref: null,
		value: null,
		data: filters,
		query: null,
		queryParam: req.query,
		populate: pop,
		operator: 'and'
	}

	const result = await search(query); // search from DB

	if(user && user.userType === UserType.BUSINESS){

		const business: IBusinessDoc = user.business;

		result.data.forEach((x) => {
			if(arrayIncludes(business.transactions, x.transaction._id.toString())){
				list.push(x);
			}
		});

		result.data = list;

	}

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
 * @name createRefund
 * @description Get a reource from database
 * @route POST /vace/v1/refunds
 * @access Superadmin | Admin | Business
 */
export const createRefund = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const providerName = await ProviderService.configProviderName('bank');
    let response: IResult = { error: false, message: '', code: 200, data: null }
    let bankDetails: any = {};

    const { option, reason, type, amount, bank, reference, pin } = req.body as CreateRefundDTO;

    const validate = await RefundService.validateCreateRefund(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]));
    }

    const transaction = await TransactionRepository.findByReference(reference, true)

    if (!transaction) {
        return next(new ErrorResponse('Error', 404, ['transaction does not exist']))
    }

    if (transaction.feature !== TransactionFeatureType.PAYMENT_LINK) {
        return next(new ErrorResponse('Error', 403, [`cannot refund a transaction of type ${transaction.feature}`]))
    }

    if (transaction.status !== TransactionStatus.SUCCESSFUL && transaction.status !== TransactionStatus.COMPLETED) {
        return next(new ErrorResponse('Error', 403, [`cannot refund a ${transaction.status} transaction`]))
    }

    const business: IBusinessDoc = transaction.business;
    const settings: ISettingDoc = business.settings;
    const user: IUserDoc = business.user;

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 422, [`cannot initiate refund. business is not compliant`]));
    }

    if (settings.refund === SettingStatusType.INACTIVE) {
        return next(new ErrorResponse('Error', 403, [`refund is deactivated on account. contact support`]))
    }

    const isPinValid = await BusinessService.matchPIN(business._id, pin!);

    if (isPinValid === false) {
        return next(new ErrorResponse('Error', 403, ['invalid transaction pin supplied']))
    }

    const provider: IProviderDoc = transaction.provider
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const wallet: IWalletDoc = business.wallet;

    if (option === 'instant') {

        // get provider used to move instant refund
        const bankProvider = await ProviderService.getProviderFromList('bank');

        if (!bankProvider) {
            return next(new ErrorResponse('Error', 500, ['an error occured. contact support']))
        }

        if (bank) {

            // resolve bank acount that was provided
            const _bank = await BankService.getBank(bank.bankCode, provider.name);

            if (!_bank) {
                return next(new ErrorResponse('Error', 400, ['invalid bank details. select a valid bank']))
            }

            bankDetails = {
                accountNo: bank.accountNo,
                accountName: bank.accountName,
                name: _bank.name.toLowerCase().split(' ')[0],
                legalName: _bank.legalName,
                bankCode: _bank.code,
                platformCode: _bank.platformCode
            }

        }

        // create refuund
        response = await RefundService.createRefundData({
            business,
            option,
            reason,
            transaction: transaction,
            type,
            amount,
            bank: bankDetails
        });

        if (response.error) {
            return next(new ErrorResponse('Error', 500, [`${response.message}`]));
        }

        const refund: IRefundDoc = response.data; // refund data

        // payout refund instantly
        response = await RefundService.payoutRefund({
            business,
            provider: bankProvider,
            transaction,
            refund,
            wallet,
            account
        });

        if (response.error) {
            return next(new ErrorResponse('Error', 500, [`${response.message}`]));
        }

        // create audit log
        createNewAuditJob({
            action: 'createRefund',
            type: "success",
            user: user,
            entity: 'Refund',
            entityId: refund._id,
            controller: 'refund',
            description: `Created NGN${refund.amount.toLocaleString()} instant refund for transaction ${transaction.reference}`,
            changes: req.body
        })

    }

    if (option === 'request') {

        response = await RefundService.createRefundData({
            business,
            option,
            reason,
            transaction,
            type,
            amount,
            bank: bankDetails
        });

        if (response.error) {
            return next(new ErrorResponse('Error', 500, [`${response.message}`]));
        }

        const refund: IRefundDoc = response.data;

        // refund via provider API
        response = await RefundService.redirectRefundToAPI({
            business,
            provider,
            refund,
            transaction,
            wallet,
        });

        if (response.error) {
            return next(new ErrorResponse('Error', 500, [`${response.message}`]));
        }

        // create audit log
        createNewAuditJob({
            action: 'createRefund',
            type: "success",
            user: user,
            entity: 'Refund',
            entityId: refund._id,
            controller: 'refund',
            description: `Created NGN${refund.amount.toLocaleString()} request refund for transaction ${transaction.reference}`,
            changes: req.body
        })

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: response.data,
        message: 'successful',
        status: 200
    })

})

