import crypto from 'crypto';
import mongoose, { ObjectId, Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { asyncHandler, strIncludesEs6, arrayIncludes, isString, isNumber } from '@btffamily/vacepay'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import { IProviderDoc, IResult, IWalletDoc, ProviderType } from '../utils/types.util';
import { ProviderNameType } from '../utils/enums.util';
import ProviderService from '../services/provider.service';
import BaniService from '../services/providers/bani.service';
import { ValidateBillerDTO } from '../dtos/vas.dto';
import VasService from '../services/vas.service';
import Transaction from '../models/Transaction.model';
import NinepsbService from '../services/providers/ninepsb.service';
import { PSBApiResponseDTO } from '../dtos/providers/ninepsb.dto';
import { BaniResponseDTO } from '../dtos/providers/bani.dto';

/**
 * @name getMobileDataPlans
 * @description Get reource from database
 * @route GET /vace/v1/vas/mobile-data-plans
 */
export const getMobileDataPlans = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
    const allowedNetworks = ['mtn', 'glo', 'airtel', '9mobile'];
    const extendedNetworks = ['mtn', 'glo', 'airtel', '9mobile', 'smile', 'spectranet'];
    const providerName = await ProviderService.configProviderName('bills');
    let response: IResult = { error: false, message: '', code: 200, data: [] }

    const { networkName, phoneNumber } = req.body as { networkName: string, phoneNumber: string };

    if(providerName === ProviderNameType.BANI){

        if(!networkName){
            return next(new ErrorResponse('Error', 400, ['network name is required']));
        }
    
        if(!arrayIncludes(allowedNetworks, networkName.toLowerCase())){
            return next(new ErrorResponse('Error', 400, [`invalid network name. choose from ${allowedNetworks.join(', ')}`]));
        }

        response = await BaniService.listMobileDataPlans({ countryCode: 'NG', network: networkName });

        if(response.error){
            return next(new ErrorResponse('Error', 500, [`${response.message}`]))
        }

        response.data = VasService.mapVASResponse({ providerName, type: 'data-plans', response: response.data })

    }

    if(providerName === ProviderNameType.NINEPSB){
        
        if(!phoneNumber){
            return next(new ErrorResponse('Error', 400, ['phone number is required']));
        }

        if(phoneNumber.length !== 11){
            return next(new ErrorResponse('Error', 400, ['a valid NGN phone number is required']));
        }

        response = await NinepsbService.getDataPlans({
            phone: phoneNumber
        });

        if(response.error){
            return next(new ErrorResponse('Error', 500, [`${response.message}`], response.data))
        }

        response.data = VasService.mapVASResponse({ providerName, type: 'data-plans', response: response.data });

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
 * @name getBillers
 * @description Get reource from database
 * @route GET /vace/v1/vas/billers
 */
export const getBillers = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
    const providerName = await ProviderService.configProviderName('bills');
    let response: IResult = { error: false, message: '', code: 200, data: [] }

    if(providerName === ProviderNameType.BANI){

        response = await BaniService.listBillerCategory('NG');

        if(response.error){
            return next(new ErrorResponse('Error', 422, [`${response.message}`]))
        }

        response.data = VasService.mapVASResponse({ providerName, type: 'list-billers', response: response.data })

    }

    if(providerName === ProviderNameType.NINEPSB){
        
        response = await NinepsbService.getBillCategories({});

        if(response.error){
            return next(new ErrorResponse('Error', 422, [`${response.message}`], response.data))
        }

        response.data = VasService.mapVASResponse({ providerName, type: 'list-billers', response: response.data })

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
 * @name getBillerSubCategories
 * @description Get reource from database
 * @route GET /vace/v1/vas/biller-sub-categories
 */
export const getBillerSubCategories = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
    const providerName = await ProviderService.configProviderName('bills');
    let response: IResult = { error: false, message: '', code: 200, data: [] }

    const { categoryId } = req.body

    if(!categoryId) {
        return next(new ErrorResponse('Error', 400, ['category id is required']))
    }

    if(!isNumber(categoryId) && !isString(categoryId)){
        return next(new ErrorResponse('Error', 400, ['category id is required to be a number or a string']))
    }

    if(providerName === ProviderNameType.BANI){

        response = await BaniService.listBillerSubCategory(categoryId);

        if(response.error){
            return next(new ErrorResponse('Error', 422, [`${response.message}`]))
        }

        response.data = VasService.mapVASResponse({ providerName, type: 'sub-categories', response: response.data })

    }

    if(providerName === ProviderNameType.NINEPSB){
        
        response = await NinepsbService.getSubCategories({
            categoryId
        });

        if(response.error){
            return next(new ErrorResponse('Error', 422, [`${response.message}`]))
        }

        const categories = VasService.mapVASResponse({ providerName, type: 'format-sub-category', response: response.data, categoryId });
        response = await VasService.getCategoriesFields({ categories, providerName });

        if(response.error){
            return next(new ErrorResponse('Error', 422, [`${response.message}`]))
        }

        response.data = VasService.mapVASResponse({ providerName, type: 'sub-categories', response: response.data });

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
 * @name getBillProducts
 * @description Get reource from database
 * @route GET /vace/v1/vas/bill-products
 */
export const getBillProducts = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
    const providerName = await ProviderService.configProviderName('bills');
    let response: IResult = { error: false, message: '', code: 200, data: [] }

    const { subCategory, productCode } = req.body

    if(!subCategory) {
        return next(new ErrorResponse('Error', 400, ['sub category id is required']))
    }

    if(providerName === ProviderNameType.BANI){}

    if(providerName === ProviderNameType.NINEPSB){}

	res.status(200).json({
        error: false,
        errors: [],
        data: response.data,
        message: 'successful',
        status: 200
    })

})


/**
 * @name validateBiller
 * @description Get reource from database
 * @route POST /vace/v1/vas/validate-biller
 */
export const validateBiller = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
    const providerName = await ProviderService.configProviderName('bills');
    let response: IResult = { error: false, message: '', code: 200, data: null }

    const { itemId, customerId, amount, billerId } = req.body as ValidateBillerDTO;

    const validate = await VasService.validateBillerRequest(req.body);

    if(validate.error){
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    if(providerName === ProviderNameType.BANI){

        response = await BaniService.validateBiller({
            amount,
            customerItem: customerId,
            itemId: parseInt(itemId.toString()),
            currency: 'NGN'
        });

        if(response.error){
            return next(new ErrorResponse('Error', 422, [`${response.message}`]))
        }

        response.data = VasService.mapVASResponse({ providerName, type: 'validate-biller', response: response.data })

    }

    if(providerName === ProviderNameType.NINEPSB){

        if(!billerId){
            return next(new ErrorResponse('Error', 400, [`biller id is required`]))
        }
        
        response = await NinepsbService.validateInputFields({
            amount,
            customerId,
            itemId: itemId.toString(),
            billerId,
            firstName: "Dummy",
            lastName: "Customer"
        });

        if(response.error){
            return next(new ErrorResponse('Error', 422, [`${response.message}`]))
        }

        response.data = VasService.mapVASResponse({ 
            providerName, type: 'validate-biller', 
            response: response.data,
            itemId: itemId.toString(),
            amount: amount,
            billerId: billerId,
            customerId: customerId
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

/**
 * @name getTopUpStatus
 * @description Get reource from database
 * @route POST /vace/v1/vas/topup-status
 */
export const getTopUpStatus = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
    let response: IResult = { error: false, message: '', code: 200, data: null }

    const { reference } = req.body;

    if(!reference){
        return next(new ErrorResponse('Error', 400, [`reference is required`]))
    }

    const transaction = await Transaction.findOne({ reference: reference }).populate([
        { path: 'provider' }
    ]);

    if(!transaction){
        return next(new ErrorResponse('Error', 404, [`transaction does not exist`]))
    }

    if(transaction.feature !== 'wallet-airtime' && transaction.feature !== 'wallet-data'){
        return next(new ErrorResponse('Error', 403, [`invalid transaction reference`]))
    }

    const provider: IProviderDoc = transaction.provider;

    if(provider.name === ProviderNameType.BANI){

        response = await BaniService.validateBillTransaction({ vaceRef: transaction.merchantRef ? transaction.merchantRef : transaction.reference });

        if(response.error){
            return next(new ErrorResponse('Error', 422, [`${response.message}`]))
        }

        const _response: BaniResponseDTO = response.data;

        response.data = {
            status: _response.transaction_status,
            reference: transaction.reference,
            ...transaction.vasData
        }
        response.message = transaction.description;

    }

    if(provider.name === ProviderNameType.NINEPSB){
        
        response = await NinepsbService.getTopupStatus({ reference: transaction.reference });

        if(response.error){
            return next(new ErrorResponse('Error', 422, [`${response.message}`]))
        }
        const _response: PSBApiResponseDTO = response.data;

        response.data = {
            status: _response.transactionStatus,
            reference: transaction.reference,
            ...transaction.vasData
        }
        response.message = _response.description

    }

	res.status(200).json({
        error: false,
        errors: [],
        data: response.data,
        message: response.message,
        status: 200
    })

})


/**
 * @name validateBillTransaction
 * @description Get reource from database
 * @route POST /vace/v1/vas/bill-status
 */
export const validateBillTransaction = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
    const providerName = await ProviderService.configProviderName('bills');
    let response: IResult = { error: false, message: '', code: 200, data: null }

    const { reference } = req.body;

    if(!reference){
        return next(new ErrorResponse('Error', 400, [`reference is required`]))
    }

    const transaction = await Transaction.findOne({ reference: reference }).populate([
        { path: 'provider' }
    ]);

    if(!transaction){
        return next(new ErrorResponse('Error', 404, [`transaction does not exist`]))
    }

    const provider: IProviderDoc = transaction.provider;

    if(provider.name === ProviderNameType.BANI){

        response = await BaniService.validateBillTransaction({ vaceRef: transaction.merchantRef ? transaction.merchantRef : transaction.reference });

        if(response.error){
            return next(new ErrorResponse('Error', 422, [`${response.message}`]))
        }

        response.data = VasService.mapVASResponse({ providerName, type: 'bill-transaction', response: response.data })

    }

    if(provider.name === ProviderNameType.NINEPSB){
        
        response = await NinepsbService.getBillPaymentStatus(transaction.reference);

        if(response.error){
            return next(new ErrorResponse('Error', 422, [`${response.message}`]))
        }

        response.data = VasService.mapVASResponse({
            providerName, 
            type: 'bill-transaction', 
            response: response.data,
            transaction: transaction
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



