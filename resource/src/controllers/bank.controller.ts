import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { asyncHandler, sortData, strIncludesEs6, strToArrayEs6 } from '@btffamily/vacepay';
import { CacheKeys, computeKey } from '../utils/cache.util'
import redis from '../middleware/redis.mw'

// import models
import Bank from '../models/Bank.model';
import { generate } from '../utils/random.util';
import UserService from '../services/user.service';
import { advanced, search } from '../utils/result.util';
import BankMapper from '../mappers/bank.mapper';
import { FilterQuery } from 'mongoose'
import { IBankDoc, IResult, ISearchQuery } from '../utils/types.util';
import { ProviderNameType } from '../utils/enums.util';

// @desc        Register user
// @route       POST /api/identity/v1/auth/register
// @access      Public
export const getBanks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    
    let resultData: Array<any> = [];

    const query: ISearchQuery = {
        model: Bank,
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

    const result = await search(query);

    // decide to map or not
    if(req.query.mapped && req.query.mapped.toString() === 'false'){
        resultData = result.data;
    }else {
        resultData = await BankMapper.mapBankList(result.data);
    }

    resultData = sortData(resultData, 'name') // sort by name

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: resultData,
        message: `successful`,
        status: 200,
    });
})

// @desc     Get a bank
// @route    GET /api/resource/v1/banks/provider
// @access   Public
export const getBanksProviderFilter = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    
    let nameList: Array<string> = [], 
    names: string = '', 
    filters: FilterQuery<IBankDoc> = {},
    resultData: Array<any> = [];

    if(req.query.filter){
        names = req.query.filter.toString();
        nameList = names.split(',')
    }else{
        names = 'paystack'
        nameList.push(names);
    }

    for(let i = 0; i < nameList.length; i++){

        if(nameList[i] === ProviderNameType.PAYSTACK){

            filters = [
                { providers: { $elemMatch: { name: "paystack", active: true } } },
                { providers: { $elemMatch: { name: "bani", active: true } } },
                { isEnabled: true }
            ]

            break;

        }else if(nameList[i] === ProviderNameType.BANI){

            filters = [
                { providers: { $elemMatch: { name: "paystack", active: true } } },
                { providers: { $elemMatch: { name: "bani", active: true } } },
                { isEnabled: true }
            ]

            break;

        }else if(nameList[i] === ProviderNameType.NETMFB){

            filters = [
                { providers: { $elemMatch: { name: "paystack", active: true } } },
                { providers: { $elemMatch: { name: "bani", active: true } } },
                { isEnabled: true }
            ]

            break;

        }else if(nameList[i] === ProviderNameType.NINEPSB){

            filters = [
                { providers: { $elemMatch: { name: "ninepsb", bankCode: { $ne: "" } } } },
                { isEnabled: true }
            ]
            break;
            
        }

    }

    const query: ISearchQuery = {
        model: Bank,
        ref: null,
        value: null,
        data: filters,
        query: null,
        queryParam: req.query,
        populate: [],
        operator: 'and'
    }

    const result = await search(query);
    
    // decide to map or not
    if(req.query.mapped && req.query.mapped.toString() === 'false'){
        resultData = result.data;
    }else {
        resultData = await BankMapper.mapBankList(result.data);
    }

    resultData = sortData(resultData, 'name') // sort by name
   
   res.status(200).json({
       error: false,
       errors: [],
       count: result.count,
       total: result.total,
       pagination: result.pagination,
       data: resultData,
       message: `successful`,
       status: 200,
   });

})

/**
 * @name listBanks
 * @description Get reources from database
 * @route GET /resource/v1/banks/list
 */
export const listBanks = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: true });

	if(loggedIn.error){
		return next(new ErrorResponse('Error', 401, ['authourized user not found']));
	}

    const query: ISearchQuery = {
        model: Bank,
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

    const result = await search(query);
	let mapped = await BankMapper.mapBankList(result.data);

    mapped = sortData(mapped, 'name') // sort by name

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: mapped,
        message: 'successful',
        status: 200
    })

})

// @desc     Get a bank
// @route    GET /api/resource/v1/banks/:id
// @access   Public
export const getBank = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const cached = await redis.fetchData(CacheKeys.Bank);

    if(cached !== null){

        res.status(200).json({
            error: false,
            errors: [],
            data: cached.data,
            message: `successful`,
            status: 200,
        });

    }
	
    const bank = await Bank.findOne({ _id: req.params.id });
 
   if (!bank) {
       return next(
           new ErrorResponse(`Not found`, 404, [`Cannot find bank`])
       );
   }

   // cache data
   await redis.keepData({ key: computeKey(process.env.NODE_ENV, CacheKeys.Bank), value: { data: bank }}, (15 * 86400));  // expire in 15 days
 
   res.status(200).json({
       error: false,
       errors: [],
       data: bank,
       message: `successful`,
       status: 200,
   });

})

// @desc     Add a bank
// @route    POST /api/resource/v1/banks
// @access   Private
export const createBank = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	
	const { name, code, bankId, country, type, currency } = req.body;

    const bank = await Bank.create({
        name,
        code,
        bankId,
        country,
        type,
        currency,
        isEnabled: true
    });

    await redis.deleteData(CacheKeys.Banks);

    res.status(200).json({
        error: false,
        errors: [],
        data: bank,
        message: `successful`,
        status: 200,
    });

})

// @desc     Enable a Bank
// @route    PUT /api/resource/v1/banks/enable/:id
// @access   Public
export const enableBank = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const bank = await Bank.findOne({ _id: req.params.id });

    if(!bank){
        return next(new ErrorResponse('Error', 404, ['bank does not exist']));
    }

    bank.isEnabled = true;
    await bank.save();

    await redis.deleteData(CacheKeys.Banks);
    await redis.deleteData(CacheKeys.Bank);

    res.status(200).json({
        error: false,
        errors: [],
        data: null,
        message: `successful`,
        status: 200,
    });
})

// @desc     Disable a Bank
// @route    PUT /api/resource/v1/banks/disable/:id
// @access   Public
export const disableBank = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const bank = await Bank.findOne({ _id: req.params.id });

    if(!bank){
        return next(new ErrorResponse('Error', 404, ['bank does not exist']));
    }

    bank.isEnabled = false;
    await bank.save();

    await redis.deleteData(CacheKeys.Banks);
    await redis.deleteData(CacheKeys.Bank);

    res.status(200).json({
        error: false,
        errors: [],
        data: null,
        message: `successful`,
        status: 200,
    });
})

// @desc     Remove a Bank
// @route    DELETE /api/resource/v1/banks/:id
// @access   Public
export const removebank = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const bank = await Bank.findOne({ _id: req.params.id });

    if(!bank){
        return next(new ErrorResponse('Error', 404, ['bank does not exist']));
    }

    await Bank.deleteOne({ _id: bank._id });
    
    await redis.deleteData(CacheKeys.Banks);
    await redis.deleteData(CacheKeys.Bank);

    res.status(200).json({
        error: false,
        errors: [],
        data: null,
        message: `successful`,
        status: 200,
    });
})


/** 
 * snippet
 * **/ 

// @desc        Login user (with verification)
// @route       POST /api/identity/v1/auth/login
// @access      Public
// export const funcd = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

// })