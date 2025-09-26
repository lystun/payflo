import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { arrayIncludes, asyncHandler } from '@btffamily/vacepay'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import User from '../models/User.model'
import Category from '../models/Category.model'
import Post from '../models/Post.model'
import Tag from '../models/Tag.model'
import Comment from '../models/Comment.model'
import { advanced } from '../utils/result.util';

// @desc      Get all Comments
// @route     GET /blog/v1/comments
// @access    Private
export const getComments = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);   
})

// @desc      Get a Comments
// @route     GET /blog/v1/comments/:id
// @access    Private
export const getComment = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const comment = await Comment.findOne({ _id: req.params.id }).populate([
		{ path: 'post' },
		{ path: 'user' }
	]);

	if(!comment){
		return next(new ErrorResponse('Error', 404, ['comment does not exist']))
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: comment,
		message: 'successful',
		status: 200
	})


})

// @desc      Get user comments
// @route     GET /blog/v1/comments/get-comments/:id
// @access    Private
export const getUserComments = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const user = await User.findOne({ _id: req.params.id })

	if(!user){
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const result = await advanced(Comment, [{ path: 'post' }], '', req, 'user', user._id);

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

// @desc      Add a Comment
// @route     POST /blog/v1/comments
// @access    Private
export const addComment = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const user = req.user;

	const { body } = req.body

	const post = await Post.findOne({ _id: req.params.id });

	if(!post){
		return next(new ErrorResponse('Error', 404, ['post does not exist']))
	}

	const comment = await Comment.create({
		body,
		isEnabled: true,
		post: post._id,
		author: 'Annonymous'
	});

	if(user && user._id){

		comment.user = user._id;
		comment.author = user._id;
		await comment.save();

	}

	post.comments.push(comment._id);
	await post.save();

	res.status(200).json({
		error: false,
		errors: [],
		data: comment,
		message: 'successful',
		status: 200
	})


})


// @desc      Add reaction to a Comment
// @route     PUT /blog/v1/comments/add-reaction/:id
// @access    Private
export const addReaction = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const user = req.user;

	const allowed: Array<string> = ['like', 'insight', 'clap'];
	
	const { type } = req.body;
	
	const comment = await Comment.findOne({ _id: req.params.id });

	if(!comment){
		return next(new ErrorResponse('Error', 404, ['comment does not exist']))
	}

	if(!arrayIncludes(allowed, type.toString())){
		return next(new ErrorResponse('Error', 400, [`invalid reaction type. choose one of ${allowed.join(',')}`]))
	}

	const exist = comment.reactions.find((r) => r.type === type);

	if(exist){

		for(let i = 0; i < comment.reactions.length; i++){

			if( comment.reactions[i].type === type){
				comment.reactions[i].count = comment.reactions[i].count + 1;
				await comment.save();
			}
	
		}

	}else{

		comment.reactions.push({ type: type, count: 1 })

	}

	res.status(200).json({
		error: false,
		errors: [],
		data: comment,
		message: 'successful',
		status: 200
	})

})


// @desc      Enable a Comment
// @route     PUT /blog/v1/comments/enable/:id
// @access    Private
export const enableComment = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const comment = await Comment.findOne({ _id: req.params.id });

	if(!comment){
		return next(new ErrorResponse('Error', 404, ['comment does not exist']))
	}

	comment.isEnabled = true;
	await comment.save();

	res.status(200).json({
		error: false,
		errors: [],
		data: comment,
		message: 'successful',
		status: 200
	})

})


// @desc      Disable a Comment
// @route     PUT /blog/v1/comments/disable/:id
// @access    Private
export const disableComment = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const comment = await Comment.findOne({ _id: req.params.id });

	if(!comment){
		return next(new ErrorResponse('Error', 404, ['comment does not exist']))
	}

	comment.isEnabled = false;
	await comment.save();

	res.status(200).json({
		error: false,
		errors: [],
		data: comment,
		message: 'successful',
		status: 200
	})

})

// @desc      Delete a Comment
// @route     DELETE /blog/v1/comments
// @access    Private
export const deleteComment = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const comment = await Comment.findOne({ _id: req.params.id });

	if(!comment){
		return next(new ErrorResponse('Error', 404, ['comment does not exist']))
	}

	const post = await Post.findOne({ _id: comment.post });

	if(post && arrayIncludes(post.comments, comment._id.toString())){

		const index = post.comments.findIndex((c: any) => c._id.toString() === comment._id.toString());
		post.comments.splice(index, 1);
		await post.save();

	}

	await Comment.deleteOne({ _id: comment._id });

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



