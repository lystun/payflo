import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { asyncHandler } from '@btffamily/vacepay'
import PostService from '../services/post.service'
import CategoryService from '../services/category.service'
import SystemService from '../services/system.service'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import User from '../models/User.model'
import Bracket from '../models/Bracket.model'
import Post from '../models/Post.model'
import redis from '../middleware/redis.mw';
import { CacheKeys } from '../utils/cache.util';
import { advanced } from '../utils/result.util';


// @desc      Get all brackets
// @route     GET /blog/v1/brackets
// @access    Private
export const getBrackets = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);   
})

// @desc      Get a bracket
// @route     GET /blog/v1/brackets/:id
// @access    Private
export const getAllBrackets = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const brackets = await Bracket.find({}).populate([
		{ path: 'posts' }
	])

	const list = brackets.filter((x) => x.isEnabled === true);

	res.status(200).json({
		error: false,
		errors: [],
		data: list,
		message: 'successful',
		status: 200
	})

})

// @desc      Get a bracket
// @route     GET /blog/v1/brackets/:id
// @access    Private
export const getBracket = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const bracket = await Bracket.findOne({ _id: req.params.id }).populate([
		{ path: 'posts' }
	])

	if(!bracket){
		return next(new ErrorResponse('Error', 404, ['bracket does not exist']))
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: bracket,
		message: 'successful',
		status: 200
	})

})

// @desc      Get a category
// @route     GET /blog/v1/brackets/posts/:id
// @access    Private
export const getPosts = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const bracket = await Bracket.findOne({ _id: req.params.id });

	if(!bracket){
		return next(new ErrorResponse('Error', 404, ['bracket does not exist']))
	}

	const pop = [
		{ path: 'comments' },
		{ path: 'tags' },
		{ path: 'category' },
		{ path: 'bracket' },
		{ path: 'contributors' },
		{ path: 'reactions.user', select: '_id firstName, lastName' },
		{ path: 'author', select: '_id firstName lastName' },
		{ path: 'user', select: '_id firstName, lastName' },
	]

	const result = await advanced(Post, pop, 'createdAt', req, 'bracket', bracket._id, null);

	res.status(200).json({
		error: false,
		errors: [],
		total: result.total,
		count: result.count,
		pagination: result.pagination,
		data: result.data,
		message: 'successful',
		status: 200
	})

})

// @desc      Get user brackets
// @route     GET /blog/v1/categories/get-brackets/:id
// @access    Private
export const getUserBrackets = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const user = await User.findOne({ _id: req.params.id })

	if(!user){
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const result = await advanced(Bracket, [{ path: 'posts' }], 'name', req, 'user', user._id);

	res.status(200).json({
		error: false,
		errors: [],
		total: result.data.length,
		message: 'successfull',
		pagination: result.pagination,
		data: result.data,
		status: 200
	});

})


// @desc      Add a bracket
// @route     POST /blog/v1/brackets?userId=
// @access    Private
export const addBracket= asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const _user = req.user;
	
	const { name, description, posts } = req.body;
	const { userId } = req.query;

	if(userId && userId !== ''){

		const existing = await User.findOne({ _id: userId});

		if(!existing){
			return next(new ErrorResponse('Error', 404, ['user does not exist']))
		}

	}

	const exist = await Bracket.findOne({ name: name });

	if(exist){
		return next(new ErrorResponse('Error', 400, ['bracket already exists. user another name']))
	}

	const code = await SystemService.getCodeFromName(name);

	const bracket = await Bracket.create({
		name: name,
		description: description,
		isEnabled: true,
		user: userId && userId !== '' ? userId : _user._id,
		code: code.toUpperCase()
	})

	if(posts && posts.length > 0){

		for(let i = 0; i < posts.length; i++){

			const p = await Post.findOne({ _id: posts[i] });

			if(p){
				bracket.posts.push(p._id);
				await bracket.save();
			}

		}

	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.Brackets);

	res.status(200).json({
		error: false,
		errors: [],
		data: bracket,
		message: 'successful',
		status: 200
	})

})

// @desc      Update a category
// @route     PUT /blog/v1/brackets/:id
// @access    Private
export const updateBracket = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const { name, description } = req.body;

	const bracket = await Bracket.findOne({ _id: req.params.id });

	if(!bracket){
		return next(new ErrorResponse('Error', 404, ['bracket does not exist']))
	}

	if(name && bracket.name !== name){

		const exist = await Bracket.findOne({ name: name });

		if(exist){
			return next(new ErrorResponse('Error', 400, ['bracket already exists. user another name']))
		}

		const code = await SystemService.getCodeFromName(name)
		bracket.name = name;
		bracket.code = code.toUpperCase();
		await bracket.save();

	}

	if(description){

		bracket.description = description;
		await bracket.save();

	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.Brackets);

	res.status(200).json({
		error: false,
		errors: [],
		data: bracket,
		message: 'successful',
		status: 200
	})

})

// @desc      Enable a category
// @route     PUT /blog/v1/brackets/enable/:id
// @access    Private
export const enableBracket = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const bracket = await Bracket.findOne({ _id: req.params.id });

	if(!bracket){
		return next(new ErrorResponse('Error', 404, ['bracket does not exist']))
	}

	if(bracket.isEnabled === false){
		bracket.isEnabled = true;
		await bracket.save();
	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.Brackets);

	res.status(200).json({
		error: false,
		errors: [],
		data: bracket,
		message: 'successful',
		status: 200
	})

})

// @desc      Enable a category
// @route     PUT /blog/v1/brackets/disable/:id
// @access    Private
export const disableBracket = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const bracket = await Bracket.findOne({ _id: req.params.id });

	if(!bracket){
		return next(new ErrorResponse('Error', 404, ['bracket does not exist']))
	}

	if(bracket.isEnabled === true){
		bracket.isEnabled = false;
		await bracket.save();
	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.Brackets);

	res.status(200).json({
		error: false,
		errors: [],
		data: bracket,
		message: 'successful',
		status: 200
	})

})




