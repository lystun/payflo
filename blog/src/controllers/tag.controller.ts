import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { asyncHandler } from '@btffamily/vacepay'
import TagService from '../services/tag.service';
import mongoose from 'mongoose'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import User from '../models/User.model'
import Category from '../models/Category.model'
import Post from '../models/Post.model'
import Tag from '../models/Tag.model'
import { advanced, search } from '../utils/result.util';
import PostService from '../services/post.service';
import CategoryService from '../services/category.service';
import { IPagination, ISearchQuery } from '../utils/types.util';

// @desc      Get all Tags
// @route     GET /blog/v1/tags 
// @access    Private
export const getTags = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);   
})

// @desc      Get a Tag
// @route     GET /blog/v1/tags/all
// @access    Private
export const getAllTags = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const tags = await Tag.find({}).populate([
		{ path: 'posts' },
		{ path: 'categories' },
		{ path: 'user' }
	])

	const list = tags.filter((x) => x.isEnabled === true);

	res.status(200).json({
		error: false,
		errors: [],
		data: list,
		message: 'successful',
		status: 200
	})

})

// @desc      Get a category
// @route     GET /blog/v1/tags/posts/:id
// @access    Private
export const getPosts = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const tag = await Tag.findOne({ _id: req.params.id });

	if(!tag){
		return next(new ErrorResponse('Error', 404, ['tag does not exist']))
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

	const result = await advanced(Post, pop, 'createdAt', req, null, null, [
		{ 'tags' : [tag._id] }
	]);

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

// @desc      Get a Tag
// @route     GET /blog/v1/tags/:id
// @access    Private
export const getTag = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const tag = await Tag.findOne({ _id: req.params.id }).populate([
		{ path: 'posts' },
		{ path: 'categories' },
		{ path: 'user' }
	])

	if(!tag){
		return next(new ErrorResponse('Error', 404, ['tag does not exist']))
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: tag,
		message: 'successful',
		status: 200
	})

})

// @desc      Get user tags
// @route     GET /blog/v1/tags/get-tags/:id
// @access    Private
export const getUserTags = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const user = await User.findOne({ _id: req.params.id })

	if(!user){
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const result = await advanced(Tag, [{ path: 'posts' }, { path: 'categories' }, { path: 'user' }], 'name', req, 'user', user._id);

	res.status(200).json({
		error: false,
		errors: [],
		count: result.count,
		total: result.data.length,
		message: 'successfull',
		pagination: result.pagination,
		data: result.data,
		status: 200
	});

})

// @desc      Remove tag from a Post
// @route     POST /blog/v1/tags/seek
// @access    Private
export const seekTags = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
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
			model: Tag,
			ref: null,
			value: null,
			data: [
				{ name: { $regex: key, $options: 'i' } }
			],
			query: null,
			queryParam: req.query,
			populate: [
				{ path: 'posts' },
				{ path: 'categories' }
			],
			operator: 'or'
		}
	
		result = await search(query); // search from DB
	}
	
	if(user.userType !== 'superadmin' && user.userType !== 'admin'){

		const query: ISearchQuery = {
			model: Tag,
			ref: 'author',
			value: user._id,
			data: [
				{ name: { $regex: key, $options: 'i' } }
			],
			query: null,
			queryParam: req.query,
			populate: [
				{ path: 'posts' },
				{ path: 'categories' }
			],
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

// @desc      Add a tag
// @route     POST /blog/v1/tags?userId=
// @access    Private
export const addTag = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const { name, description, posts, categories } = req.body;

	const user = await User.findOne({ _id: req.user._id });

	if(!user){
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const exist = await Tag.findOne({ name : name });

	if(exist){
		return next(new ErrorResponse('Error', 404, ['tag already exist. use another name']))
	}

	const tag = await Tag.create({
		name: name,
		description: description,
		isEnabled: true,
		user:  user._id
	})

	if(posts && posts.length > 0){

		for(let i = 0; i < posts.length; i++){

			const p = await Post.findOne({ _id: posts[i] });

			if(p){
				tag.posts.push(p._id);
				await tag.save();

				await PostService.attachTag(p, tag);
			}

		}

	}

	if(categories && categories.length > 0){

		for(let i = 0; i < categories.length; i++){

			const c = await Category.findOne({ _id: categories[i] });

			if(c){
				tag.categories.push(c._id);
				await tag.save();

				await CategoryService.attachTag(c, tag)
			}

		}

	}

	res.status(200).json({
		error: false,
		errors: [],
		data: tag,
		message: 'successful',
		status: 200
	})

})

// @desc      Update a category
// @route     PUT /blog/v1/tags/:id
// @access    Private
export const updateTag = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const { name, description } = req.body;

	const tag = await Tag.findOne({ _id: req.params.id });

	if(!tag){
		return next(new ErrorResponse('Error', 404, ['tag does not exist']))
	}

	if(name){

		const exist = await Tag.findOne({ name: name });

		if(!exist){
			return next(new ErrorResponse('Error', 400, ['tag name already exist']))
		}

	}

	tag.name = name ? name : tag.name;
	tag.description = description ? description : tag.description;
	await tag.save();

	res.status(200).json({
		error: false,
		errors: [],
		data: tag,
		message: 'successful',
		status: 200
	})

})

// @desc      Enable a category
// @route     PUT /blog/v1/tags/enable/:id
// @access    Private
export const enableTag = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const tag = await Tag.findOne({ _id: req.params.id });

	if(!tag){
		return next(new ErrorResponse('Error', 404, ['tag does not exist']))
	}

	tag.isEnabled = true;
	await tag.save();

	res.status(200).json({
		error: false,
		errors: [],
		data: tag,
		message: 'successful',
		status: 200
	})

})

// @desc      Enable a category
// @route     PUT /blog/v1/tags/disable/:id
// @access    Private
export const disableTag = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const tag = await Tag.findOne({ _id: req.params.id });

	if(!tag){
		return next(new ErrorResponse('Error', 404, ['tag does not exist']))
	}

	tag.isEnabled = false;
	await tag.save();

	res.status(200).json({
		error: false,
		errors: [],
		data: tag,
		message: 'successful',
		status: 200
	})

})

// @desc      Delete a Tag
// @route     DELETE /blog/v1/tags/:id
// @access    Private
export const deleteTag = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const tag = await Tag.findOne({ _id: req.params.id });

	if(!tag){
		return next(new ErrorResponse('Error', 404, ['tag does not exist']))
	}

	if(tag.posts.length > 0){
		await TagService.removeTagFromPosts(tag._id);
	}

	if(tag.categories.length > 0){
		await TagService.removeTagFromCategories(tag._id);
	}

	await Tag.deleteOne({ _id: tag._id });

	res.status(200).json({
		error: false,
		errors: [],
		data: null,
		message: 'successful',
		status: 200
	})

})

/** 
 * snippet
 * **/

// @desc        Login user (with verification)
// @route       POST /api/identity/v1/auth/login
// @access      Public
// export const funcd = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

// })



