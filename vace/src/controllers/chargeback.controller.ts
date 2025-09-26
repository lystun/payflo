import crypto from 'crypto';
import mongoose, { ObjectId, Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { Random, arrayIncludes, asyncHandler, checkDateFormat, checkTimeFormat, dateToday, isBase64, isString, strIncludesEs6 } from '@btffamily/vacepay'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import { IAccountDoc, IBusinessDoc, IChargebackDoc, IProviderDoc, IRefundDoc, IResult, ISearchQuery, ITransactionDoc, IUserDoc, IWalletDoc } from '../utils/types.util';
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
import { UserType } from '../utils/enums.util';
import Chargeback from '../models/Chargeback.model';
import ChargebackService from '../services/chargeback.service';
import { CreateChargebackDTO, DeclineChargebackDTO, FilterChargebackDTO, UpdateChargebackDTO } from '../dtos/chargeback.dto';
import StorageService from '../services/storage.service';
import BankService from '../services/bank.service';
import { ResolvedBankDTO } from '../dtos/provider.dto';
import VacepayService from '../services/vacepay.service';
import { createNewAuditJob } from '../queues/jobs/audit.job';
import ChargebackRepository from '../repositories/chargeback.repository';
import TransactionRepository from '../repositories/transaction.repository';

/**
 * @name getChargebacks
 * @description Get reource from database
 * @route GET /vace/v1/chargebacks
 */
export const getChargebacks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);
});

/**
 * @name getChargeback
 * @description Get a reource from database
 * @route GET /vace/v1/chargebacks/:id
 */
export const getChargeback = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const chargeback = await Chargeback.findOne({ _id: req.params.id }).populate([
		{ path: 'user', select: '_id email firstName lastName userType' },
		{ path: 'transaction' },
		{ path: 'chargedTxn' },
		{ path: 'business', select: '_id email name officialEmail' },
		{ path: 'provider' }
	])

	if (!chargeback) {
		return next(new ErrorResponse('Error', 404, ['chargeback does not exist']))
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: chargeback,
		message: 'successful',
		status: 200
	})

})

/**
 * @name getChargebackByCode
 * @description Get a reource from database
 * @route GET /vace/v1/chargebacks/by-code?code=
 */
export const getChargebackByCode = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const code = req.query.code as string;

	if (!code) {
		return next(new ErrorResponse('Error', 400, ['code is required']))
	}

	const chargeback = await Chargeback.findOne({ _id: req.params.id }).populate([
		{ path: 'user', select: '_id email firstName lastName userType' },
		{ path: 'transaction' },
		{ path: 'business', select: '_id email name officialEmail' },
		{ path: 'provider' }
	])

	if (!chargeback) {
		return next(new ErrorResponse('Error', 404, ['chargeback does not exist']))
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: chargeback,
		message: 'successful',
		status: 200
	})

})

/**
 * @name searchChargebacks
 * @description Get a reource from database
 * @route POST /vace/v1/chargebacks/search
 * @access Superadmin | Admin
 */
export const searchChargebacks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const { code } = req.body;

	if (!code) {
		return next(new ErrorResponse('Error', 400, [`chargeback code is required`]))
	}

	const pop = [
		{ path: 'transaction' },
		{ path: 'business', select: '_id email name officialEmail' },
		{ path: 'provider' }
	]

	const query: ISearchQuery = {
		model: Chargeback,
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
 * @name filterChargebacks
 * @description Get a reource from database
 * @route POST /vace/v1/chargebacks/filter
 * @access Superadmin | Admin
 */
export const filterChargebacks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	let list: Array<IChargebackDoc> = [];
	const body = req.body as FilterChargebackDTO;

	const user = await User.findOne({ _id: req.user._id }).populate([
		{ path: 'business' }
	]);

	const filters = ChargebackService.defineFilterQuery(body);

	const pop = [
		{ path: 'user', select: '_id email firstName lastName userType' },
		{ path: 'transaction' },
		{ path: 'business', select: '_id email name officialEmail' },
		{ path: 'provider' }
	]

	const query: ISearchQuery = {
		model: Chargeback,
		ref: null,
		value: null,
		data: filters,
		query: null,
		queryParam: req.query,
		populate: pop,
		operator: 'and'
	}

	const result = await search(query); // search from DB

	if (user && user.userType === UserType.BUSINESS) {

		const business: IBusinessDoc = user.business;

		result.data.forEach((x) => {
			if (arrayIncludes(business.transactions, x.transaction._id.toString())) {
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
 * @name createChargeback
 * @description Get a reource from database
 * @route POST /vace/v1/chargebacks/:id
 * @access Superadmin | Admin
 */
export const createChargeback = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const providerName = await ProviderService.configProviderName('bank');
    let response: IResult = { error: false, message: '', code: 200, data: null }
    let bankDetails: any = {};

    const { level, dueDate, timeline, message, bank, reference } = req.body as CreateChargebackDTO;

    const validate = await ChargebackService.validateCreateChargeback(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]));
    }

    const user = await User.findOne({ _id: req.user._id })

    if (!user) {
        return next(new ErrorResponse('Error', 403, ['authorized user not found. contact support']))
    }

    const transaction = await TransactionRepository.findByReference(reference, true)

    if (!transaction) {
        return next(new ErrorResponse('Error', 404, ['transaction does not exist']))
    }

    const business: IBusinessDoc = transaction.business;
    const bizUser: IUserDoc = business.user;

    if (!BusinessService.isCompliant(bizUser)) {
        return next(new ErrorResponse('Error', 422, [`cannot initiate refund. business is not compliant`]));
    }

    if (business.accounts.length === 0) {
        return next(new ErrorResponse('Error', 500, [`bank account has not been generated`]));
    }

    const provider: IProviderDoc = transaction.provider // transaction provider
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const wallet: IWalletDoc = business.wallet;

    // resolve bank acount that was provided
    const _bank = await BankService.getBank(bank.bankCode, provider.name);

    if (!_bank) {
        return next(new ErrorResponse('Error', 400, ['invalid bank details. select a valid bank']))
    }

    bankDetails = {
        accountNo: bank.accountNo,
        accountName: bank.accountName,
        name: _bank.name,
        legalName: _bank.legalName,
        bankCode: _bank.code,
        platformCode: _bank.platformCode
    }

    response = await ChargebackService.createChargeback({
        business,
        transaction,
        bank: bankDetails,
        dueDate,
        level,
        message,
        timeline,
        user: user,
        bizUser: bizUser
    });

    if (response.error) {
        return next(new ErrorResponse('Error', 500, [`${response.message}`]));
    }

    const refund: IChargebackDoc = response.data;

    res.status(200).json({
        error: false,
        errors: [],
        data: refund,
        message: 'successful',
        status: 200
    })

})

/**
 * @name acceptChargeback
 * @description Get a reource from database
 * @route PUT /vace/v1/chargebacks/accept/:id
 * @access Superadmin | Admin | Business
 */
export const acceptChargeback = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const providerName = await ProviderService.configProviderName('bank');
    let response: IResult = { error: false, message: '', code: 200, data: null }

    const chargeback = await Chargeback.findOne({ _id: req.params.id }).populate([
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
                { path: 'banks.details' },
            ]
        },
        { path: 'provider' },
        { path: 'transaction' }
    ]);

    if (!chargeback) {
        return next(new ErrorResponse('Error', 404, ['chargeback does not exist']))
    }

    if (chargeback.status === 'accepted' || chargeback.status === 'completed') {
        return next(new ErrorResponse('Error', 403, [`chargeback is already ${chargeback.status}`]));
    }

    const transaction: ITransactionDoc = chargeback.transaction;
    const business: IBusinessDoc = chargeback.business;
    const user: IUserDoc = business.user;

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 422, [`cannot initiate refund. business is not compliant`]));
    }

    if (business.accounts.length === 0) {
        return next(new ErrorResponse('Error', 500, [`bank account has not been generated`]));
    }

    const bankProvider = await ProviderService.getProviderFromList('bank')

    if (!bankProvider) {
        return next(new ErrorResponse('Error', 500, [`an error occured. contact support`]));
    }

    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const wallet: IWalletDoc = business.wallet;

    /** CHARGEBACK IS DEDUCTED AT SETTLEMENT */

    // response = await ChargebackService.payoutChargeback({
    //     business,
    //     chargeback,
    //     provider: bankProvider,
    //     transaction,
    //     wallet,
    //     account
    // })

    // if (response.error) {
    //     // TODO: log audit for chargeback payout with wallet
    //     return next(new ErrorResponse('Error', 500, [`${response.message}`]));
    // }

    if (!response.error) {

        chargeback.status = 'accepted';
        await chargeback.save();

        // create audit log
        createNewAuditJob({
            action: 'acceptChargeback',
            type: "success",
            user: user,
            entity: 'Chargeback',
            entityId: chargeback._id,
            controller: 'chargeback',
            description: `Accepted NGN${chargeback.amount.toLocaleString()} chargeback for transaction ${transaction.reference}`,
            changes: req.body
        })

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: chargeback,
        message: 'successful',
        status: 200
    })

})

/**
 * @name declineChargeback
 * @description Get a reource from database
 * @route PUT /vace/v1/chargebacks/decline/:id
 * @access Superadmin | Admin | Business
 */
export const declineChargeback = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const providerName = await ProviderService.configProviderName('bank');
	let response: IResult = { error: false, message: '', code: 200, data: null }

	const { reason, evidence } = req.body as DeclineChargebackDTO;

	const validate = await ChargebackService.validateDeclineChargeback(req.body);

	if (validate.error) {
		return next(new ErrorResponse('Error', 400, [`${validate.message}`]));
	}

	const chargeback = await Chargeback.findOne({ _id: req.params.id }).populate([
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
	]);

	if (!chargeback) {
		return next(new ErrorResponse('Error', 404, ['chargeback does not exist']))
	}

	const business: IBusinessDoc = chargeback.business;
	const user: IUserDoc = business.user;

	if (!BusinessService.isCompliant(user)) {
		return next(new ErrorResponse('Error', 422, [`cannot initiate refund. business is not compliant`]));
	}

	if (business.accounts.length === 0) {
		return next(new ErrorResponse('Error', 500, [`bank account has not been generated`]));
	}

	if (chargeback.status === 'accepted' || chargeback.status === 'completed' || chargeback.status === 'declined') {
		return next(new ErrorResponse('Error', 403, [`chargeback is already ${chargeback.status}`]));
	}

	if (chargeback.status === 'pending') {

		chargeback.response.message = reason;
		chargeback.status = 'declined';
		await chargeback.save();


		const filename = `chargeback-${chargeback.reference}`;
		const upload = await StorageService.uploadGcpFile(evidence, filename, 'base64');

		if (upload.error) {
			//TODO: Logo Audit here
		}

		if (!upload.error && upload.data) {
			chargeback.response.evidence = upload.data.publicUrl;
			await chargeback.save();
		}

		// create audit log
		createNewAuditJob({
			action: 'declineChargeback',
			type: "success",
			user: user,
			entity: 'Chargeback',
			entityId: chargeback._id,
			controller: 'chargeback',
			description: `Declined NGN${chargeback.amount.toLocaleString()} chargeback with code ${chargeback.code}`,
			changes: req.body
		})

	}

	res.status(200).json({
		error: false,
		errors: [],
		data: {
			status: chargeback.status,
			evidence: chargeback.response.evidence,
			reason: reason
		},
		message: 'successful',
		status: 200
	})

})

/**
 * @name updateChargeback
 * @description Update a reource in the database
 * @route PUT /vace/v1/chargebacks/:id
 * @access Superadmin | Admin 
 */
export const updateChargeback = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const providerName = await ProviderService.configProviderName('bank');
	const allowed = ['level1', 'level2', 'pre-arbitration', 'arbitration'];
	const allowedStatus = ['pending', 'accepted', 'declined', 'completed'];
	const { level, message, bank, dueDate, timeline, reason, evidence, status } = req.body as UpdateChargebackDTO

	const chargeback = await ChargebackRepository.findById(req.params.id, true)

	if (!chargeback) {
		return next(new ErrorResponse('Error', 404, ['chargeback does not exist']))
	}

	if (level && !arrayIncludes(allowed, level)) {
		return next(new ErrorResponse('Error', 400, [`invalid level value. choose from ${allowed.join(', ')}`]));
	}

	if (status && !arrayIncludes(allowedStatus, status)) {
		return next(new ErrorResponse('Error', 400, [`invalid status value. choose from ${allowedStatus.join(', ')}`]));
	}

	if (bank && !bank.accountNo) {
		return next(new ErrorResponse('Error', 400, ['account number is required']))
	}

	if (bank && !bank.bankCode) {
		return next(new ErrorResponse('Error', 400, ['bank code is required']))
	}

	if (dueDate) {

		const dueSplit = dueDate.split(' ');

		if (dueSplit.length <= 1) {
			return next(new ErrorResponse('Error', 400, ['invalid due date value']))
		} else if (!checkDateFormat(dueSplit[0])) {
			return next(new ErrorResponse('Error', 400, ['due date should be in format YYYY/MM/DD or YYYY-MM-DD']))
		} else if (!checkTimeFormat(dueSplit[1])) {
			return next(new ErrorResponse('Error', 400, ['due time should be in format HH:mm:ss']))
		}

	}

	if (timeline) {

		const lineSplit = timeline.split(' ');

		if (lineSplit.length <= 1) {
			return next(new ErrorResponse('Error', 400, ['invalid timeline date value']))
		} else if (!checkDateFormat(lineSplit[0])) {
			return next(new ErrorResponse('Error', 400, ['timeline date should be in format YYYY/MM/DD or YYYY-MM-DD']))
		} else if (!checkTimeFormat(lineSplit[1])) {
			return next(new ErrorResponse('Error', 400, ['timeline time should be in format HH:mm:ss']))
		}

	}

	const business: IBusinessDoc = chargeback.business;

	if (chargeback.status === 'accepted' || chargeback.status === 'completed' && status) {
		return next(new ErrorResponse('Error', 403, [`chargeback is already ${chargeback.status}`]));
	}

	chargeback.message = message ? message : chargeback.message;
	chargeback.level = level ? level : chargeback.level;
	chargeback.dueDate = dueDate ? dateToday(dueDate).ISO : chargeback.dueDate;
	chargeback.timeline = timeline ? dateToday(timeline).ISO : chargeback.timeline;
	chargeback.response.message = reason ? reason : chargeback.response.message;
	chargeback.status = status ? status : chargeback.status;
	await chargeback.save();

	if (bank) {

        const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
        const provider: IProviderDoc = account.provider;

		// resolve bank acount that was provided
		const _bank = await BankService.getBank(bank.bankCode, provider.name);

		if (!_bank) {
			return next(new ErrorResponse('Error', 400, ['invalid bank details. select a valid bank']))
		}

		const resolve = await BankService.resolveBankAccount({ bankCode: _bank.platformCode, accountNo: bank.accountNo, name: provider.name })

		if (resolve.error) {
			return next(new ErrorResponse('Error', 403, [`${resolve.message}`]));
		}

		let resolvedBank: ResolvedBankDTO = resolve.data;

		chargeback.bank = {
			accountNo: resolvedBank.accountNo,
            accountName: resolvedBank.accountName,
            name: _bank.name,
            legalName: resolvedBank.bankName,
            bankCode: resolvedBank.bankCode,
            platformCode: resolvedBank.platformCode
		}
		await chargeback.save();

	}

	if (evidence && isString(evidence) && isBase64(evidence)) {

		const filename = `chargeback-${chargeback.reference}-${Random.randomNum(4)}`;
		const upload = await StorageService.uploadGcpFile(evidence, filename, 'base64');

		if (upload.error) {
			//TODO: Logo Audit here
		}

		if (!upload.error && upload.data) {
			chargeback.response.evidence = upload.data.publicUrl;
			await chargeback.save();
		}

	}

	res.status(200).json({
		error: false,
		errors: [],
		data: chargeback,
		message: 'successful',
		status: 200
	})

})

