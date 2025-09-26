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
import { IResult } from '../utils/types.util';
import Permission from '../models/Permission.model';
import PermissionService from '../services/permission.service';
import { UpdatePermissionsRequestDTO } from '../dtos/user.dto';
import UserRepository from '../repositories/user.repository';
dayjs.extend(customparse)

/**
 * @name getPermissions
 * @description Get resource from the database
 * @route POST /identity/v1/permissions
 * @access Public
 */
export const getPermissions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);
})

/**
 * @name getPermission
 * @description Get resource from the database
 * @route GET /identity/v1/permissions/:id
 * @access Private | superadmin, admin
 */
export const getPermission = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const permission = await Permission.findOne({ _id: req.params.id })

	if (!permission) {
		return next(new ErrorResponse('Error', 404, ['permission does not exist']))
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: permission,
		message: `successful`,
		status: 200
	});

})

/**
 * @name getPermissionByEntity
 * @description Get resource from the database
 * @route POST /identity/v1/permissions/entity
 * @access Private | superadmin, admin
 */
export const getPermissionByEntity = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const { entity } = req.body;

	const permission = await Permission.findOne({ entity: entity })

	if (!permission) {
		return next(new ErrorResponse('Error', 404, ['permission does not exist']))
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: permission,
		message: `successful`,
		status: 200
	});

})

/**
 * @name getDefaultPermissions
 * @description Get resource from the database
 * @route POST /identity/v1/permissions/default
 * @access Private | superadmin, admin
 */
export const getDefaultPermissions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const { userType } = req.body;

	let permissionList = await PermissionService.getDefaultPermissions(userType);
	const permissions = permissionList.map((perm, index) => {

		let actions = perm.actions.map((action) => { return { type: 'add', label: action } })
		return { entity: perm.entity, type: 'add', actions: actions }

	})

	res.status(200).json({
		error: false,
		errors: [],
		data: permissions,
		message: `successful`,
		status: 200
	});

})

/**
 * @name updateUserPermissions
 * @description Get resource from the database
 * @route PUT /identity/v1/permissions/update-user
 * @access Private | superadmin, admin
 */
export const updateUserPermissions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	let permList: Array<any> = []
	const { permissions, userId } = req.body as UpdatePermissionsRequestDTO;

	if (!userId) {
		return next(new ErrorResponse('Error', 400, ['user id is required']))
	}

	if (!permissions || permissions.length <= 0) {
		return next(new ErrorResponse('Error', 400, ['permission list is required']))
	}

	let user = await User.findOne({ _id: userId });

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	user = await PermissionService.updatePermissions({ permissions, user });

	const natsUser = await UserRepository.findByEmailSelectPassword(user.email, true);

	if (natsUser) {
		permList = natsUser.permissions.map((x) => {  return { entity: x.entity, actions: x.actions.map((m) => { return m }) } })
		await SystemService.syncNatsData({ user: natsUser, userType: natsUser.userType, phoneCode: natsUser.phoneCode }, 'user.updated', 'type.update');
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: permList,
		message: `successful`,
		status: 200
	});

})