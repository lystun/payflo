import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { asyncHandler } from '@btffamily/vacepay'
import PostService from '../services/post.service'
import CategoryService from '../services/category.service'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import User from '../models/User.model'
import Category from '../models/Category.model'
import Post from '../models/Post.model'
import redis from '../middleware/redis.mw';
import { CacheKeys } from '../utils/cache.util';
import { advanced, search } from '../utils/result.util';
import SystemService from '../services/system.service';
import { IPagination, ISearchQuery } from '../utils/types.util';


// @desc      Get all categories
// @route     GET /blog/v1/categories
// @access    Private
export const getCategories = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);   
})

// @desc      Get a category
// @route     GET /blog/v1/categories/all
// @access    Private
export const getAllCategories = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const categories = await Category.find().populate([
		{ path: 'posts' }
	])

	const list = categories.filter((x) => x.isEnabled === true);

	res.status(200).json({
		error: false,
		errors: [],
		data: list,
		message: 'successful',
		status: 200
	})

})

// @desc      Get a category
// @route     GET /blog/v1/categories/posts/:id
// @access    Private
export const getPosts = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const category = await Category.findOne({ _id: req.params.id });

	if(!category){
		return next(new ErrorResponse('Error', 404, ['category does not exist']))
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

	const result = await advanced(Post, pop, 'createdAt', req, 'category', category._id, null);

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

// @desc      Get a category
// @route     GET /blog/v1/categories/:id
// @access    Private
export const getCategory = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const category = await Category.findOne({ _id: req.params.id }).populate([
		{ path: 'posts' }
	])

	if(!category){
		return next(new ErrorResponse('Error', 404, ['category does not exist']))
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: category,
		message: 'successful',
		status: 200
	})

})

// @desc      Get user categories
// @route     GET /blog/v1/categories/get-categores/:id
// @access    Private
export const getUserCategories = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const user = await User.findOne({ _id: req.params.id })

	if(!user){
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const result = await advanced(Category, [{ path: 'posts' }], 'name', req, 'user', user._id);

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

export const seekCategories = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
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

	if(user.userType === 'superadmin'){

		const query: ISearchQuery = {
			model: Category,
			ref: null,
			value: null,
			data: [
				{ name: { $regex: key, $options: 'i' } }
			],
			query: null,
			queryParam: req.query,
			populate: [
				{ path: 'posts' }
			],
			operator: 'or'
		}
	
		result = await search(query); // search from DB
	}
	
	if(user.userType === 'admin'){

		const query: ISearchQuery = {
			model: Category,
			ref: 'author',
			value: user._id,
			data: [
				{ name: { $regex: key, $options: 'i' } }
			],
			query: null,
			queryParam: req.query,
			populate: [
				{ path: 'posts' }
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

// @desc      Add a category
// @route     POST /blog/v1/categories?userId=
// @access    Private
export const addCategory = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const { name, description, posts } = req.body;

	const user = await User.findOne({ _id: req.user._id });

	if(!user){
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const exist = await Category.findOne({ name: name })

	if(exist){
		return next(new ErrorResponse('Error', 400, ['category already exist. use another name']))
	}

	const code = await SystemService.getCodeFromName(name)

	const category = await Category.create({
		name: name,
		description: description,
		isEnabled: true,
		user: user._id,
		code: code.toUpperCase()
	})

	if(posts && posts.length > 0){

		for(let i = 0; i < posts.length; i++){

			const p = await Post.findOne({ _id: posts[i] });

			if(p){
				category.posts.push(p._id);
				await category.save();
			}

		}

	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.Categories);

	res.status(200).json({
		error: false,
		errors: [],
		data: category,
		message: 'successful',
		status: 200
	})

})

// @desc      Update a category
// @route     PUT /blog/v1/categories/:id
// @access    Private
export const updateCategory = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const { name, description } = req.body;

	const category = await Category.findOne({ _id: req.params.id });

	if(!category){
		return next(new ErrorResponse('Error', 404, ['category does not exist']))
	}

	if(name && category.name !== name){

		const exist = await Category.findOne({ name: name })

		if(!exist){
			return next(new ErrorResponse('Error', 400, ['category already exist. use another name']))
		}

		const code = await SystemService.getCodeFromName(name)
		category.name = name;
		category.code = code.toUpperCase();
		await category.save();

	}

	if(description){

		category.description = description;
		await category.save();

	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.Categories);

	res.status(200).json({
		error: false,
		errors: [],
		data: category,
		message: 'successful',
		status: 200
	})

})

// @desc      Enable a category
// @route     PUT /blog/v1/categories/enable/:id
// @access    Private
export const enableCategory = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const category = await Category.findOne({ _id: req.params.id });

	if(!category){
		return next(new ErrorResponse('Error', 404, ['category does not exist']))
	}

	category.isEnabled = true;
	await category.save();

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.Categories);

	res.status(200).json({
		error: false,
		errors: [],
		data: category,
		message: 'successful',
		status: 200
	})

})

// @desc      Enable a category
// @route     PUT /blog/v1/categories/disable/:id
// @access    Private
export const disableCategory = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const category = await Category.findOne({ _id: req.params.id });

	if(!category){
		return next(new ErrorResponse('Error', 404, ['category does not exist']))
	}

	category.isEnabled = false;
	await category.save();

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.Categories);

	res.status(200).json({
		error: false,
		errors: [],
		data: category,
		message: 'successful',
		status: 200
	})

})

// @desc      Add a Post to a Category
// @route     PUT /blog/v1/categories/add-post/:id
// @access    Private
export const addPostToCategory = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const { postId } = req.body;
	
	if(!postId){
		return next(new ErrorResponse('Error', 400, ['post id is required']))
	}

	const category = await Category.findOne({ _id: req.params.id });

	if(!category){
		return next(new ErrorResponse('Error', 404, ['category does not exist']))
	}

	const post = await Post.findOne({ _id: postId });

	if(!post){
		return next(new ErrorResponse('Error', 404, ['post does not exist']))
	}

	category.posts.push(post._id);
	await category.save();

	post.category = category._id;
	await post.save();

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.Categories);

	res.status(200).json({
		error: false,
		errors: [],
		data: category,
		message: 'successful',
		status: 200
	})

})

// @desc      Remove Post from a Category
// @route     PUT /blog/v1/categories/remove-post/:id
// @access    Private
export const removePostFromCategory = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const { postId } = req.body;

	if(!postId){
		return next(new ErrorResponse('Error', 400, ['post id is required']))
	}

	const category = await Category.findOne({ _id: req.params.id });

	if(!category){
		return next(new ErrorResponse('Error', 404, ['category does not exist']))
	}

	const post = await Post.findOne({ _id: postId });

	if(!post){
		return next(new ErrorResponse('Error', 404, ['post does not exist']))
	}

	const index = category.posts.findIndex((p) => p.toString() === post.toString())
	category.posts.slice(index, 1);
	await category.save();

	// attach post to next category
	const attach = await  PostService.attachPostToNextCategory(post._id, category._id);

	post.category = attach.data;
	await post.save()

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.Categories);

	res.status(200).json({
		error: false,
		errors: [],
		data: category,
		message: 'successful',
		status: 200
	})

})

// @desc      Delete a category
// @route     DELETE /blog/v1/categories/:id
// @access    Private
export const deleteCategory = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const category = await Category.findOne({ _id: req.params.id });

	if(!category){
		return next(new ErrorResponse('Error', 404, ['category does not exist']))
	}

	if(category.posts.length > 0){
		await CategoryService.removeCategoryFromPosts(category._id);
	}

	await Category.deleteOne({ _id: category._id });

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.Categories);

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
// @route       POST /identity/v1/auth/login
// @access      Public
// export const funcd = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

// })



