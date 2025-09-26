import crypto from 'crypto';
import mongoose, { ObjectId, Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { asyncHandler, strIncludesEs6, arrayIncludes, isString, UIID, isZero, notDefined, isPos, hasDecimal, isPrecise, dateToday, hasSAC } from '@btffamily/vacepay'
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
import { IAccountDoc, IBusinessDoc, IInvoiceDoc, IPagination, IPaymentLinkDoc, IProductDoc, IProviderDoc, IResult, ISearchQuery, ISettingDoc, ITransactionDoc, IUserDoc, IWalletDoc } from '../utils/types.util';
import { advanced, search } from '../utils/result.util';
import Account from '../models/Account.model';
import { BusinessType, CurrencyType, FeatureType, PaymentLinkType, PrefixType, ProviderNameType, SettingStatusType, TransactionFeatureType, TransactionStatus, UserType } from '../utils/enums.util';
import Product from '../models/Product.model';
import { CreateProductDTO } from '../dtos/product.dto';
import ProductService from '../services/product.service';
import PaymentLink from '../models/PaymentLink.model';
import { AttachLinkResourceDTO, ChargeCardTransactionDTO, CreatePaymentLinkDTO, CreateTransferTransactionDTO, FilterPaymentLinkDTO, UpdatePaymentLinkDTO } from '../dtos/payment.link.dto';
import Transaction from '../models/Transaction.model';
import BusinessService from '../services/business.service';
import ProviderService from '../services/provider.service';
import baniService from '../services/providers/bani.service';
import TransactionService from '../services/transaction.service';
import { FilterTransactionDTO } from '../dtos/transaction.dto';
import { PaystackResponseDTO } from '../dtos/providers/paystack.dto';
import NinepsbService from '../services/providers/ninepsb.service';
import { PSBApiResponseDTO } from '../dtos/providers/ninepsb.dto';
import BankService from '../services/bank.service';
import Invoice from '../models/Invoice.model';
import Provider from '../models/Provider.model';
import Subaccount from '../models/Subaccount.model';
import CardService from '../services/card.service';
import TransactionRepository from '../repositories/transaction.repository';
import UserService from '../services/user.service';
import PaymentLinkRepository from '../repositories/payment.link.repository';
import PaymentLinkService from '../services/payment.link.service';

/**
 * @name getProducts
 * @description Get reource from database
 * @route GET /vace/v1/paymentlinks
 */
export const getPaymentLinks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json(res.advancedResults);
});

/**
 * @name getPaymentLink
 * @description Get a reource from database
 * @route GET /vace/v1/paymentlinks/:id
 */
export const getPaymentLink = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const user = await User.findOne({ _id: req.user._id }).populate([{ path: 'business' }]);

    let paymentLink = await PaymentLink.findOne({ _id: req.params.id }).populate([
        { path: 'business', select: '_id email officialEmail name' },
        { path: 'transactions', select: '_id amount reference createdAt updatedAt' },
        { path: 'product' },
        { path: 'invoice' },
        { path: 'subaccounts' }
    ]);

    if (!paymentLink) {
        return next(new ErrorResponse('Error', 404, ['payment link does not exist']))
    }

    if (user && user.userType === UserType.BUSINESS) {

        const business: IBusinessDoc = user.business;

        if (!arrayIncludes(business.payments, paymentLink._id.toString())) {
            return next(new ErrorResponse('Error', 404, ['payment link does not belong to business']))
        }

    }

    // capture today's inflow
    paymentLink = await PaymentLinkService.updateAnalytics(paymentLink)

    res.status(200).json({
        error: false,
        errors: [],
        data: paymentLink,
        message: 'successful',
        status: 200
    })

});

/**
 * @name getLinkByUrl
 * @description Get a reource from database
 * @route GET /vace/v1/paymentlinks/url/:slug
 */
export const getLinkByUrl = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const paymentLink = await PaymentLink.findOne({ slug: req.params.slug }).populate([
        { path: 'business', select: '_id email officialEmail name' },
        { path: 'product' },
        { path: 'invoice' },
        { path: 'subaccounts' }
    ]);

    if (!paymentLink) {
        return next(new ErrorResponse('Error', 404, ['payment link does not exist']))
    }

    if (paymentLink.isEnabled === false) {
        return next(new ErrorResponse('Error', 422, ['payment link is currently disaled']))
    }

    if (paymentLink.feature === FeatureType.PRODUCT && !paymentLink.product) {
        return next(new ErrorResponse('Error', 403, ['product not attached to payment link']))
    }

    if (paymentLink.feature === FeatureType.INVOICE && !paymentLink.invoice) {
        return next(new ErrorResponse('Error', 403, ['invoice not attached to payment link']))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: paymentLink,
        message: 'successful',
        status: 200
    })

});

/**
 * @name getPaymentlinkTransactions
 * @description Get a reource from database
 * @route GET /vace/v1/paymentlinks/transactions/:id
 */
export const getPaymentlinkTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const payment = await PaymentLink.findOne({ _id: req.params.id });

    if (!payment) {
        return next(new ErrorResponse('Error', 404, ['payment does not exist']))
    }

    const result = await advanced(Transaction, [], 'status', req, 'payment', payment._id, null, 'absolute');

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
 * @route POST /vace/v1/paymentlinks/filter-transactions/:id
 * @access Superadmin | Admin
 */
export const filterTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let analytics: any = {};
    let result: IPagination = { count: 0, total: 0, data: [], pagination: { next: { limit: 0, page: 1 }, prev: { limit: 0, page: 1 } } }

    const body = req.body as FilterTransactionDTO;
    const { type } = req.body as FilterTransactionDTO;

    const paymentLink = await PaymentLink.findOne({ _id: req.params.id })

    if (!paymentLink) {
        return next(new ErrorResponse('Error', 404, ['payment link does not exist']))
    }

    const filters = TransactionService.defineFilterQuery(body);
    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]

    // process normal filter
    if (!type) {

        const query: ISearchQuery = {
            model: Transaction,
            ref: 'payment',
            value: paymentLink._id,
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
            ref: 'payment',
            value: paymentLink._id,
            data: filters,
            query: null,
            queryParam: req.query,
            populate: pop,
            operator: 'and'
        }

        result = await search(query); // search from DB
        analytics = await TransactionRepository.aggregateFilterAnalytics({
            user,
            model: { payment: paymentLink._id },
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
 * @route POST /vace/v1/paymentlinks/search-transactions/:id
 * @access Business
 */
export const searchTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { reference } = req.body;

    if (!reference) {
        return next(new ErrorResponse('Error', 400, [`reference is required`]))
    }

    const paymentLink = await PaymentLink.findOne({ _id: req.params.id })

    if (!paymentLink) {
        return next(new ErrorResponse('Error', 404, ['payment link does not exist']))
    }

    const pop = [
        { path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
    ]

    const query: ISearchQuery = {
        model: Transaction,
        ref: 'payment',
        value: paymentLink._id,
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
 * @name searchPaymentLinks
 * @description Get a reource from database
 * @route POST /vace/v1/paymentlinks/search
 * @access Superadmin | Admin
 */
export const searchPaymentLinks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { key } = req.body;

    if (!key) {
        return next(new ErrorResponse('Error', 400, [`search key is required`]))
    }

    const pop = [
        { path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
    ]

    const query: ISearchQuery = {
        model: PaymentLink,
        ref: null,
        value: null,
        data: [
            { name: { $regex: key, $options: 'i' } },
            { labelUrl: { $regex: key, $options: 'i' } },
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
 * @route POST /vace/v1/paymentlinks/filter
 * @access Superadmin | Admin
 */
export const filterPaymentLinks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as FilterPaymentLinkDTO;

    const filters = PaymentLinkService.defineFilterQuery(body);

    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]

    const query: ISearchQuery = {
        model: PaymentLink,
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
 * @name createPaymentLink
 * @description Create a reource in the database
 * @route POST /vace/v1/paymentlinks/:id
 * @access Superadmin | Admin | Business
 */
export const createPaymentLink = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { name, feature, type, amount, invoiceId, productId, redirectUrl, message, slug, description, splits } = req.body as CreatePaymentLinkDTO;

    const validate = await PaymentLinkService.validateCreateLink(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    if (splits && splits.length > 0) {

        const check = await PaymentLinkService.validateSplits(splits);

        if (check.error) {
            return next(new ErrorResponse('Error', 400, [`${check.message}`]))
        }

    }

    const business = await Business.findOne({ _id: req.params.id }).populate([{ path: 'user' }, { path: 'settings' }])

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    if (!BusinessService.isCompliant(business.user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    if (slug && hasSAC(slug)) {
        return next(new ErrorResponse('Error', 404, ['invalid URL. remove spaces and special characters']))
    }

    const settings: ISettingDoc = business.settings;

    if (feature === FeatureType.INVOICE && settings.paymentLink.invoice === SettingStatusType.INACTIVE) {
        return next(new ErrorResponse('Error', 403, [`invoice payment link is deactivated on account. contact support`]))
    }

    if (feature === FeatureType.PRODUCT && settings.paymentLink.product === SettingStatusType.INACTIVE) {
        return next(new ErrorResponse('Error', 403, [`product payment link is deactivated on account. contact support`]))
    }

    if (feature === FeatureType.REQUEST && settings.paymentLink.request === SettingStatusType.INACTIVE) {
        return next(new ErrorResponse('Error', 403, [`request payment link is deactivated on account. contact support`]))
    }

    const create = await PaymentLinkService.createPaymentLink({
        business,
        name,
        feature,
        type,
        amount,
        invoiceId,
        productId,
        redirectUrl,
        message,
        slug,
        description,
        splits: splits,
    });

    if (create.error) {
        return next(new ErrorResponse('Error', 403, [`${create.message}`]))
    }

    const payment: IPaymentLinkDoc = create.data;

    res.status(200).json({
        error: false,
        errors: [],
        data: payment,
        message: 'successful',
        status: 200
    })

});

/**
 * @name enablePaymentLink
 * @description Update a reource in the database
 * @route PUT /vace/v1/paymentlinks/enable/:id
 * @access Superadmin | Admin | Business
 */
export const enablePaymentLink = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const user = await User.findOne({ _id: req.user._id }).populate([
        { path: 'business' }
    ]);

    const payment = await PaymentLink.findOne({ _id: req.params.id })

    if (!payment) {
        return next(new ErrorResponse('Error', 404, ['payment does not exist']))
    }

    if (user && user.userType === UserType.BUSINESS) {

        const business: IBusinessDoc = user.business;

        if (!arrayIncludes(business.payments, payment._id.toString())) {
            return next(new ErrorResponse('Error', 403, ['payment link does not belong to business']))
        }

        if (!BusinessService.isCompliant(user)) {
            return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
        }

    }

    if (payment.feature === FeatureType.PRODUCT && !payment.product) {
        return next(new ErrorResponse('Error', 422, ['attach product to payment link']))
    }

    if (payment.feature === FeatureType.INVOICE && !payment.invoice) {
        return next(new ErrorResponse('Error', 422, ['attach invoice to payment link']))
    }

    if (payment.isEnabled === false) {
        payment.isEnabled = true;
        await payment.save();
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            name: payment.name,
            link: payment.link,
            isEnabled: payment.isEnabled
        },
        message: 'successful',
        status: 200
    })

});

/**
 * @name disablePaymentLink
 * @description Update a reource in the database
 * @route PUT /vace/v1/paymentlinks/disable/:id
 * @access Superadmin | Admin | Business
 */
export const disablePaymentLink = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const user = await User.findOne({ _id: req.user._id }).populate([{ path: 'business' }]);

    const payment = await PaymentLink.findOne({ _id: req.params.id })

    if (!payment) {
        return next(new ErrorResponse('Error', 404, ['payment does not exist']))
    }

    if (user && user.userType === UserType.BUSINESS) {

        const business: IBusinessDoc = user.business;

        if (!arrayIncludes(business.payments, payment._id.toString())) {
            return next(new ErrorResponse('Error', 403, ['payment link does not belong to business']))
        }

    }

    if (payment.isEnabled === true) {
        payment.isEnabled = false;
        await payment.save();
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            name: payment.name,
            link: payment.link,
            isEnabled: payment.isEnabled
        },
        message: 'successful',
        status: 200
    })

});

/**
 * @name createTransferTransaction
 * @description Create a reource in the database
 * @route POST /vace/v1/paymentlinks/create-transaction/:id
 * @access  Business
 */
export const createTransferTransaction = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const providerName = await ProviderService.configProviderName('bank');
    let tempAccount: IResult = { error: false, message: '', code: 200, data: null }
    let bank: any = {}; let newAmount: number = 0, QTY: number = 0;

    const { firstName, lastName, amount, email, phoneNumber, phoneCode, quantity } = req.body as CreateTransferTransactionDTO;

    const validate = await PaymentLinkService.validateCreateTransfer(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    const paymentLink = await PaymentLink.findOne({ _id: req.params.id }).populate([
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
                { path: 'banks.details' }
            ]
        },
        { path: 'product' },
        { path: 'invoice' },
    ])

    if (!paymentLink) {
        return next(new ErrorResponse('Error', 404, ['payment link does not exist']))
    }

    if (paymentLink.type === PaymentLinkType.DYNAMIC) {
        
        if (notDefined(amount) || isNaN(amount!) || isZero(amount)) {
            return next(new ErrorResponse('Error', 400, ['amount is required']))
        }

        if (amount && !isPos(amount)) {
            return next(new ErrorResponse('Error', 400, ['amount cannot be negative']))
        }
    
        if (amount && hasDecimal(amount) && !isPrecise({ value: amount, length: 2 })) {
            return next(new ErrorResponse('Error', 400, ['amount should have just 2 decimals']))
        }

        if (amount && amount < 500) {
            return next(new ErrorResponse('Error', 400, ['minimum expected amount is 500']))
        }

    }

    if(paymentLink.initialized === true){

        const isExisting = await TransactionService.transactionExists({ type: 'reference', reference: paymentLink.initializeRef })

        if(isExisting){
            return next(new ErrorResponse('Error', 404, [`initialized transaction ${paymentLink.initializeRef} already exists`]))
        }

    }

    const business: IBusinessDoc = paymentLink.business;
    const user: IUserDoc = business.user;
    const invoice: IInvoiceDoc = paymentLink.invoice;
    const product: IProductDoc = paymentLink.product;

    // disable payment link if business is not compliant
    if (!BusinessService.isCompliant(user)) {

        paymentLink.isEnabled = false;
        await paymentLink.save();

        return next(new ErrorResponse('Error', 422, [`payment link disabled. business is not compliant`]));

    }

    if (business.accounts.length === 0) {
        return next(new ErrorResponse('Error', 500, [`bank account has not been generated. contact support`]));
    }

    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
    const provider: IProviderDoc = account.provider
    const wallet: IWalletDoc = business.wallet;

    if (!account) {
        return next(new ErrorResponse('Error', 404, ['account does not exist']))
    }

    const txnref = TransactionService.generateRef(); // generate reference

    if (paymentLink.feature === FeatureType.INVOICE && invoice) {
        newAmount = invoice.summary.totalAmount - invoice.summary.amountPaid;
    } else if (paymentLink.feature === FeatureType.PRODUCT && product) {
        QTY = notDefined(quantity) || isZero(quantity) ? 1 : quantity;
        newAmount = product.price * QTY;
    } else {
        newAmount = paymentLink.type === 'fixed' ? paymentLink.amount : amount!
    }

    if (newAmount < 500) {
        return next(new ErrorResponse('Error', 400, ['minimum expected amount is 500']))
    }

    if (provider.name === ProviderNameType.BANI) {

        tempAccount = await baniService.generateAccount({
            accountType: 'temporary',
            currency: 'NGN',
            countryCode: 'NG',
            step: 'direct',
            amount: newAmount,
            customerRef: account.customer.reference,
            reference: txnref.toString(),
            bvnNumber: business.legal.bvnNumber,
            nameOnly: false,
            accountName: business.name,
        })

        if (tempAccount.error) {
            return next(new ErrorResponse('Error', 500, [`could not generate account: ${tempAccount.message}`]))
        }

        // set bank
        bank = {
            name: tempAccount.data.holder_bank_name,
            accountName: tempAccount.data.account_name,
            accountNo: tempAccount.data.holder_account_number,
            expire: {
                hours: 1,
                minutes: 0,
                date: dateToday(Date.now()).ISO
            },
            logo: tempAccount.data.bank_logo
        }

    }

    if (provider.name === ProviderNameType.NINEPSB) {

        tempAccount = await NinepsbService.generateAccount({
            reference: txnref,
            accountType: 'dynamic',
            amount: newAmount,
            amountType: 'higher-exact',
            country: 'NGA',
            currency: 'NGN',
            description: `incoming transfer payment via payment link to ${business.name}`,
            customer: {
                firstName: user.firstName,
                lastName: user.lastName
            }
        });

        if (tempAccount.error) {
            return next(new ErrorResponse('Error', 500, [`could not generate account: ${tempAccount.message}`], tempAccount.data))
        }

        const _response: PSBApiResponseDTO = tempAccount.data;
        const code: string = (process.env.NINEPSB_BANK_CODE || '120001').toString();
        const foundBank = await BankService.getBank(code, provider.name);

        // set bank
        bank = {
            name: foundBank?.name,
            accountName: _response.customer.account.name,
            accountNo: _response.customer.account.number,
            expire: {
                hours: _response.customer.account.expiry.hours,
                minutes: 0,
                date: _response.customer.account.expiry.date
            },
            logo: ''
        }

    }

    // create transaction
    const transaction = await TransactionService.createPaymentLinkTransaction({
        option: 'transfer',
        type: 'credit',
        business,
        wallet,
        provider,
        isWebhook: false,
        reference: txnref.toString(),
        feature: TransactionFeatureType.PAYMENT_LINK,
        customer: {
            firstName: firstName,
            lastName: lastName,
            email: email,
            phoneNumber: phoneNumber,
            phoneCode
        },
        bank: bank,
        amount: newAmount,
        payment: paymentLink,
        invoice: invoice,
        product: product,
        quantity: QTY
    });

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            name: transaction.bank.name,
            accountName: transaction.bank.accountName,
            accountNo: transaction.bank.accountNo,
            expire: transaction.bank.expire,
            reference: transaction.reference
        },
        message: 'successful',
        status: 200
    })

});

/**
 * @name chargeCardTransaction
 * @description Create a reource in the database
 * @route POST /vace/v1/paymentlinks/charge-card/:id
 * @access  Business
 */
export const chargeCardTransaction = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let response: IResult = { error: false, message: '', code: 200, data: null }
    let newAmount: number = 0, QTY: number = 0;

    const { chargeType, validateType, callbackUrl, reference, card, authorize, amount, customer, quantity } = req.body as ChargeCardTransactionDTO;

    const cardProviderName = await ProviderService.configProviderName('card');

    const validate = await PaymentLinkService.validateChargeCard(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    const paymentLink = await PaymentLink.findOne({ _id: req.params.id }).populate([
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
                { path: 'banks.details' }
            ]
        },
        { path: 'product' },
        { path: 'invoice' },
    ])

    if (!paymentLink) {
        return next(new ErrorResponse('Error', 404, ['payment link does not exist']))
    }

    if (paymentLink.type === PaymentLinkType.DYNAMIC) {
        
        if (notDefined(amount) || isNaN(amount!) || isZero(amount)) {
            return next(new ErrorResponse('Error', 400, ['amount is required']))
        }

        if (amount && !isPos(amount)) {
            return next(new ErrorResponse('Error', 400, ['amount cannot be negative']))
        }
    
        if (amount && hasDecimal(amount) && !isPrecise({ value: amount, length: 2 })) {
            return next(new ErrorResponse('Error', 400, ['amount should have just 2 decimals']))
        }

        if (amount && amount < 500) {
            return next(new ErrorResponse('Error', 400, ['minimum expected amount is 500']))
        }

    }

    if(paymentLink.initialized === true){

        const isExisting = await TransactionService.transactionExists({ type: 'reference', reference: paymentLink.initializeRef })

        if(isExisting){
            return next(new ErrorResponse('Error', 404, [`initialized transaction ${paymentLink.initializeRef} already exists`]))
        }

    }

    const business: IBusinessDoc = paymentLink.business;
    const user: IUserDoc = business.user;
    const invoice: IInvoiceDoc = paymentLink.invoice;
    const product: IProductDoc = paymentLink.product;

    // disable payment link if business is not compliant
    if (!BusinessService.isCompliant(user)) {

        paymentLink.isEnabled = false;
        await paymentLink.save();

        return next(new ErrorResponse('Error', 422, [`payment link disabled. business is not compliant`]));

    }

    if (business.accounts.length === 0) {
        return next(new ErrorResponse('Error', 500, [`bank account has not been generated`]));
    }

    const provider = await Provider.findOne({ name: cardProviderName });
    const wallet: IWalletDoc = business.wallet;

    if (paymentLink.feature === FeatureType.INVOICE && invoice) {
        newAmount = invoice.summary.totalAmount - invoice.summary.amountPaid;
    } else if (paymentLink.feature === FeatureType.PRODUCT && product) {
        QTY = notDefined(quantity) || isZero(quantity) ? 1 : quantity;
        newAmount = product.price * QTY;
    } else {
        newAmount = paymentLink.type === 'fixed' ? paymentLink.amount : amount!
    }

    if (newAmount < 500) {
        return next(new ErrorResponse('Error', 400, ['minimum expected amount is 500']))
    }

    if (provider && provider.name === ProviderNameType.PAYSTACK) {

        if (chargeType === 'card') {

            response = await PaymentLinkService.chargeLinkCard({
                business,
                provider,
                payment: paymentLink,
                chargeType,
                validateType,
                amount: newAmount,
                callbackUrl,
                wallet,
                quantity: QTY,
                customer: {
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    email: customer.email,
                    phoneNumber: customer.phoneNumber,
                    phoneCode: customer.phoneCode ? customer.phoneCode : '+234',
                },
                card: {
                    number: card?.number.trim(),
                    cvv: card?.cvv.trim(),
                    expiryMonth: card?.expiryMonth.trim(),
                    expiryYear: card?.expiryYear.trim(),
                    name: card.name
                }
            });

        }

        if (chargeType === 'validate' && validateType && reference) {

            if (authorize && validateType === 'address') {

                if (authorize.address && typeof (authorize.address) !== 'object') {
                    return next(new ErrorResponse('Error', 400, ['address data is required to be an object']))
                }

            }

            const transaction = await TransactionRepository.findByReferenceAndSelectCard(reference, true);

            if (!transaction) {
                return next(new ErrorResponse('Error', 400, ['transaction does not exist']))
            }

            response = await PaymentLinkService.chargeLinkCard({
                business,
                provider,
                payment: paymentLink,
                chargeType,
                validateType,
                amount: newAmount,
                callbackUrl,
                wallet,
                customer: {
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    email: customer.email,
                    phoneNumber: customer.phoneNumber,
                    phoneCode: customer.phoneCode ? customer.phoneCode : '+234',
                },
                reference: reference,
                authorize: {
                    pin: authorize.pin.trim(),
                    otp: authorize.otp.trim(),
                    phone: authorize.phone.trim(),
                    birthday: authorize.birthday,
                    address: authorize.address
                }
            });

            // update transaction if there is an internal server error
            if (response.error && response.code! === 500) {
                transaction.status = TransactionStatus.FAILED;
                await transaction.save();
            }

        }

        // map the client response
        if (response.error === false && response.code === 200) {

            const _response: PaystackResponseDTO = response.data;
            response.data = {
                reference: _response.reference,
                paidAt: _response.paid_at,
                createdAt: _response.created_at,
                channel: _response.channel,
                currency: _response.currency,
                ipAddress: _response.ip_address,
                amount: (_response.amount / 100),
                customer: customer
            }

        }
    }

    res.status(response.code ? response.code : 200).json({
        error: response.error,
        errors: response.error ? [`${response.message ? response.message : ''}`] : [],
        data: response.data,
        message: response.error ? '' : response.message,
        status: response.code
    })

});

/**
 * @name attachResource
 * @description Update a reource in the database
 * @route PUT /vace/v1/paymentlinks/attach/:id
 * @access Superadmin | Admin | Business
 */
export const attachResource = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const allowed = ['product', 'invoice']
    const { type, code } = req.body as AttachLinkResourceDTO;

    if (!type) {
        return next(new ErrorResponse('Error', 400, [`attach type is required`]))
    }

    if (!arrayIncludes(allowed, type)) {
        return next(new ErrorResponse('Error', 400, [`invalid attach type value. choose from ${allowed.join(', ')}`]))
    }

    if (!code) {
        return next(new ErrorResponse('Error', 400, [`code is required`]))
    }

    const paymentLink = await PaymentLink.findOne({ _id: req.params.id }).populate([
        {
            path: 'business', populate: [
                { path: 'user' }
            ]
        }
    ])

    if (!paymentLink) {
        return next(new ErrorResponse('Error', 404, ['payment link does not exist']))
    }

    if (paymentLink.feature !== FeatureType.PRODUCT && paymentLink.feature !== FeatureType.INVOICE) {
        return next(new ErrorResponse('Error', 403, [`cannot attach resource to a ${paymentLink.feature} link`]))
    }

    const business: IBusinessDoc = paymentLink.business;

    if (!BusinessService.isCompliant(business.user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    if (type === FeatureType.PRODUCT) {

        if (paymentLink.feature !== FeatureType.PRODUCT) {
            return next(new ErrorResponse('Error', 422, [`cannot attach product to a ${paymentLink.feature} link type`]))
        }

        const product = await Product.findOne({ code: code });

        if (!product) {
            return next(new ErrorResponse('Error', 404, ['product does not exist']))
        }

        if (product.business.toString() !== paymentLink.business._id.toString()) {
            return next(new ErrorResponse('Error', 403, ['product does not belong to business']))
        }

        await PaymentLinkService.attachProduct(paymentLink, product);

    }

    if (type === FeatureType.INVOICE) {

        if (paymentLink.feature !== FeatureType.INVOICE) {
            return next(new ErrorResponse('Error', 422, [`cannot attach invoice  to a ${paymentLink.feature} link type`]))
        }

        const invoice = await Invoice.findOne({ code: code }).populate([
            { path: 'payment' }
        ]);

        if (!invoice) {
            return next(new ErrorResponse('Error', 404, ['invoice does not exist']))
        }

        if (invoice.business.toString() !== paymentLink.business._id.toString()) {
            return next(new ErrorResponse('Error', 403, ['invoice does not belong to business']))
        }

        if (invoice.status === TransactionStatus.PAID) {
            return next(new ErrorResponse('Error', 422, [`cannot attach a ${invoice.status} invoice`]))
        }

        if (invoice.payment) {
            return next(new ErrorResponse('Error', 422, [`invoice is already attached to ${invoice.payment.name} link`]))
        }

        // // change payment link type and amount
        await PaymentLinkService.attachInvoice(paymentLink, invoice);

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: paymentLink,
        message: 'successful',
        status: 200
    })

});

/**
 * @name detachSplit
 * @description Update a reource in the database
 * @route PUT /vace/v1/paymentlinks/detach-split/:id
 * @access Superadmin | Admin | Business
 */
export const detachSplit = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const user = await User.findOne({ _id: req.user._id }).populate([{ path: 'business' }]);

    const { code } = req.body;

    if (!code) {
        return next(new ErrorResponse('Error', 400, ['subaccount code is required']))
    }

    const subaccount = await Subaccount.findOne({ code: code });

    if (!subaccount) {
        return next(new ErrorResponse('Error', 404, ['subaccount does not exist']))
    }

    let payment = await PaymentLink.findOne({ _id: req.params.id }).populate([
        {
            path: 'business', populate: [
                { path: 'user' }
            ]
        }
    ])

    if (!payment) {
        return next(new ErrorResponse('Error', 404, ['payment does not exist']))
    }

    if (user && user.userType === UserType.BUSINESS) {

        const business: IBusinessDoc = user.business;

        if (!arrayIncludes(business.payments, payment._id.toString())) {
            return next(new ErrorResponse('Error', 403, ['payment link does not belong to business']))
        }

    }

    if (arrayIncludes(payment.subaccounts, subaccount._id.toString())) {

        const filtered = payment.subaccounts.filter((x) => x.toString() !== subaccount._id.toString());
        payment.subaccounts = filtered;
        await payment.save();

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: payment.subaccounts,
        message: 'successful',
        status: 200
    })

});

/**
 * @name updatePaymentLink
 * @description Update a reource in the database
 * @route PUT /vace/v1/paymentlinks/:id
 * @access Superadmin | Admin | Business
 */
export const updatePaymentLink = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const allowed = ['fixed', 'dynamic']
    const allowedFeatures = ['invoice', 'product']
    const { name, type, amount, redirectUrl, message, slug, description, feature, splits } = req.body as UpdatePaymentLinkDTO;

    let paymentLink = await PaymentLink.findOne({ _id: req.params.id }).populate([
        {
            path: 'business', populate: [
                { path: 'user' }
            ]
        },
        { path: 'invoice' },
        { path: 'product' }
    ])

    if (!paymentLink) {
        return next(new ErrorResponse('Error', 404, ['payment link does not exist']))
    }

    if (splits && splits.length > 0) {

        const validate = await PaymentLinkService.validateSplits(splits);

        if (validate.error) {
            return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
        }

    }

    const business: IBusinessDoc = paymentLink.business;
    const invoice: IInvoiceDoc = paymentLink.invoice;
    const product: IProductDoc = paymentLink.product;

    if (!BusinessService.isCompliant(business.user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    if (!notDefined(amount) && amount && !isPos(amount)) {
        return next(new ErrorResponse('Error', 403, ['amount cannot be zero']))
    }

    if (!notDefined(amount) && amount && hasDecimal(amount) && !isPrecise({ value: amount, length: 2 })) {
        return next(new ErrorResponse('Error', 403, ['amount should have only decimals']))
    }

    if (slug && slug.toLowerCase() !== paymentLink.slug) {

        if (hasSAC(slug)) {
            return next(new ErrorResponse('Error', 404, ['invalid URL. remove spaces and special characters']))
        }

        const urlExists = await PaymentLinkService.urlExists(slug);

        if (urlExists) {
            return next(new ErrorResponse('Error', 404, ['choice url already exists']))
        }

    }

    if (type) {

        if (!arrayIncludes(allowed, type)) {
            return next(new ErrorResponse('Error', 400, [`invalid type value. choose from ${allowed.join(', ')}`]))
        }

        if (type === 'fixed' && (notDefined(amount) || isZero(amount)) && isZero(paymentLink.amount)) {
            return next(new ErrorResponse('Error', 404, ['amount is required']))
        }

    }

    if (feature) {

        if (!arrayIncludes(allowedFeatures, feature)) {
            return next(new ErrorResponse('Error', 400, [`invalid feature value. choose from ${allowedFeatures.join(', ')}`]))
        }

    }

    if(redirectUrl){
        if (redirectUrl && (!strIncludesEs6(redirectUrl, 'https://') && !strIncludesEs6(redirectUrl, 'http://'))) {
            return next(new ErrorResponse('Error', 400, ['redirect url must include https:// or http://']))
        }
    }

    paymentLink.name = name ? name : paymentLink.name;
    paymentLink.slug = slug ? slug.toLowerCase() : paymentLink.slug;
    paymentLink.feature = feature ? feature : paymentLink.feature;
    paymentLink.amount = amount ? amount : paymentLink.amount;
    paymentLink.redirectUrl = redirectUrl ? redirectUrl : paymentLink.redirectUrl;
    paymentLink.message = message ? message : paymentLink.message;
    paymentLink.description = description ? description : paymentLink.description;
    await paymentLink.save();

    if (slug) {

        let oldLink = paymentLink.link

        // update link
        let updated = await PaymentLinkService.updateLinkUrl(paymentLink, slug);

        // delete old QR and generate new QRCode
        await PaymentLinkService.updateLinkQRCode({ payment: updated, oldLink, newLink: updated.link })

    }

    if (type) {

        if (type === 'dynamic' && paymentLink.feature === FeatureType.INVOICE && invoice) {
            paymentLink.type = 'fixed';
            paymentLink.amount = invoice.summary.totalAmount
        } else {
            paymentLink.type = type;
        }

        await paymentLink.save();
    }

    if (splits && splits.length > 0) {
        paymentLink = await PaymentLinkService.updateSplits(paymentLink, splits);
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: paymentLink,
        message: 'successful',
        status: 200
    })

});

