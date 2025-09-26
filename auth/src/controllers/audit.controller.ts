import crypto from 'crypto';
import express, { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { arrayIncludes, asyncHandler, notDefined, strIncludesEs6 } from '@btffamily/vacepay';
import { sendGrid } from '../utils/email.util';

import User from '../models/User.model';
import { generate } from '../utils/random.util'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
import EmailService from '../services/email.service';
import UserService from '../services/user.service';
import SystemService from '../services/system.service';
import { TestSMSDTO, UpdateNotificationsDTO } from '../dtos/system.dto';
import SMSService from '../services/sms.service';
import { IResult, ISearchQuery } from '../utils/types.util';
import Permission from '../models/Permission.model';
import PermissionService from '../services/permission.service';
import { UpdatePermissionsRequestDTO } from '../dtos/user.dto';
import UserRepository from '../repositories/user.repository';
import Audit from '../models/Audit.model';
import { advanced } from '../utils/result.util';
dayjs.extend(customparse)

/**
 * @name getAudits
 * @description Get resource from the database
 * @route POST /identity/v1/audits
 * @access Public
 */
export const getAudits = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);
})

/**
 * @name getAudit
 * @description Get resource from the database
 * @route GET /identity/v1/audits/:id
 * @access Private | superadmin, admin
 */
export const getAudit = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const audit = await Audit.findOne({ _id: req.params.id }).populate([
		{ path: 'user', select: "_id email firstName lastName businessName userType login" }
	])

	if (!audit) {
		return next(new ErrorResponse('Error', 404, ['audit does not exist']))
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: audit,
		message: `successful`,
		status: 200
	});

})

/**
 * @name getUserAudits
 * @description Get resource from the database
 * @route GET /identity/v1/audits/user-audits/:id
 * @access Private | superadmin, admin
 */
export const getUserAudits = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const user = await User.findOne({ _id: req.params.id });

	if(!user){
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const pop = [
		{ path: 'user', select: "_id email firstName lastName businessName userType login" }
	]

	const result = await advanced(Audit, pop, 'name', req, 'user', user._id, null, 'absolute')

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