import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { asyncHandler, dateToday, isString } from '@btffamily/vacepay'
import PostService from '../services/post.service'
import CategoryService from '../services/category.service'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import User from '../models/User.model'
import Bracket from '../models/Bracket.model'
import Post from '../models/Post.model'
import redis from '../middleware/redis.mw';
import { CacheKeys } from '../utils/cache.util';
import { advanced, search } from '../utils/result.util';
import Subscriber from '../models/Subscriber.model';
import SystemService from '../services/system.service';
import { generate } from '../utils/random.util';
import { deleteGcFile, uploadBase64File } from '../utils/google.util';
import UserService from '../services/user.service';
import { IPagination, ISearchQuery } from '../utils/types.util';


// @desc      Get all subscribers
// @route     GET /blog/v1/subscribers
// @access    Private
export const getSubscribers = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);   
})

// @desc      Get a bracket
// @route     GET /blog/v1/subscribers/:id
// @access    Private
export const getAllSubscribers = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const _result = await advanced(Post, [], 'createdAt', req, 'isEnabled', true, null, 'relative');

	res.status(200).json({
		error: false,
		errors: [],
		count: _result.count,
		total: _result.count, 
		message: 'successfull',
		pagination: _result.pagination,
		data: _result.data,
		status: 200
	})

})

// @desc      Get a bracket
// @route     GET /blog/v1/subscribers/:id
// @access    Private
export const getSubscriber = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const subber = await Subscriber.findOne({ _id: req.params.id })

	if(!subber){
		return next(new ErrorResponse('Error', 404, ['subscriber does not exist']))
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: subber,
		message: 'successful',
		status: 200
	})

})

// @desc      Search list of subscribers
// @route     POST /blog/v1/subscribers/seek
// @access    Private
export const seekSubscribers = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const { key } = req.body;

	let result: IPagination = {
		count: 0, 
		total: 0, 
		pagination: { next: { page: 1, limit: 1 }, prev: { page: 1, limit: 1 } }, 
		data: []
	};

	const user = await User.findOne({ _id: req.user._id });

	if(!user){
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	if(user.userType === 'superadmin' || user.userType === 'admin'){

		const query: ISearchQuery = {
			model: Subscriber,
			ref: null,
			value: null,
			data: [
				{ name: { $regex: key, $options: 'i' } },
				{ email: { $regex: key, $options: 'i' } }
			],
			query: null,
			queryParam: req.query,
			populate: [],
			operator: 'or'
		}
	
		result = await search(query); // search from DB
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

// @desc      Add a subscriber
// @route     POST /blog/v1/subscribers
// @access    Private
export const addSubscriber = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	let result = {
		email: '',
		joinedAt: '',
		isEnabled: false
	};
	
	const { name, email } = req.body;

	if(!email){
		return next(new ErrorResponse('Error', 400, ['email is required']))
	}

	const check = await UserService.checkEmail(email);

	if(!check){
		return next(new ErrorResponse('Error', 400, ['enter a valid email']))
	}

	const gen = await SystemService.generateCode(8,true);
	const exist = await Subscriber.findOne({ email: email });

	if(!exist){

		const subber = await Subscriber.create({
			email: email,
			name: name ? name : 'Champ',
			isEnabled: true,
			code: gen.toString()
		});

		result = {
			email: subber.email,
			joinedAt: subber.createdAt,
			isEnabled: subber.isEnabled
		}
		
	}

	if(exist){

		exist.createdAt = dateToday(Date.now()).ISO
		exist.isEnabled = true;
		exist.leftAt = '';
		await exist.save()

		result = {
			email: exist.email,
			joinedAt: exist.createdAt,
			isEnabled: exist.isEnabled
		}

	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.Subscribers);

	res.status(200).json({
		error: false,
		errors: [],
		data: result,
		message: 'successful',
		status: 200
	})

})

// @desc      Update a category
// @route     PUT /blog/v1/subscribers/:id
// @access    Private
export const updateSubscriber = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const { email, name, dp } = req.body;

	const subber = await Subscriber.findOne({ _id: req.params.id });

	if(!subber){
		return next(new ErrorResponse('Error', 404, ['subber does not exist']))
	}

	if(email && subber.email !== email){

		const exist = await Subscriber.findOne({ email: email });

		if(exist){
			return next(new ErrorResponse('Error', 403, ['email already exists']))
		}

		subber.email = email;

	}

	subber.name = name ? name : subber.name;
	await subber.save();

	if(dp){
		
		if(!isString(dp)){
			return next(new ErrorResponse(`Error!`, 400, ['dp image should be a string']));
		}

		const mime = dp.split(';base64')[0].split(':')[1];
    
        if(!mime || mime === '') {
            return next(new ErrorResponse(`invalid format`, 400, ['dp image is is expected to be base64 string']));
        }

		const gen = generate(8, false);
		// upload file
        const fileData = {
            file: dp,
            filename: gen.toString() + '_' + 'dp',
            mimeType: mime
        }

		// delete the prev file if it exists
		if(subber.dp){

			const splitted = subber.dp.split('/');
			const _name = splitted[splitted.length - 1]
			await deleteGcFile(_name);

		}

		const gData = await uploadBase64File(fileData);

		subber.dp = gData.publicUrl;
		await subber.save();

	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.Subscribers);

	res.status(200).json({
		error: false,
		errors: [],
		data: subber,
		message: 'successful',
		status: 200
	})

})

// @desc      Update a category
// @route     PUT /blog/v1/subscribers/update
// @access    Private
export const updateDetails = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const { email, newEmail, name, dp } = req.body;

	const subber = await Subscriber.findOne({ email: email });

	if(!subber){
		return next(new ErrorResponse('Error', 404, ['subber does not exist']))
	}

	if(newEmail && subber.email !== newEmail){

		const exist = await Subscriber.findOne({ email: newEmail });

		if(exist){
			return next(new ErrorResponse('Error', 403, ['email already exists']))
		}

		subber.email = email;

	}

	subber.name = name ? name : subber.name;
	await subber.save();

	if(dp){
		
		if(!isString(dp)){
			return next(new ErrorResponse(`Error!`, 400, ['dp image should be a string']));
		}

		const mime = dp.split(';base64')[0].split(':')[1];
    
        if(!mime || mime === '') {
            return next(new ErrorResponse(`invalid format`, 400, ['dp image is is expected to be base64 string']));
        }

		const gen = generate(8, false);
		// upload file
        const fileData = {
            file: dp,
            filename: gen.toString() + '_' + 'dp',
            mimeType: mime
        }

		// delete the prev file if it exists
		if(subber.dp){

			const splitted = subber.dp.split('/');
			const _name = splitted[splitted.length - 1]
			await deleteGcFile(_name);

		}

		const gData = await uploadBase64File(fileData);

		subber.dp = gData.publicUrl;
		await subber.save();

	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.Subscribers);

	res.status(200).json({
		error: false,
		errors: [],
		data: subber,
		message: 'successful',
		status: 200
	})

})

// @desc      Enable a category
// @route     PUT /blog/v1/subscribers/enable/:id
// @access    Private
export const enableSubscriber = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const subber = await Subscriber.findOne({ _id: req.params.id });

	if(!subber){
		return next(new ErrorResponse('Error', 404, ['subscriber does not exist']))
	}

	if(subber.isEnabled === false){
		subber.isEnabled = true;
		subber.createdAt = dateToday(Date.now()).ISO
		subber.leftAt = '';
		await subber.save();
	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.Subscribers);

	res.status(200).json({
		error: false,
		errors: [],
		data: subber,
		message: 'successful',
		status: 200
	})

})

// @desc      Enable a category
// @route     PUT /blog/v1/subscribers/disable
// @access    Private
export const disableSubscriber = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const { email } = req.body;

	const subber = await Subscriber.findOne({ email: email });

	if(!subber){
		return next(new ErrorResponse('Error', 404, ['subscriber does not exist']))
	}

	if(subber.isEnabled === true){

		subber.isEnabled = false;
		subber.leftAt = dateToday(Date.now()).ISO;
		await subber.save();

	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.Subscribers);

	res.status(200).json({
		error: false,
		errors: [],
		data: subber,
		message: 'successful',
		status: 200
	})

})

// @desc      Enable a category
// @route     DELETE /blog/v1/subscribers/:id
// @access    Private
export const deleteSubscriber = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const subber = await Subscriber.findOne({ _id: req.params.id });

	if(!subber){
		return next(new ErrorResponse('Error', 404, ['subscriber does not exist']))
	}

	await Subscriber.deleteOne({ _id: subber._id });

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.Subscribers);

	res.status(200).json({
		error: false,
		errors: [],
		data: {},
		message: 'successful',
		status: 200
	})

})






