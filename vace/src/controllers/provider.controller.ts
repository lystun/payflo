import crypto from 'crypto';
import mongoose, { ObjectId, Model, Error } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { UIID, arrayIncludes, asyncHandler, capitalize, hasDecimal, isNeg, isNumber, isZero, notDefined, toDecimal } from '@btffamily/vacepay'


import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

import Account from '../models/Account.model';
import ProviderService from '../services/provider.service';
import BaniService from '../services/providers/bani.service';
import { BaniTransactionDTO, ValidateBillerWithBaniDTO } from '../dtos/providers/bani.dto';
import Business from '../models/Business.model';
import BusinessService from '../services/business.service';
import { IAccountDoc, IBank, IProviderDoc, IResult, ISearchQuery, ITransactionDoc, IUserDoc, IWalletDoc } from '../utils/types.util';
import { FundBankAccountDTO, SwitchProviderDTO, UpdateTransactionFeeDTO } from '../dtos/provider.dto';
import Provider from '../models/Provider.model';
import NinepsbService from '../services/providers/ninepsb.service';
import { BusinessType, CardAuthType, CardSchemeType, CurrencyType, PrefixType, ProviderNameType, TransactionChannelType } from '../utils/enums.util';
import SystemService from '../services/system.service';
import { PSBApiResponseDTO, PSBWebhookDataDTO, ValidateBillerWithPSBDTO } from '../dtos/providers/ninepsb.dto';
import TransactionService from '../services/transaction.service';
import ENV from '../utils/env.util';
import BankService from '../services/bank.service';
import PaystackService from '../services/providers/paystack.service';
import { VasResponseDTO } from '../dtos/vas.dto';
import VasResponse from '../services/vas.service';
import CardService from '../services/card.service';
import { advanced, search } from '../utils/result.util';
import TransactionRepository from '../repositories/transaction.repository';

/**
 * @name getProviders
 * @description Get reources from database
 * @route GET /vace/v1/providers
 */
export const getProviders = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json(res.advancedResults);
})

/**
 * @name getEnabledProviders
 * @description Get reources from database
 * @route GET /vace/v1/providers/all
 */
export const getEnabledProviders = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const query: ISearchQuery = {
        model: Provider,
        ref: null,
        value: null,
        data: [
            { isEnabled: true }
        ],
        query: null,
        queryParam: req.query,
        populate: [],
        operator: 'and'
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

export const testProvider = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let response: IResult = { error: false, message: '', code: 200, data: null }
    const { number, pin, otp, cvv, expiryMonth, expiryYear, type, reference } = req.body;

    if (type === 'charge') {

        

    }

    if(type === 'validate'){

        

    }

    // if (req.body.type === 'list') {
    //     response = await BlusaltService.getBankList({
    //         phoneNumber: req.body.phone
    //     })
    // }

    // if (req.body.type === 'init') {
    //     response = await BlusaltService.chargeBank({
    //         type: 'initiate',
    //         phoneNumber: req.body.phone,
    //         amount: 1000,
    //         bank: {
    //             accountNo: req.body.accountNo,
    //             code: req.body.code,
    //             name: req.body.bankName
    //         },
    //         email: 'tobitest@gmail.com',
    //         sessionId: req.body.sessionId,
    //         narration: 'direct debit transaction'
    //     })
    // }

    res.status(response.error ? 500 : 200).json({
        error: response.error,
        errors: response.error ? [`${response.message}`] : [],
        data: response.data,
        message: response.message ? response.message : 'successful',
        status: response.error ? 500 : 200
    })

})

/**
 * @name checkBaniWebohook
 * @description Get a reource from database
 * @route POST /vace/v1/providers/bani
 */
export const checkBaniWebohook = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const rawBody = req.rawBody;
    const baniHook = req.headers["bani-hook-signature"];

    const checkSig = await BaniService.verifyWebhookSignature({ baniHook, body: rawBody })

    if (checkSig) {
        const payload = req.body;
        await ProviderService.processWebhook({ providerName: 'bani', payload })
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {},
        message: 'successful',
        status: 200
    })

})

/**
 * @name checkNinePSBWebhook
 * @description Get a reource from database
 * @route POST /vace/v1/providers/ninepsb
 */
export const checkNinePSBWebhook = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let code: string = '';
    let statusCode: number = 200;

    const body: PSBWebhookDataDTO = req.body;

    const hashed = await NinepsbService.composeHash({
        amount: body.order.amount,
        bankCode: body.customer.account.senderbankcode,
        recipientAccountNo: body.customer.account.number,
        type: 'webhook-hash',
        senderAcccountNo: body.customer.account.senderaccountnumber
    });

    if (hashed.toLowerCase() === body.Hash.toLowerCase()) {

        code = '00';
        statusCode = 200;

        const payload = body;
        await ProviderService.processWebhook({ providerName: 'ninepsb', payload })

    } else {
        code = 'S1';
        statusCode = 403;
    }

    res.status(statusCode).json({
        error: false,
        errors: [],
        data: {
            code: code
        },
        code: code,
        message: 'successful',
        status: statusCode
    })

})

/**
 * @name checkPaystackWebhook
 * @description Get a reource from database
 * @route POST /vace/v1/providers/paystack
 */
export const checkPaystackWebhook = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let result: IResult = { error: false, message: '', code: 200, data: null }

    const hash = crypto
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
        .update(JSON.stringify(req.body))
        .digest('hex');

    // grab the event and signature from paystack
    const event = req.body;
    const sign = req.headers['x-paystack-signature'];

    if (hash === sign) {

        // process webhook
        await ProviderService.processWebhook({
            payload: event,
            providerName: 'paystack',
            encryption: {
                hash: hash,
                signature: sign
            }
        });

    } else {

        result = {
            error: true,
            message: 'invalid signature in header',
            code: 403,
            data: {
                hash: hash,
                signature: sign
            }
        }

    }


    res.status(result.code!).json({
        error: result.error,
        errors: [],
        data: result.data,
        message: result.message,
        status: result.code!
    })

})

/**
 * @name checkInterswitchWebhook
 * @description Get a reource from database
 * @route POST /vace/v1/providers/interswitch
 */
export const checkInterswitchWebhook = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let result: IResult = { error: false, message: '', code: 200, data: null }

    const body = req.body;
    const sign = req.headers['x-interswitch-signature'];

    const hash = crypto
        .createHmac('sha512', process.env.INTSW_WEBHOOK_SECRET || '')
        .update(JSON.stringify(body))
        .digest('hex');

    if (hash === sign) {

        // process webhook
        await ProviderService.processWebhook({
            payload: body,
            providerName: 'interswitch',
            encryption: {
                hash: hash,
                signature: sign
            }
        });

    } else {

        result = {
            error: true,
            message: 'invalid signature in header',
            code: 403,
            data: {
                hash: hash,
                signature: sign
            }
        }

    }

    res.status(result.code!).json({
        error: result.error,
        errors: [],
        data: result.data,
        message: result.message,
        status: result.code!
    })

})

/**
 * @name checkBlusaltWebhook
 * @description Get a reource from database
 * @route POST /vace/v1/providers/blusalt
 */
export const checkBlusaltWebhook = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let result: IResult = { error: false, message: '', code: 200, data: null }

    const body = req.body;

    await console.log(body)

    // process webhook
    await ProviderService.processWebhook({
        payload: body,
        providerName: 'blusalt'
    });

    res.status(result.code!).json({
        error: result.error,
        errors: [],
        data: result.data,
        message: result.message,
        status: result.code!
    })

})

/**
 * @name checkOwnedWebhook
 * @description Get a reource from database
 * @route POST /vace/v1/providers/owned
 */
export const checkOwnedWebhook = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let result: IResult = { error: false, message: '', code: 200, data: null }

    const body = req.body;

    await console.log(body);

    res.status(result.code!).json({
        error: result.error,
        errors: [],
        data: result.data,
        message: result.message,
        status: result.code!
    })

})

/**
 * @name generateBaniAccount
 * @description Generate a bank account number for business using BANI
 * @route POST /vace/v1/providers/bani/generate-account/:id
 */
export const generateBaniAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const allowed = ['temporary', 'permanent'];

    const { type } = req.body;

    if (type && !arrayIncludes(allowed, type.toString())) {
        return next(new ErrorResponse('Error', 404, [`invalid account type value. choose from ${allowed.join(', ')}`]));
    }

    const business = await Business.findOne({ _id: req.params.id }).populate([
        { path: 'user' },
        { path: 'wallet' },
        {
            path: 'accounts', populate: [
                { path: 'provider' }
            ]
        },
        { path: 'banks.details' }
    ]);

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const user: IUserDoc = business.user;
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, ProviderNameType.BANI);

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 422, [`business is not compliant`]));
    }

    if (business.accounts.length > 0 && account && account.provider.name === ProviderNameType.BANI && account.accountNo) {
        return next(new ErrorResponse('Error', 422, [`bank account has already been generated for business`]));
    }

    if (account) {
        await Account.deleteOne({ _id: account._id });
    }

    let result = await BusinessService.createBankAccount(business._id, 'bani', type ? type : 'permanent');

    if (result.error) {
        return next(new ErrorResponse('Error', 500, [`${result.message}`]));
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: result.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name generatePSBAccount
 * @description Generate a bank account number for business using PSB9
 * @route POST /vace/v1/providers/ninepasb/generate-account/:id
 */
export const generatePSBAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const allowed = ['static', 'dynamic'];

    const { type } = req.body;

    if (type && !arrayIncludes(allowed, type.toString())) {
        return next(new ErrorResponse('Error', 404, [`invalid account type value. choose from ${allowed.join(', ')}`]));
    }

    const business = await Business.findOne({ _id: req.params.id }).populate([
        { path: 'user' },
        { path: 'wallet' },
        {
            path: 'accounts', populate: [
                { path: 'provider' }
            ]
        },
        { path: 'banks.details' }
    ]);

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const user: IUserDoc = business.user;
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, ProviderNameType.NINEPSB);

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 422, [`business is not compliant`]));
    }

    if (business.accounts.length > 0 && account && account.provider.name === ProviderNameType.NINEPSB && account.accountNo) {
        return next(new ErrorResponse('Error', 422, [`bank account has already been generated for business`]));
    }

    if (account) {
        await Account.deleteOne({ _id: account._id });
    }

    let result = await BusinessService.createBankAccount(business._id, 'ninepsb', type ? type : 'static');

    if (result.error) {
        return next(new ErrorResponse('Error', 500, [`${result.message}`]));
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: result.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getBaniPayoutBanks
 * @description Get a reource from database
 * @route GET /vace/v1/providers/bani/payout-banks
 */
export const getBaniPayoutBanks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const bankList = await BaniService.listPayoutBanks('NG');

    if (bankList.error) {
        return next(new ErrorResponse('Error', 422, [`${bankList.message}`]))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: bankList.data,
        message: 'successful',
        status: 200
    })

});

/**
 * @name getBaniCollectionBanks
 * @description Get a reource from database
 * @route GET /vace/v1/providers/bani/collection-banks
 */
export const getBaniCollectionBanks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const bankList = await BaniService.listCollectionBanks('NG');

    if (bankList.error) {
        return next(new ErrorResponse('Error', 422, [`${bankList.message}`]))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: bankList.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getPSBTransferBanks
 * @description Get a reource from database
 * @route GET /vace/v1/providers/ninepsb/transfer-banks
 */
export const getPSBTransferBanks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const bankList = await NinepsbService.listTransferBanks();

    if (bankList.error) {
        return next(new ErrorResponse('Error', 422, [`${bankList.message}`]))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: bankList.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getBaniMobilDataPlans
 * @description Get a reource from database
 * @route POST /vace/v1/providers/bani/data-plans
 */
export const getBaniMobilDataPlans = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { network } = req.body;

    if (!network) {
        return next(new ErrorResponse('Error', 400, ['network name is required']));
    }

    const mobileDataPlans = await BaniService.listMobileDataPlans({
        countryCode: 'NG',
        network: network
    });

    if (mobileDataPlans.error) {
        return next(new ErrorResponse('Error', 422, [`${mobileDataPlans.message}`]))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: mobileDataPlans.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getPSBMobileDataPlans
 * @description Get a reource from database
 * @route POST /vace/v1/providers/ninepsb/data-plans
 */
export const getPSBMobileDataPlans = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return next(new ErrorResponse('Error', 400, ['phone number is required']));
    }

    const dataPlans = await NinepsbService.getDataPlans({
        phone: phoneNumber
    });

    if (dataPlans.error) {
        return next(new ErrorResponse('Error', 422, [`${dataPlans.message}`]))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: dataPlans.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getPSBMobileNetwork
 * @description Get a reource from database
 * @route POST /vace/v1/providers/ninepsb/mobile-network
 */
export const getPSBMobileNetwork = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return next(new ErrorResponse('Error', 400, ['phone number is required']));
    }

    const network = await NinepsbService.getNetwork({
        phone: phoneNumber
    });

    if (network.error) {
        return next(new ErrorResponse('Error', 422, [`${network.message}`]))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: network.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getBaniBillerCategories
 * @description Get a reource from database
 * @route GET /vace/v1/providers/bani/biller-categories
 */
export const getBaniBillerCategories = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const billerCategories = await BaniService.listBillerCategory('NG');

    if (billerCategories.error) {
        return next(new ErrorResponse('Error', 422, [`${billerCategories.message}`]))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: billerCategories.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getPSBillerCategories
 * @description Get a reource from database
 * @route GET /vace/v1/providers/ninepsb/biller-categories
 */
export const getPSBillerCategories = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const categories = await NinepsbService.getBillCategories({});

    if (categories.error) {
        return next(new ErrorResponse('Error', 422, [`${categories.message}`]))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: categories.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getBaniBillerSubCategories
 * @description Get a reource from database
 * @route POST /vace/v1/providers/bani/sub-categories
 */
export const getBaniBillerSubCategories = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { billerCategoryId } = req.body

    if (!billerCategoryId) {
        return next(new ErrorResponse('Error', 400, ['category id is required']))
    }

    if (!isNumber(billerCategoryId)) {
        return next(new ErrorResponse('Error', 400, ['category id is required to be a number']))
    }

    const categories = await BaniService.listBillerSubCategory(billerCategoryId);

    if (categories.error) {
        return next(new ErrorResponse('Error', 422, [`${categories.message}`]))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: categories.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getPSBSubCategories
 * @description Get a reource from database
 * @route POST /vace/v1/providers/ninepsb/sub-categories
 */
export const getPSBSubCategories = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { categoryId } = req.body

    if (!categoryId) {
        return next(new ErrorResponse('Error', 400, ['category id is required']))
    }

    const categories = await NinepsbService.getSubCategories({ categoryId });

    if (categories.error) {
        return next(new ErrorResponse('Error', 422, [`${categories.message}`]))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: categories.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name validateBaniBiller
 * @description Get a reource from database
 * @route POST /vace/v1/providers/bani/validate-biller
 */
export const validateBaniBiller = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { itemId, customerItem, amount } = req.body as ValidateBillerWithBaniDTO


    if (!itemId) {
        return next(new ErrorResponse('Error', 400, ['item id is required']))
    }

    if (!customerItem) {
        return next(new ErrorResponse('Error', 400, ['customer item is required']))
    }

    if (notDefined(amount) || isZero(amount)) {
        return next(new ErrorResponse('Error', 400, ['amount is required']))
    }

    const validate = await BaniService.validateBiller({ itemId, customerItem, amount });

    if (validate.error) {
        return next(new ErrorResponse('Error', 422, [`${validate.message}`]))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: validate.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name validatePSBiller
 * @description Get a reource from database
 * @route POST /vace/v1/providers/ninepsb/validate-biller
 */
export const validatePSBiller = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let response: IResult = { error: false, message: '', code: 200, data: null }
    const { itemId, customerId, amount, billerId, phoneNumber } = req.body as ValidateBillerWithPSBDTO

    if (!itemId) {
        return next(new ErrorResponse('Error', 400, ['item id is required']))
    }

    if (!customerId) {
        return next(new ErrorResponse('Error', 400, ['customer id is required']))
    }

    if (notDefined(amount) || isZero(amount)) {
        return next(new ErrorResponse('Error', 400, ['amount is required']))
    }

    response = await NinepsbService.validateInputFields({
        amount,
        customerId,
        itemId: itemId.toString(),
        billerId,
        firstName: "Dummy",
        lastName: "Customer"
    });

    // map VAS response
    const biller: VasResponseDTO = VasResponse.mapVASResponse({
        providerName: 'ninepsb',
        type: 'validate-biller',
        response: response.data,
        itemId: itemId.toString(),
        amount: amount,
        billerId: billerId,
        customerId: customerId
    });

    const txnref = TransactionService.generateRef(); // vacepay reference
    response = await NinepsbService.initiateBillPayment({
        accountNo: NinepsbService.bankAccount,
        amount: amount,
        billerId: biller.billerId,
        customerId: biller.customer.id,
        itemId: biller.billerItem.itemId.toString(),
        metadata: biller.metadata,
        name: biller.customer.name,
        phoneNumber: phoneNumber,
        reference: txnref
    })

    if (response.error) {
        return next(new ErrorResponse('Error', 422, [`${response.message}`], response.data))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: response.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name validateBaniBillTransaction
 * @description Get a reource from database
 * @route POST /vace/v1/providers/bani/validate-bill
 */
export const validateBaniBillTransaction = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { reference } = req.body

    if (!reference) {
        return next(new ErrorResponse('Error', 400, ['Please provide transaction referennce']))
    }

    const validate = await BaniService.validateBillTransaction({
        vaceRef: reference
    });

    if (validate.error) {
        return next(new ErrorResponse('Error', 422, [`${validate.message}`]))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: validate.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getPSBillStatus
 * @description Get a reource from database
 * @route POST /vace/v1/providers/ninepsb/bill-status
 */
export const getPSBillStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { reference } = req.body

    if (!reference) {
        return next(new ErrorResponse('Error', 400, ['Please provide transaction referennce']))
    }

    const validate = await NinepsbService.getBillPaymentStatus(reference);

    if (validate.error) {
        return next(new ErrorResponse('Error', 422, [`${validate.message}`]))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: validate.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name findBillerBySubCategory
 * @description Get a reource from database
 * @route POST /vace/v1/providers/bani/filter-transactions
 */
export const findBillerBySubCategory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { subCategoryName } = req.body

    if (!subCategoryName) {
        return next(new ErrorResponse('Error', 400, ['Please provide sub-category name']))
    }

    const validate = await BaniService.findBillerBySubCategory(subCategoryName);

    if (validate.error) {
        return next(new ErrorResponse('Error', 422, [`${validate.message}`]))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: validate.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getPaystackBanks
 * @description Get a reource from database
 * @route GET /vace/v1/providers/paystack/list-banks
 */
export const getPaystackBanks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const bankList = await PaystackService.getBankList({
        perPage: 9999,
        country: 'nigeria',
        useCursor: false
    });

    if (bankList.error) {
        return next(new ErrorResponse('Error', 422, [`${bankList.message}`]))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: bankList.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name resolveBankAccount
 * @description Get a reource from database
 * @route POST /vace/v1/providers/resolve-account
 */
export const resolveBankAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { accountNo, bankCode } = req.body;
    const providerName = await ProviderService.configProviderName('bank')
    let response: IResult = { error: false, message: '', code: 200, data: null };

    if (!accountNo) {
        return next(new ErrorResponse('Error', 400, ['account number is required']))
    }

    if (!bankCode) {
        return next(new ErrorResponse('Error', 400, ['bank code is required']))
    }

    const bank = await BankService.getBank(bankCode, providerName)

    if (!bank) {
        return next(new ErrorResponse('Error', 400, ['invalid bank code supplied']))
    }

    response = await BankService.resolveBankAccount({
        accountNo,
        bankCode: bank.platformCode,
        name: providerName
    })

    if (response.error) {
        return next(new ErrorResponse('Error', 500, [`${response.message}`], response.data))
    }

    //IMPORTANT: exchange {bank.code} for {bank.platformCode} for alignment purposes
    response.data.bankCode = response.data.platformCode;
    delete response.data.platformCode;

    res.status(200).json({
        error: false,
        errors: [],
        data: response.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getLedgerBalance
 * @description Get a reource from database
 * @route POST /vace/v1/providers/ledger-balance
 */
export const getLedgerBalance = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const allowed = ['bani', 'ninepsb', 'paystack', 'netmfb', 'mono', 'interswitch', 'unified']
    const { provider, accountNo } = req.body;
    let response: IResult = { error: false, message: '', code: 200, data: null };

    if (!provider) {
        return next(new ErrorResponse('Error', 400, ['provider name is required']))
    }

    if (!arrayIncludes(allowed, provider)) {
        return next(new ErrorResponse('Error', 400, [`invalid provider name. choose from ${allowed.join(', ')}`]))
    }

    if (provider === ProviderNameType.NINEPSB && !accountNo) {
        return next(new ErrorResponse('Error', 400, ['account number is required']))
    }

    if (provider === ProviderNameType.BANI) {

    }

    if (provider === ProviderNameType.NINEPSB) {

        response = await NinepsbService.getLedgerBalance({ accountNo: accountNo });

        if (response.error) {
            return next(new ErrorResponse('Error', 500, [`${response.message}`]))
        }

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: response.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name fundPSBBankAccount
 * @description Get a reource from database
 * @route POST /vace/v1/providers/fund-account/:id
 */
export const fundPSBBankAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { amount, description } = req.body as FundBankAccountDTO;
    let response: IResult = { error: false, message: '', code: 200, data: null };

    const validate = await ProviderService.validateFundAccount(req.body)

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    const business = await Business.findOne({ _id: req.params.id }).populate([
        {
            path: 'accounts', populate: [
                { path: 'provider' }
            ]
        },
        { path: 'user' },
        { path: 'wallet' }
    ]);

    if (!business) {
        return next(new ErrorResponse('Error', 400, [`business does not exist`]))
    }

    if (business.accounts.length === 0) {
        return next(new ErrorResponse('Error', 500, [`bank account has not been generated`]));
    }

    const user: IUserDoc = business.user;
    const wallet: IWalletDoc = business.wallet;
    const account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, ProviderNameType.NINEPSB);
    const provider: IProviderDoc = account.provider;

    if (!BusinessService.isCompliant(user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    const txnref = TransactionService.generateRef(); // vacepay reference

    // verify PSB9 collection account number 
    response = await BankService.resolveBankAccount({ 
        accountNo: NinepsbService.bankAccount, 
        bankCode: NinepsbService.bankCode, 
        name: provider.name 
    });

    if (response.error) {
        return next(new ErrorResponse('Error', 500, [`${response.message}`], response.data))
    }

    const bankSender: PSBApiResponseDTO = response.data;

    // create transaction
    const transaction = await TransactionService.createFundTransaction({
        type: 'credit',
        provider: account.provider,
        isWebhook: false,
        reference: txnref,
        business,
        wallet
    });

    // process fund bank account with NINEPSB
    response = await NinepsbService.fundBankAccount({
        type: "fund-normal",
        reference: txnref,
        amount,
        recipient: {
            accountNo: account.accountNo,
            bankCode: account.bank.bankCode,
            accountName: account.accountName,
        },
        sender: {
            accountName: bankSender.customer.account.name,
            accountNo: bankSender.customer.account.number
        },
        description: description ? description : `transfer from ${bankSender.customer.account.number} to ${account.accountNo}|${account.accountName}`
    });

    if (response.error) {
        return next(new ErrorResponse('Error', 500, [`${response.message}`], response.data))
    }

    // save references
    const _response: PSBApiResponseDTO = response.data;
    transaction.reference = _response.transaction.linkingreference;
    transaction.providerRef = _response.transaction.externalreference;
    await transaction.save();

    res.status(200).json({
        error: false,
        errors: [],
        data: response.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getTransactionDetails
 * @description Get a reource from database
 * @route POST /terra/v1/providers/get-transaction
 */
export const getTransactionDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let response: IResult = { error: false, message: '', code: 200, data: null };
    const { name, reference } = req.body;

    if (!name) {
        return next(new ErrorResponse('Error', 400, ['provider name is required']))
    }

    if (!reference) {
        return next(new ErrorResponse('Error', 400, ['reference is required']))
    }

    const provider = await Provider.findOne({ name: name });

    if (!provider) {
        return next(new ErrorResponse('Error', 404, ['provider does not exist']))
    }

    const transaction = await TransactionRepository.findByReference(reference, false);

    if (!transaction) {
        return next(new ErrorResponse('Error', 404, ['transaction does not exist']))
    }

    if (transaction.provider.toString() !== provider._id.toString()) {
        return next(new ErrorResponse('Error', 403, ['invalid provider name supplied']))
    }

    if (provider.name === ProviderNameType.BANI) {

        response = await BaniService.verifyPaymentStatus({ reference: transaction.reference });

        if (response.error) {
            return next(new ErrorResponse('Error', 500, [`${response.message}`], response.data))
        }

        const baniResponse: BaniTransactionDTO = response.data;

        if(!transaction.providerData){
            transaction.providerData = baniResponse; // get the data
        }
        transaction.providerRef = baniResponse.pay_ref; // get the reference
        transaction.providerName = ProviderNameType.BANI;
        transaction.channel = TransactionChannelType.BANK_TRANSFER;
        transaction.status = TransactionService.getPaymentStatus(baniResponse.pay_status);
        await transaction.save() // save to DB

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: response.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name switchProvider
 * @description Get a reource from database
 * @route PUT /vace/v1/providers/switch
 */
export const switchProvider = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const allowed = ['bank', 'card', 'bills', 'directpay', 'verve', 'master', 'visa']
    const { name, type, status } = req.body as SwitchProviderDTO

    if (!name) {
        return next(new ErrorResponse('Error', 400, ['provider name is required']))
    }

    if (!type) {
        return next(new ErrorResponse('Error', 400, ['offer type is required']))
    }

    if (!arrayIncludes(allowed, type.toString())) {
        return next(new ErrorResponse('Error', 400, [`invalid offer type. choose from ${allowed.join(', ')}`]))
    }

    if (notDefined(status, true)) {
        return next(new ErrorResponse('Error', 400, [`status type is required`]))
    }

    if (type === 'bank') {

        const mainProvider = await Provider.findOne({ bankProvider: true });
        const provider = await Provider.findOne({ name: name });

        if (!provider) {
            return next(new ErrorResponse('Error', 404, ['provider does not exist']))
        }

        if (provider.offers.banking === false) {
            return next(new ErrorResponse('Error', 403, ['provider does not offer banking services']))
        }

        if (provider.offers.banking === true && mainProvider) {

            if (status === true) {

                mainProvider.bankProvider = false
                await mainProvider.save();

                provider.bankProvider = true;
                await provider.save();

            }

        }

    }

    if (type === 'card') {

        const mainProvider = await Provider.findOne({ cardProvider: true });
        const provider = await Provider.findOne({ name: name });

        if (!provider) {
            return next(new ErrorResponse('Error', 404, ['provider does not exist']))
        }

        if (provider.offers.card === false) {
            return next(new ErrorResponse('Error', 403, ['provider does not offer card services']))
        }

        if (provider.offers.card === true && mainProvider) {

            if (status === true) {

                mainProvider.cardProvider = false
                mainProvider.masterProvider = false;
                mainProvider.verveProvider = false;
                mainProvider.visaProvider = false;
                await mainProvider.save();

                provider.cardProvider = true;
                provider.masterProvider = true;
                provider.verveProvider = true;
                provider.visaProvider = true;
                await provider.save();

            }

        }

    }

    if (type === 'bills') {

        const mainProvider = await Provider.findOne({ billsProvider: true });
        const provider = await Provider.findOne({ name: name });

        if (!provider) {
            return next(new ErrorResponse('Error', 404, ['provider does not exist']))
        }

        if (provider.offers.bills === false) {
            return next(new ErrorResponse('Error', 403, ['provider does not offer bill services']))
        }

        if (provider.offers.bills === true && mainProvider) {

            if (status === true) {

                mainProvider.billsProvider = false
                await mainProvider.save();

                provider.billsProvider = true;
                await provider.save();

            }

        }

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            name: name
        },
        message: 'successful',
        status: 200
    })

})

/**
 * @name switchProvider
 * @description Get a reource from database
 * @route PUT /vace/v1/providers/update-fee
 */
export const updateTransactionFee = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { name, type, value, capped, markup, category, chargeFee, providerFee, providerMarkup, providerCap, stampDuty } = req.body as UpdateTransactionFeeDTO

    const validate = await ProviderService.validateUpdateFee(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', validate.code!, [`${validate.message}`]))
    }

    const provider = await Provider.findOne({ name: name });

    if (!provider) {
        return next(new ErrorResponse('Error', 404, ['provider does not exist']))
    }

    if (category === "inflow") {

        let charge = notDefined(chargeFee) ? provider.vaceInflow.chargeFee : chargeFee;

        provider.vaceInflow = {
            type: type,
            value: value,
            capped: capped,
            markup: markup,
            chargeFee: charge,
            providerFee: providerFee,
            providerMarkup: providerMarkup,
            providerCap: providerCap,
            stampDuty: stampDuty
        }

    }

    if (category === "outflow") {

        let charge = notDefined(chargeFee) ? provider.vaceOutflow.chargeFee : chargeFee;

        provider.vaceOutflow = {
            type: type,
            value: value,
            capped: capped,
            markup: markup,
            chargeFee: charge,
            providerFee: providerFee,
            providerMarkup: providerMarkup,
            providerCap: providerCap,
            stampDuty: stampDuty
        }

    }

    await provider.save();

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            name: provider.name
        },
        message: 'successful',
        status: 200
    })

})

/**
 * @name enableProvider
 * @description Get a reource from database
 * @route PUT /vace/v1/providers/enable/:id
 */
export const enableProvider = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const provider = await Provider.findOne({ _id: req.params.id });

    if (!provider) {
        return next(new ErrorResponse('Error', 404, ['provider does not exist']))
    }

    if (provider.isEnabled === false) {
        provider.isEnabled = true;
        await provider.save()
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            isEnabled: provider.isEnabled
        },
        message: 'successful',
        status: 200
    })

})

/**
 * @name disableProvider
 * @description Get a reource from database
 * @route PUT /vace/v1/providers/disable/:id
 */
export const disableProvider = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const provider = await Provider.findOne({ _id: req.params.id });

    if (!provider) {
        return next(new ErrorResponse('Error', 404, ['provider does not exist']))
    }

    if (provider.isEnabled === true) {
        provider.isEnabled = false;
        await provider.save()
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            isEnabled: provider.isEnabled
        },
        message: 'successful',
        status: 200
    })

})



