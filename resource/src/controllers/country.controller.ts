import mongoose, { Document, ObjectId } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { asyncHandler, strIncludesEs6, strToArrayEs6 } from '@btffamily/vacepay';
import { CacheKeys, computeKey } from '../utils/cache.util'
import redis from '../middleware/redis.mw'

import Country from '../models/Country.model';
import UserService from '../services/user.service';
import { advanced } from '../utils/result.util';
import CountryMapper from '../mappers/country.mapper';

// @desc    Get All Countries
// @route   GET /api/resource/v1/countries
// access   Public
export const getCountries = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);
})

/**
 * @name listCountries
 * @description Get reources from database
 * @route GET /resource/v1/countries/list
 */
export const listCountries = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: true });

	if(loggedIn.error){
		return next(new ErrorResponse('Error', 401, ['authourized user not found']));
	}

    const result = await advanced(Country, [], 'name', req, null, null);
	const mapped = await CountryMapper.mapCountryList(result.data);

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

// @desc    Get A Country
// @route   GET /api/resource/v1/countries/:id
// access   Public
export const getCountry = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const cached = await redis.fetchData(CacheKeys.Country);

	if(cached !== null){

		res.status(200).json({
			error: false,
			errors: [],
			data: cached.data,
			message: 'successful',
			status: 200
		})

	}
	
	let reqId = req.params.id 
    let country;

	if(strIncludesEs6(reqId, '+')){ // find a country by phoneCode
		country = await Country.findOne({ phoneCode: reqId });
	}

	if(mongoose.Types.ObjectId.isValid(reqId)){ // find by valid mongoose ID
		country = await Country.findById(reqId); 
	} 

    if(!country){
        return next(new ErrorResponse('Cannot find country', 404, [`Cannot find country`]))
    }

	// cache data
	await redis.keepData({ key: computeKey(process.env.NODE_ENV, CacheKeys.Country), value: { data: country }}, (15 * 86400));  // expire in 15 days

    res.status(200).json({
        error: false,
        errors: [],
        data: country,
        message: 'successful',
        status: 200
    })

})

// @desc     Get all states for a country
// @route    GET /api/v1/countries/states/:id
// @access   Public
export const getStates = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	
	const c = await Country.findById(req.params.id)

	if (!c) {
		return next(
			new ErrorResponse(`Cannot find country]`, 404, [`Cannot find country [${req.params.id}`])
		);
	}    

	const states = c.states;
	const countryData = {
		_id: c._id,
		name: c.name,
		code2: c.code2,
		code3: c.code3,
		region: c.region,
		subregion: c.subregion
	}

	res.status(200).json({
        error: false,
        errors: [],
        data: { country: countryData, states: states },
		message: `successfull`,
        status: 200
	});

})