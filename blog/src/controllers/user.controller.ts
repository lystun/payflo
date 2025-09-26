import crypto from 'crypto';
import mongoose, { ObjectId, Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { asyncHandler, strIncludesEs6, arrayIncludes, isString, dateToday } from '@btffamily/vacepay'
import { generate } from '../utils/random.util';
import { uploadBase64File } from '../utils/google.util'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import User from '../models/User.model'

import nats from '../events/nats';
import { IOverviewData } from '../utils/types.util';
import PostService from '../services/post.service';
import CategoryService from '../services/category.service';
import TagService from '../services/tag.service';
import BracketService from '../services/bracket.service';
import CommentService from '../services/comment.service';
import UserService from '../services/user.service';
import Post from '../models/Post.model';
import { checkDateFormat } from '@btffamily/vacepay/build/utils/functions.util';
import { NewAuditDTO } from '../dtos/audit.dto';
import SystemService from '../services/system.service';

// @desc           Get all users
// @route          GET /api/v1/users
// @access         Private
export const getUsers = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);   
})

// @desc    Get a user
// @route   GET /api/v1/users/:id
// @access  Private/Superadmin/Admin
export const getUser = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const user = await User.findById(req.params.id).populate(
	[
		{ path: 'posts', select: '_id name' },
		{ path: 'comments', select: '_id name' },
		{ path: 'tags', select: '_id name' },
		{ path: 'business', select: '_id name' }
	]);

	if(!user){
		return next(new ErrorResponse(`Error!`, 404, ['Could not find user']))
	}
	
	let audit: NewAuditDTO = {
		user: null,
		action: 'getUser',
		description: 'get a user information from db',
		entity: 'User',
		controller: 'User',
		changes: req.body
	}

	await SystemService.syncNatsData(audit, 'audit.created', 'type.audit');

	res.status(200).json({
		error: false,
		errors: [],
		message: `successful`,
		data: user,
		status: 200
	});

})

export const getOverview = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const { date } = req.query;
	let overData: Partial<IOverviewData> = {};
	
	const user = await User.findOne({ _id: req.params.id })

	if(!user){
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	if(date && !checkDateFormat(date.toString())){
		return next(new ErrorResponse('Error', 404, ['invalid date format. use YYYY-MM-DD or YYYY/MM/DD']))
	}

	if(user.userType === 'superadmin' || user.userType === 'admin'){

		const pd = await PostService.overview(null);
		const cd = await CategoryService.overview();
		const td = await TagService.overview(null);
		const bd = await BracketService.overview();
		const cmd = await CommentService.overview()
		const ud = await UserService.overview()
		const ld = await PostService.graphData(date ? date.toString() : '', null);

		overData = {
			posts: {
				total: pd.total,
				pending: pd.pending,
				published: pd.published,
				enabled: pd.enabled,
				disabled: pd.disabled
			},
			categories: {
				total: cd.total,
				enabled: cd.enabled,
				disabled: cd.disabled
			},
			tags: {
				total: td.total,
				enabled: td.enabled,
				disabled: td.disabled
			},
			brackets: {
				total: bd.total,
				enabled: bd.enabled,
				disabled: bd.disabled
			},
			comments: {
				total: cmd.total,
				enabled: cmd.enabled,
				disabled: cmd.disabled
			},
			users: {
				total: ud.total,
				writers: ud.writers,
				admins: ud.admins,
				teachers: ud.teachers,
				mentors: ud.mentors
			},
			subscribers: ud.subscribers,
			graph: ld
		}

	}

	if(user.userType !== 'superadmin' && user.userType !== 'admin'){

		const pd = await PostService.overview(user._id);
		const cd = await CategoryService.overview();
		const td = await TagService.overview(user._id);
		const bd = await BracketService.overview();
		const cmd = await CommentService.overview()
		const ld = await PostService.graphData(date ? date.toString() : '', user._id);

		overData = {
			posts: {
				total: pd.total,
				pending: pd.pending,
				published: pd.published,
				enabled: pd.enabled,
				disabled: pd.disabled
			},
			categories: {
				total: cd.total,
				enabled: cd.enabled,
				disabled: cd.disabled
			},
			tags: {
				total: td.total,
				enabled: td.enabled,
				disabled: td.disabled
			},
			brackets: {
				total: bd.total,
				enabled: bd.enabled,
				disabled: bd.disabled
			},
			comments: {
				total: cmd.total,
				enabled: cmd.enabled,
				disabled: cmd.disabled
			},
			graph: ld
		}

	}


	res.status(200).json({
		error: false,
		errors: [],
		message: `successful`,
		data: overData,
		status: 200
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