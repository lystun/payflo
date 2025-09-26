import crypto from 'crypto';
import mongoose, { ObjectId, Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { arrayIncludes, asyncHandler, checkDateFormat, checkTimeFormat, hasDecimal, isNeg, isPrecise, isZero, notDefined, dateToday } from '@btffamily/vacepay'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import User from '../models/User.model'

import { IBusinessDoc, IInvoiceItem, IInvoiceVAT, IPagination, IPaymentLinkDoc, IProductDoc, ISearchQuery, ISettingDoc, IUserDoc, IWalletDoc } from '../utils/types.util';
import { advanced, search } from '../utils/result.util';
import { CreateProductDTO, FilterProductDTO, UpdateProductDTO } from '../dtos/product.dto';
import Invoice from '../models/Invoice.model';
import InvoiceService from '../services/invoice.service';
import SystemService from '../services/system.service'
import Business from '../models/Business.model';
import BusinessService from '../services/business.service';
import { BusinessType, SettingStatusType, TransactionStatus, UserType } from '../utils/enums.util';
import PaymentLink from '../models/PaymentLink.model';
import invoiceService from '../services/invoice.service';
import { CreateInvoiceRequestDTO, UpdateInvoiceDTO } from '../dtos/invoice.dto';
import Transaction from '../models/Transaction.model';
import { FilterTransactionDTO } from '../dtos/transaction.dto';
import TransactionService from '../services/transaction.service';
import TransactionRepository from '../repositories/transaction.repository';
import UserService from '../services/user.service';

/**
 * @name getInvoices
 * @description Get reource from database
 * @route GET /vace/v1/invoices
 */
export const getInvoices = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);   
});

/**
 * @name getInvoice
 * @description Get a reource from database
 * @route GET /vace/v1/invoices/:id
 */
export const getInvoice = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

    const user = await User.findOne({ _id: req.user._id }).populate([{ path: 'business' }]);

	const invoice = await Invoice.findOne({ _id: req.params.id }).populate([ 
        { path: 'business', select: '_id email officialEmail name' },
    ]);

    if(!invoice){
        return next(new ErrorResponse('Error', 404, ['invoice does not exist']))
    }

    if(user && user.userType === UserType.BUSINESS){
        
        const business: IBusinessDoc = user.business;

        if(!arrayIncludes(business.invoices, invoice._id.toString())){
            return next(new ErrorResponse('Error', 404, ['invoice does not belong to business']))
        }

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: invoice,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getLinkByUrl
 * @description Get a reource from database
 * @route GET /vace/v1/invoices/by-code/:code
 */
export const getInvoiceByCode = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const invoice = await Invoice.findOne({ code: req.params.code }).populate([ 
        { path: 'business', select: '_id email officialEmail name' },
		{ path: 'payment' }
    ]);

    if(!invoice){
        return next(new ErrorResponse('Error', 404, ['invoice does not exist']))
    }

    if(invoice.isEnabled === false){
        return next(new ErrorResponse('Error', 422, ['invoice is currently disaled']))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: invoice,
        message: 'successful',
        status: 200
    })

});

/**
 * @name getInvoiceTransactions
 * @description Get a reource from database
 * @route GET /vace/v1/invoices/transactions/:id
 */
export const getInvoiceTransactions = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const invoice = await Invoice.findOne({ _id: req.params.id });

    if(!invoice){
        return next(new ErrorResponse('Error', 404, ['invoice does not exist']))
    }

    const result = await advanced(Transaction, [], 'status', req, 'invoice', invoice._id, null, 'relative');

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
 * @route POST /vace/v1/invoices/filter-transactions/:id
 * @access Superadmin | Admin
 */
export const filterTransactions = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	let analytics: any = {};
    let result: IPagination = { count: 0, total: 0, data: [], pagination: { next: { limit: 0, page: 1 }, prev: { limit: 0, page: 1 } } }

	const body = req.body as FilterTransactionDTO;
	const { type } = req.body as FilterTransactionDTO;

	const invoice = await Invoice.findOne({ _id: req.params.id });

    if(!invoice){
        return next(new ErrorResponse('Error', 404, ['invoice link does not exist']))
    }

	// define basic parameters
	const filters = TransactionService.defineFilterQuery(body);
	const pop = [
		{ path: 'business', select: '_id email officialEmail name, products' }
	]

	// process normal filter
	if(!type){

		const query: ISearchQuery = {
			model: Transaction,
			ref: 'invoice',
			value: invoice._id,
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
            ref: 'invoice',
			value: invoice._id,
            data: filters,
            query: null,
            queryParam: req.query,
            populate: pop,
            operator: 'and'
        }

        result = await search(query); // search from DB
        analytics = await TransactionRepository.aggregateFilterAnalytics({
            user,
            model: { invoice: invoice._id }, 
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
 * @route POST /vace/v1/invoices/search-transactions/:id
 * @access Business
 */
export const searchTransactions = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const { reference } = req.body;

	if(!reference){
		return next(new ErrorResponse('Error', 400, [`reference is required`]))
	}

    const invoice = await Invoice.findOne({ _id: req.params.id })

    if(!invoice){
        return next(new ErrorResponse('Error', 404, ['invoice link does not exist']))
    }

	const pop = [
		{ path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
	]

	const query: ISearchQuery = {
		model: Transaction,
		ref: 'invoice',
		value: invoice._id,
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
 * @name searchInvoices
 * @description Get a reource from database
 * @route POST /vace/v1/invoices/search
 * @access Superadmin | Admin
 */
export const searchInvoices = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const { key } = req.body;

	if(!key){
		return next(new ErrorResponse('Error', 400, [`search key is required`]))
	}

	const pop: Array<any> = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]

	const query: ISearchQuery = {
		model: Invoice,
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
 * @name filterProducts
 * @description Get a reource from database
 * @route POST /vace/v1/invoices/filter
 * @access Superadmin | Admin
 */
export const filterInvoices = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const body = req.body as FilterProductDTO;

	const filters = InvoiceService.defineFilterQuery(body);

	const pop = [
		{ path: 'business', select: '_id email officialEmail name, products' }
	]

	const query: ISearchQuery = {
		model: Invoice,
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
 * @name createInvoice
 * @description Create a reource in the database
 * @route POST /vace/v1/invoices/:id
 * @access Superadmin | Admin | Business
 */
export const createInvoice = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const {  name, items, vat, dueAt, number, recipient, description, partial, isLink } = req.body as CreateInvoiceRequestDTO

	const validate = await InvoiceService.validateCreateInvoice(req.body);

    if(validate.error){
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

	const business = await Business.findOne({ _id: req.params.id }).populate([{ path: 'user' }, { path: 'settings' }])

    if(!business){
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    if(!BusinessService.isCompliant(business.user)){
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    const settings: ISettingDoc = business.settings;

    if(settings.invoice === SettingStatusType.INACTIVE){
        return next(new ErrorResponse('Error', 403, [`invoice is deactivated on account. contact support`]))
    }

	const split = dueAt.split(' ');

	if(split.length === 1){
		return next(new ErrorResponse('Error', 400, ['incorrect date and time format. use \"YYYY/MM/DD HH:mm:ss\"']))
	}else{

		if(!checkDateFormat(split[0])){
			return next(new ErrorResponse('Error', 400, ['incorrect date format. use YYYY/MM/DD or YYYY-MM-DD']))
		}
	
		if(!checkTimeFormat(split[1])){
			return next(new ErrorResponse('Error', 400, ['incorrect time format. use HH:mm:ss']))
		}

	}

	let generateLink: boolean = !notDefined(isLink, true) ? isLink : false;
	const create = await InvoiceService.createInvoice({
		business,
		description,
		dueAt,
		items,
		name,
		number,
		partial,
		recipient,
		vat,
		isLink: generateLink
	});

	if(create.error){
		return next(new ErrorResponse('Error', create.code!, [`${create.message}`], create.data))
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
 * @name enableInvoice
 * @description Update a reource in the database
 * @route PUT /vace/v1/invoices/enable/:id
 * @access Superadmin | Admin | Business
 */
export const enableInvoice = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const user = await User.findOne({ _id: req.user._id }).populate([
        { path: 'business'}
    ]);

    const invoice = await Invoice.findOne({ _id: req.params.id })

    if(!invoice){
        return next(new ErrorResponse('Error', 404, ['Invoice does not exist']))
    }

	if(user && user.userType === UserType.BUSINESS){

        const business: IBusinessDoc = user.business;

        if(!arrayIncludes(business.invoices, invoice._id.toString())){
            return next(new ErrorResponse('Error', 403, ['invoice does not belong to business']))
        }

    }

    if(invoice.isEnabled === false){
        invoice.isEnabled = true;
        await invoice.save();
    }
    
	res.status(200).json({
		error: false,
		errors: [],
		data: {
			name: invoice.name,
            link: invoice.link,
            isEnabled: invoice.isEnabled
		},
		message: 'successful',
		status: 200
	})
});

/**
 * @name disableInvoice
 * @description Update a reource in the database
 * @route PUT /vace/v1/invoices/disable/:id
 * @access Superadmin | Admin | Business
 */
export const disableInvoice = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const user = await User.findOne({ _id: req.user._id }).populate([{ path: 'business' }]);

    const invoice = await Invoice.findOne({ _id: req.params.id })

    if(!invoice){
        return next(new ErrorResponse('Error', 404, ['payment does not exist']))
    }

	if(user && user.userType === UserType.BUSINESS){

        const business: IBusinessDoc = user.business;

        if(!arrayIncludes(business.invoices, invoice._id.toString())){
            return next(new ErrorResponse('Error', 403, ['invoice does not belong to business']))
        }

    }

    if(invoice.isEnabled === true){
        invoice.isEnabled = false;
        await invoice.save();
    }

	res.status(200).json({
		error: false,
		errors: [],
		data: {
            name: invoice.name,
            link: invoice.link,
            isEnabled: invoice.isEnabled
        },
		message: 'successful',
		status: 200
	})

});

/**
 * @name removeItem
 * @description Update a reource in the database
 * @route PUT /vace/v1/invoices/remove-item/:id
 * @access Superadmin | Admin | Business
 */
export const removeItem = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const label = req.body.label as string;

	if(!label){
        return next(new ErrorResponse('Error', 400, ['split label is required']))
    }

	const user = await User.findOne({ _id: req.user._id }).populate([{ path: 'business' }]);

	const invoice = await Invoice.findOne({ _id: req.params.id })

    if(!invoice){
        return next(new ErrorResponse('Error', 404, ['payment does not exist']))
    }

    if(invoice.status === TransactionStatus.PAID){
        return next(new ErrorResponse('Error', 422, ['invoice is already paid']))
    }

	if(user && user.userType === UserType.BUSINESS){

        const business: IBusinessDoc = user.business;

        if(!arrayIncludes(business.invoices, invoice._id.toString())){
            return next(new ErrorResponse('Error', 403, ['invoice does not belong to business']))
        }

    }

	if(invoice.items.length === 1){
        return next(new ErrorResponse('Error', 403, ['cannot delete last invoice item']))
    }

    let currentList = invoice.items;
    let item = currentList.find((x) => x.label === label);

    if(item){

        const filtered = currentList.filter((x) => x.label !== label);
        invoice.items = filtered;

		// calculate summary
		const summary = await InvoiceService.calculateSummary({ 
			items: invoice.items, 
			partial: invoice.summary.partialAmount, 
			VAT: invoice.VAT 
		});

		invoice.summary = {
			subtotal: summary.subtotal,
			totalAmount: summary.totalAmount,
			partialAmount: summary.partialAmount,
            amountPaid: 0,
            paidAt: null
		};

		await invoice.save();

    }

	res.status(200).json({
		error: false,
		errors: [],
		data: {
            items: invoice.items,
            summary: invoice.summary
        },
		message: 'successful',
		status: 200
	})

});

/**
 * @name updateInvoice
 * @description Update a reource in the database
 * @route PUT /vace/v1/invoices/:id
 * @access Superadmin | Admin | Business
 */
export const updateInvoice = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const allowedTypes = ['percentage', 'flat']
	const {  name, items, vat, dueAt, number, recipient, description, partial } = req.body as UpdateInvoiceDTO

	const user = await User.findOne({ _id: req.user._id }).populate([{ path: 'business' }]);

	let invoice = await Invoice.findOne({ _id: req.params.id }).populate([
		{ path: 'business', populate: [
            { path: 'user' }
        ] },
		{ path: 'payment' }
	])

    if(!invoice){
        return next(new ErrorResponse('Error', 404, ['Invoice does not exist']))
    }

	if(invoice.status === TransactionStatus.PAID){
		return next(new ErrorResponse('Error', 403, ['cannot update a paid invoice']))
	}

	if(user && user.userType === UserType.BUSINESS){

        const business: IBusinessDoc = user.business;

        if(!arrayIncludes(business.invoices, invoice._id.toString())){
            return next(new ErrorResponse('Error', 403, ['invoice does not belong to business']))
        }

    }

	const business: IBusinessDoc = invoice.business;
	const paymentLink: IPaymentLinkDoc = invoice.payment;

    if(!BusinessService.isCompliant(business.user)){
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

	if(items && items.length > 0){

		const validate = await InvoiceService.validateItems(items);

		if(validate.error){
            return next(new ErrorResponse('Error', 404, [`${validate.message}`]))
        }

	}

	if(number){

		const exist = await InvoiceService.invoiceExists({ business, number, check: 'number' });

		if(exist.error){
			return next(new ErrorResponse('Error', exist.code!, [`${exist.message}`]))
		}

	}

	if(name){

		const exist = await InvoiceService.invoiceExists({ business, name, check: 'name' });

		if(exist.error){
			return next(new ErrorResponse('Error', exist.code!, [`${exist.message}`]))
		}

	}

	if(dueAt){

		const split = dueAt.split(' ');

		if(split.length === 1){
			return next(new ErrorResponse('Error', 400, ['incorrect date and time format. use \"YYYY/MM/DD HH:mm:ss\"']))
		}else{

			if(!checkDateFormat(split[0])){
				return next(new ErrorResponse('Error', 400, ['incorrect date format. use YYYY/MM/DD or YYYY-MM-DD']))
			}
		
			if(!checkTimeFormat(split[1])){
				return next(new ErrorResponse('Error', 400, ['incorrect time format. use HH:mm:ss']))
			}

		}

	}

	if(vat && vat.type && !arrayIncludes(allowedTypes, vat.type)){
		return next(new ErrorResponse('Error', 400, [`invalid vat (tax) type. choose from ${allowedTypes.join(', ')}`]))
	}

	if(vat && isNeg(vat.value)){
		return next(new ErrorResponse('Error', 400, [`vat (tax) value cannot be negative`]))
	}

	if(vat && vat.value && hasDecimal(vat.value) && !isPrecise({ value: vat.value, length: 2 })){
		return next(new ErrorResponse('Error', 400, [`vat (tax) value is required to have 2 decimals`]))
	}

	invoice.name = name ? name : invoice.name;
	invoice.number = number ? number : invoice.number;
	invoice.description = description ? description : invoice.description;

	if(dueAt){

		let dueFormat = SystemService.formatISO(dateToday(dueAt).ISO);
		invoice.dueAt = {
			date: dueFormat.date,
			time: dueFormat.time,
			ISO: dateToday(dueAt).ISO
		}

	}

	if(vat){
		invoice.VAT = {
			title: vat.title ? vat.title : invoice.VAT.title,
			type: vat.type ? vat.type : invoice.VAT.type,
			value: vat.value ? vat.value : invoice.VAT.value
		}
	}

	if(recipient){
		invoice.recipient = {
			email: recipient.email ? recipient.email : invoice.recipient.email,
			firstName: recipient.firstName ? recipient.firstName : invoice.recipient.firstName,
			lastName: recipient.lastName ? recipient.lastName : invoice.recipient.lastName,
			address: recipient.address ? recipient.address : invoice.recipient.address,
			businessName: recipient.businessName ? recipient.businessName : invoice.recipient.businessName,
			city: recipient.city ? recipient.city : invoice.recipient.city,
			state: recipient.state ? recipient.state : invoice.recipient.state,
			phoneCode: recipient.phoneCode ? recipient.phoneCode : invoice.recipient.phoneCode,
			phoneNumber: recipient.phoneNumber ? recipient.phoneNumber : invoice.recipient.phoneNumber,
			type: recipient.type ? recipient.type : invoice.recipient.type,
			countryCode: recipient.countryCode ? recipient.countryCode : invoice.recipient.countryCode
		}
	}

	if(items && items.length > 0){

		invoice = await InvoiceService.updateInvoiceItems(invoice, items);

		// calculate summary
		const summary = await InvoiceService.calculateSummary({ 
			items: invoice.items, 
			partial: isZero(partial) || partial > 0 ? partial : invoice.summary.partialAmount, 
			VAT: invoice.VAT 
		});

		invoice.summary = {
			subtotal: summary.subtotal,
			totalAmount: summary.totalAmount,
			partialAmount: summary.partialAmount,
            amountPaid: 0,
            paidAt: null
		}

		// update payment link if available
		if(paymentLink){
			paymentLink.amount = invoice.summary.totalAmount;
			paymentLink.type = 'fixed';
			await paymentLink.save();
		}

	}

	await invoice.save();
	
	res.status(200).json({
		error: false,
		errors: [],
		data: invoice,
		message: 'successful',
		status: 200
	})

});


