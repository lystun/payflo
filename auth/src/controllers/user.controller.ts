import crypto from 'crypto';
import mongoose, { ObjectId, Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { asyncHandler, strIncludesEs6, arrayIncludes, isString, dateToday, Random, checkDateFormat, leadingNum, notDefined, isDefined, capitalize } from '@btffamily/vacepay'
import { generate } from '../utils/random.util';
import { seedData } from '../config/seeds/seeder.seed';
import { uploadBase64File } from '../utils/google.util'
import VerificationService from '../services/verification.service'
import KYCService from '../services/kyc.service';
import { IBasicKyc, IAddressKyc, IVerificationDoc, IKycDoc, IKYBDoc, IKYBOwner, ISearchQuery, ISystemOverview } from '../utils/types.util'
import StorageService from '../services/storage.service'
import UserService from '../services/user.service'

import dayjs from 'dayjs';
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import User from '../models/User.model'
import Role from '../models/Role.model'
import Verification from '../models/Verification.model'

import nats from '../events/nats';
import UserCreated from '../events/publishers/user-created'
import Kyc from '../models/Kyc.model';
import EmailService from '../services/email.service';
import { BusinessType, TierLimits, TierLimitsConfig, UserType } from '../utils/enums.util';
import AuditService from '../services/audit.service';
import { VerificationType } from '../utils/enums.util';
import SystemService from '../services/system.service';
import Country from '../models/Country.model';
import KYBService from '../services/kyb.service';
import { advanced, search } from '../utils/result.util';
import Kyb from '../models/Kyb.model';
import { AddUserDTO, FilterUserDTO, PublishUserDTO, UpdateUserPINDTO, UpdateUserPasswordDTO } from '../dtos/user.dto';
import Notification from '../models/Notification.model';
import NotificationService from '../services/notification.service';
import BankService from '../services/bank.service';
import UserRepository from '../repositories/user.repository';
import Device from '../models/Device.model';
import PermissionService from '../services/permission.service';
import { deleteUserJob } from '../queues/jobs/user.job';

// @desc           Get all users
// @route          GET /v1/users
// @access         Private
export const getUsers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);
})

/**
 * @name getSystemOverview
 * @description Get reources from database
 * @route GET /identity/v1/users/overview
 */
export const getSystemOverview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	let overview: Partial<ISystemOverview> = {};

	const user = await UserService.overview();
	overview.user = user;

	res.status(200).json({
		error: false,
		errors: [],
		data: overview,
		message: `successful`,
		status: 200
	});

})

// @desc    Get a user
// @route   GET /v1/users/:id
// @access  Private/Superadmin/Admin
export const getUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const user = await User.findOne({ _id: req.params.id }).populate(
		[
			{ path: 'roles', select: '_id name resources' },
		]);

	if (!user) {
		return next(new ErrorResponse(`Error!`, 404, ['Could not find user']))
	}

	const _user = await User.findOne({ _id: user._id }).populate([
		{ path: 'roles', select: '_id name', },
		{ path: 'verification' },
		{ path: 'kyc' },
		{ path: 'country' },
	]);

	res.status(200).json({
		error: false,
		errors: [],
		message: `successful`,
		data: user.isSuper ? null : user,
		status: 200
	});

})

// @desc    Get user notifications
// @route   GET /v1/users/notifications/:id
// @access  Private/Superadmin/Admin
export const getUserNotifications = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const user = await User.findOne({ _id: req.params.id });

	if (!user) {
		return next(new ErrorResponse(`Error!`, 404, ['user does not exist']))
	}

	const result = await advanced(Notification, [], 'status', req, 'user', user._id);

	res.status(200).json({
		error: false,
		errors: [],
		count: result.count,
		total: result.total,
		pagination: result.pagination,
		data: result.data,
		message: `successful`,
		status: 200
	});

})

// @desc    Change notification status 
// @route   PUT /v1/users/read-notification/:id
// @access  Private/Superadmin/Admin
export const markNotificationAsRead = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const user = await User.findOne({ _id: req.user._id });

	const notification = await Notification.findOne({ _id: req.params.id });

	if (!notification) {
		return next(new ErrorResponse(`Error!`, 404, ['notification does not exist']))
	}

	if (user && arrayIncludes(user.notifications, notification._id.toString())) {
		await NotificationService.markAsRead(notification);
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: {},
		message: `successful`,
		status: 200
	});

})

// @desc    Get user notifications
// @route   GET /v1/users/notifications/:id
// @access  Private/Superadmin/Admin
export const getUserDevices = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const user = await User.findOne({ _id: req.params.id });

	if (!user) {
		return next(new ErrorResponse(`Error!`, 404, ['user does not exist']))
	}

	const result = await advanced(Device, [], 'status', req, 'user', user._id);

	res.status(200).json({
		error: false,
		errors: [],
		count: result.count,
		total: result.total,
		pagination: result.pagination,
		data: result.data,
		message: `successful`,
		status: 200
	});

})

// @desc    Search users
// @route   POST /identity/v1/users/search
// @access  Private/Superadmin/Admin
export const searchUsers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const { key } = req.body;

	if (!key) {
		return next(new ErrorResponse('Error', 400, [`search key is required`]))
	}

	const pop = [
		{ path: 'roles', select: '_id name', },
		{ path: 'verification' },
		{ path: 'kyc' },
		{ path: 'kyb' },
		{ path: 'country' },
	]

	const query: ISearchQuery = {
		model: User,
		ref: null,
		value: null,
		data: [
			{ firstName: { $regex: key, $options: 'i' } },
			{ lastName: { $regex: key, $options: 'i' } },
			{ businessName: { $regex: key, $options: 'i' } },
			{ email: { $regex: key, $options: 'i' } },
			{ phoneNumber: { $regex: key, $options: 'i' } },
			{ altPhone: { $regex: key, $options: 'i' } },
			{ countryPhone: { $regex: key, $options: 'i' } },
			{ userID: { $regex: key, $options: 'i' } }
		],
		query: null,
		queryParam: req.query,
		populate: pop,
		operator: 'or'
	}

	const result = await search(query); // search from DB

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

// @desc    Filter records and fetch users
// @route   POST /identity/v1/users/filter
// @access  Private/Superadmin/Admin
export const filterUsers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const body = req.body as FilterUserDTO;

	const filters = UserService.defineFilterQuery(body);

	const pop = [
		{ path: 'roles', select: '_id name', },
		{ path: 'verification' },
		{ path: 'kyc' },
		{ path: 'kyb' },
		{ path: 'country' },
	]

	const query: ISearchQuery = {
		model: User,
		ref: null,
		value: null,
		data: filters,
		query: null,
		queryParam: req.query,
		populate: pop,
		operator: 'and'
	}

	const result = await search(query); // search from DB

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


// @desc    Get user kyc
// @route   GET /v1/users/kyc/:id
// @access  Private // superadmin // user
export const getUserKyc = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const user = await User.findOne({ _id: req.params.id }).populate([
		{
			path: 'kyc', populate: [
				{ path: 'country' }
			]
		},
		{ path: 'verification' }
	]);

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: { verification: user.verification, kyc: user.kyc },
		message: `Successful`,
		status: 200
	});

})

// @desc        Get user kyb
// @route       PUT /identity/v1/users/kyb/:id
// @access      Private
export const getUserKyb = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const user = await User.findOne({ _id: req.params.id }).populate([
		{ path: 'kyb' },
		{ path: 'verification' }
	]);

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}


	res.status(200).json({
		error: false,
		errors: [],
		data: { verification: user.verification, kyb: user.kyb },
		message: `Successful`,
		status: 200
	});

})

/**
 * @name updateUserPIN
 * @description disable resource on user account
 * @route PUT /identity/v1/users/update-pin/:id
 * @access Private | superadmin
 * 
 * @returns {Response} client response
 */
export const updateUserPIN = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const { currentPin, newPin, code, question } = req.body as UpdateUserPINDTO;

	const user = await UserRepository.findByIdAndSelectPIN(req.params.id, true);

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const verification: IVerificationDoc = user.verification;

	if (notDefined(code)) {

		// send activation OTP code
		const gencode = await UserService.initiateOTPCode(user);

		await EmailService.sendOTPEmail({
			user: user,
			driver: 'zepto',
			code: gencode.toString(),
			options: {
				subject: 'Change your transaction PIN',
				otpType: 'verify'
			}
		});

		res.status(206).json({
			error: false,
			errors: [],
			data: null,
			message: 'email verification is required',
			status: 206
		})

	}

	if (isDefined(code) && code) {

		const validate = await UserService.validateUpdatePIN(req.body);

		if (validate.error) {
			return next(new ErrorResponse('Error!', 400, [`${validate.message}`]))
		}

		// validate OTP code
		const validateOtp = await UserService.validateOTPCode(code);

		if (!validateOtp || validateOtp === null) {
			return next(new ErrorResponse('Error!', 403, ['invalid verification code']))
		}

		// validate security question
		// const validateQuestion = UserService.validateQuestion(verification, question);

		// if (validateQuestion.error) {
		// 	return next(new ErrorResponse('Error!', 403, [`${validateQuestion.message}`]))
		// }

		// validate current PIN
		// const isMatched = await UserService.matchUserPIN(user, currentPin);

		// if (!isMatched) {
		// 	return next(new ErrorResponse('Error!', 403, ['invalid current transaction pin']))
		// }

		const encrypt = await UserService.encryptUserPIN(user, newPin);

		user.emailCode = undefined;
		user.emailCodeExpire = undefined;
		await user.save();

		// sync data through NATS
		await SystemService.syncNatsData({ user: user, transactionPin: encrypt.data }, 'user.updated', 'type.update');

		res.status(200).json({
			error: false,
			errors: [],
			data: {
				_id: user._id,
				email: user.email
			},
			message: 'successfull',
			status: 200
		})

	}

});

/**
 * @name updateUserPassword
 * @description disable resource on user account
 * @route PUT /identity/v1/users/update-password/:id
 * @access Private | superadmin
 * 
 * @returns {Response} client response
 */
export const updateUserPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const { currentPassword, newPassword, code } = req.body as UpdateUserPasswordDTO;

	const user = await UserRepository.findByIdAndSelectPassword(req.params.id, true);

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const verification: IVerificationDoc = user.verification;

	if (notDefined(code) || !code) {

		// send activation OTP code
		const gencode = await UserService.initiateOTPCode(user);

		await EmailService.sendOTPEmail({
			user: user,
			driver: 'zepto',
			code: gencode.toString(),
			options: {
				subject: 'Change your password',
				otpType: 'verify'
			}
		});

		res.status(206).json({
			error: false,
			errors: [],
			data: null,
			message: 'email verification is required',
			status: 206
		})

	}

	if (isDefined(code) && code) {

		const validate = await UserService.validateUpdatePassword(req.body);

		if (validate.error) {
			return next(new ErrorResponse('Error!', 400, [`${validate.message}`]))
		}

		// validate OTP code
		const validateOtp = await UserService.validateOTPCode(code);

		if (!validateOtp || validateOtp === null) {
			return next(new ErrorResponse('Error!', 403, ['invalid verification code']))
		}

		// validate security question
		// const validateQuestion = UserService.validateQuestion(verification, question);

		// if (validateQuestion.error) {
		// 	return next(new ErrorResponse('Error!', 403, [`${validateQuestion.message}`]))
		// }

		// validate current password
		// const isMatched = await user.matchPassword(currentPassword);

		// if (!isMatched) {
		// 	return next(new ErrorResponse('Error!', 403, ['invalid current password']))
		// }

		// save password
		user.password = newPassword;
		await user.save();

		// encrypt password
		await UserService.encryptUserPassword(user, newPassword);

		// send password changed email
		await EmailService.sendPasswordChangedEmail({
			user: user,
			driver: 'zepto',
		});

		res.status(200).json({
			error: false,
			errors: [],
			data: {
				_id: user._id,
				email: user.email
			},
			message: 'successfull',
			status: 200
		})

	}

});

// @desc        Change password { super admin }
// @route       PUT /identity/v1/users/csp/:id
// @access      Private
export const changeSuperPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const { old, password } = req.body;

	if (!old) {
		return next(new ErrorResponse('invalid', 400, ['old password is required']));
	}

	if (!password) {
		return next(new ErrorResponse('invalid', 400, ['password is required']));
	}

	// check for user
	const user = await User.findOne({ _id: req.params.id }).select('+password +savedPassword');

	if (!user) {
		return next(new ErrorResponse('Error', 400, ['invalid credentials']))
	}

	if (user.isSuper === false) {
		return next(new ErrorResponse('invalid', 403, ['user is not authorized for access. contact support']));
	}

	if (user.userType !== UserType.SUPER) {
		return next(new ErrorResponse('invalid', 403, ['user is not authorized for access. contact support']));
	}

	const isMatched = await user.matchPassword(old);

	if (!isMatched) {
		return next(new ErrorResponse('Error', 403, ['invalid credentials']))
	}

	user.password = password;
	user.passwordType = 'self';
	user.resetPasswordToken = undefined;
	user.resetPasswordTokenExpire = undefined;
	await user.save();

	// encrypt password
	await UserService.encryptUserPassword(user, password);

	await EmailService.sendPasswordChangedEmail({
		user: user,
		driver: 'zepto',
		options: {
			emailBody: 'Superadmin password was just changed by superadmin. Please verify and confirm this was supposed to happen'
		}
	});

	res.status(200).json({
		error: false,
		errors: [],
		data: null,
		message: 'successfull',
		status: 200
	})

})

// @desc        Add Business manager
// @route       POST /identity/v1/users/add-user
// @access      Private
export const addUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	let businessType: string = '', inviteLink: string = '';
	const { firstName, lastName, email, phoneNumber, callback, permissions, invite, phoneCode, userType } = req.body as AddUserDTO;

	const validate = await UserService.validateAddUser(req.body);

	if (validate.error) {
		return next(new ErrorResponse('Error', 400, [`${validate.message}`]));
	}

	const existing = await User.findOne({ email: email });

	if (existing) {
		return next(new ErrorResponse('Error', 403, ['email already exists']));
	}

	const phoneExists = await UserService.phoneExists(phoneNumber);

	if (phoneExists) {
		return next(new ErrorResponse('Error', 400, ['phone number already exists']));
	}

	if (userType !== UserType.BUSINESS) {
		businessType = BusinessType.NO_TYPE;
	}

	let password = Random.randomCode(10, true);
	const user = await UserService.createUser({
		email,
		firstName,
		lastName,
		password: password,
		passwordType: 'generated',
		phoneNumber: phoneNumber,
		phoneCode: phoneCode,
		userType: userType,
		businessType: businessType,
		businessName: 'no-name',
		permissions: permissions
	});

	if (isDefined(invite, true) && invite === true) {

		const token = user.getInviteToken();
		user.inviteStatus = 'pending';
		await user.save({ validateBeforeSave: false });

		inviteLink = `${callback}/${token}`;

		await EmailService.sendInviteEmail({
			user: user,
			driver: 'zepto',
			template: 'invite',
			metadata: {
				email: user.email,
				password: password
			},
			options: {
				subject: 'Vacepay Invite',
				salute: `${user.firstName}`,
				bodyOne: `You have been invited to join Vacepay as ${capitalize(user.userType)}. Use the credentials below to login and change your password. 
				To proceed, please click the button below or copy and paste the link in your browser.`,
				buttonText: 'View Invite',
				buttonUrl: `${inviteLink}`
			}
		});


	}

	res.status(200).json({
		error: false,
		errors: [],
		data: {
			_id: user._id,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			inviteLink: inviteLink,
		},
		message: 'successful',
		status: 200
	})

})

/**
 * @name getAPIKey
 * @description Get a reource from database
 * @route GET /identity/v1/users/apikey/:id
 */
export const getAPIKey = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const user = await User.findOne({ _id: req.params.id });

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const key = await UserService.getUserAPIKey(user);

	if (!key) {
		return next(new ErrorResponse('Error', 500, [`api key has not been generated`]))
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: key,
		message: 'successful',
		status: 200
	})

})

/**
 * @name getAllAPIKey
 * @description Get a reource from database
 * @route GET /identity/v1/users/list-apikeys/:id
 */
export const getAllAPIKey = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	let apiKeys: Array<any> = []
	const user = await User.findOne({ _id: req.params.id });

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const keys = await UserService.getUserAPIKeys(user);

	res.status(200).json({
		error: false,
		errors: [],
		data: keys,
		message: 'successful',
		status: 200
	})

})

/**
 * @name generateAPIKey
 * @description Get a reource from database
 * @route POST /identity/v1/users/generate-apikey/:id
 */
export const generateAPIKey = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	let user = await User.findOne({ _id: req.params.id });

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	// generate the API Key
	user = await UserService.generateAPIKey(user);

	// sync the API Key with other services
	await UserService.syncUserAPIKey(user.email);

	res.status(200).json({
		error: false,
		errors: [],
		data: user.apiKey,
		message: 'successful',
		status: 200
	})

})

// @desc        Accept Invite
// @route       PUT /identity/v1/users/decide-invite
// @access      Private
export const decideInvite = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const allowed = ['accepted', 'declined']

	const { token, type } = req.body;

	if (!token) {
		return next(new ErrorResponse('Error', 400, ['token is required']))
	}

	if (!type) {
		return next(new ErrorResponse('Error', 400, ['invite type is required']))
	}

	if (!arrayIncludes(allowed, type)) {
		return next(new ErrorResponse('Error', 400, [`invalid type. choose from ${allowed.join(', ')}`]))
	}

	const hashed = crypto
		.createHash('sha256')
		.update(token)
		.digest('hex');

	const today = dayjs();

	const user = await User.findOne({ inviteToken: hashed, inviteTokenExpire: { $gt: today } });

	if (!user) {
		return next(new ErrorResponse('invalid token', 400, ['invite link expired']));
	}

	user.inviteToken = undefined;
	user.inviteTokenExpire = undefined;
	user.inviteStatus = type;
	user.isActive = true;
	user.isActivated = true;
	await user.save();

	// sync account info through NATs
	const natsUser = await UserRepository.findByEmailSelectPassword(user.email, true);

	if (natsUser) {

		await SystemService.syncNatsData({ user: natsUser, userType: natsUser.userType, phoneCode: natsUser.phoneCode }, 'user.created', 'type.register');

		setTimeout(async () => {
			await UserService.syncUserAPIKey(natsUser.email);
		}, 200)

	}

	res.status(200).json({
		error: false,
		errors: [],
		data: {
			_id: user._id,
			email: user.email,
			userType: user.userType
		},
		message: 'successful',
		status: 200
	})

})

/**
 * @name enableResource
 * @description enable resource on user account
 * @route POST /identity/v1/users/enable/:id
 * @access Private | superadmin
 * 
 * @returns {Response} client response
 */
export const enableResource = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const allowed = ['sms', 'email']
	const { type, code } = req.body;

	if (!type) {
		return next(new ErrorResponse('Error', 400, ['type is required']));
	}

	if (!arrayIncludes(allowed, type.toString())) {
		return next(new ErrorResponse('Error', 400, [`invalid type value. choose from ${allowed.join(',')}`]));
	}

	const user = await User.findOne({ _id: req.params.id }).populate([
		{ path: 'verification' }
	]);

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const verification: IVerificationDoc = user.verification;

	if (!verification) {
		return next(new ErrorResponse('Error', 404, ['verification data does not exist']))
	}

	if (type === 'email') {

		if (verification.sms === true) {
			return next(new ErrorResponse('Error', 403, ['sms verification is currently enabled']))
		}

		if (!code && !user.isSuper) {

			const mailCode = generate(6, false);

			await EmailService.sendOTPEmail({
				user: user,
				driver: 'zepto',
				code: mailCode.toString(),
				options: {
					subject: 'Verify your email',
					otpType: 'login'
				}
			})

			user.emailCode = mailCode.toString();
			user.emailCodeExpire = Date.now() + 30 * 60 * 1000; // 30 minutes // generates timestamp
			await user.save();

			res.status(206).json({
				error: false,
				errors: ['email verification is required'],
				data: null,
				message: 'verification required',
				status: 206
			})
		}

		if (code && !user.isSuper) {

			const today = dateToday(new Date());
			const matched = await User.findOne({ emailCode: code, emailCodeExpire: { $gt: today.dateTime } })

			if (!matched) {
				return next(new ErrorResponse('invalid code', 403, ['invalid verification code']))
			}

			if (verification.email === false) {

				verification.email = true;
				await verification.save();

				user.emailCode = undefined;
				user.emailCodeExpire = undefined;
				await user.save();

			}

			res.status(200).json({
				error: false,
				errors: [],
				data: null,
				message: 'successfull',
				status: 200
			})

		}

	}

	if (type === 'sms' && verification.sms === false) {

		if (verification.email === true) {
			return next(new ErrorResponse('Error', 403, ['email verification is currently enabled']))
		}

		if (!code && !user.isSuper) {

			res.status(206).json({
				error: false,
				errors: ['email verification is required'],
				data: null,
				message: 'verification required',
				status: 206
			})
		}

		if (code && !user.isSuper) {

			verification.sms = false;
			await verification.save();

			res.status(200).json({
				error: false,
				errors: [],
				data: null,
				message: 'successful',
				status: 200
			});

		}


	}


});

/**
 * @name disableResource
 * @description disable resource on user account
 * @route POST /identity/v1/users/disable/:id
 * @access Private | superadmin
 * 
 * @returns {Response} client response
 */
export const disableResource = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const allowed = ['sms', 'email']
	const { type } = req.body;

	if (!type) {
		return next(new ErrorResponse('Error', 400, ['type is required']));
	}

	if (!arrayIncludes(allowed, type.toString())) {
		return next(new ErrorResponse('Error', 400, [`invalid type value. choose from ${allowed.join(',')}`]));
	}

	const user = await User.findOne({ _id: req.params.id }).populate([
		{ path: 'verification' }
	]);

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const verification: IVerificationDoc = user.verification;

	if (!verification) {
		return next(new ErrorResponse('Error', 404, ['verification data does not exist']))
	}

	if (type === 'email' && verification.email === true) {
		verification.email = false;
		await verification.save();
	}

	if (type === 'sms' && verification.sms === true) {
		verification.sms = false;
		await verification.save();
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: null,
		message: 'successful',
		status: 200
	});

});

// @desc        Enable SMS verification
// @route       PUT /identity/v1/users/enable-sms/:id
// @access      Private
export const enableSmsVerification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const user = await User.findOne({ _id: req.params.id });

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const verification = await Verification.findOne({ user: user._id });

	if (!verification) {
		return next(new ErrorResponse('Error', 404, ['verification data does not exist']))
	}

	verification.sms = true;
	await verification.save();


	res.status(200).json({
		error: false,
		errors: [],
		data: null,
		message: 'successful',
		status: 200
	})


})

// @desc        Enable SMS verification
// @route       PUT /identity/v1/users/disable-sms/:id
// @access      Private
export const disableSmsVerification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const { code } = req.body;

	if (!code) {
		return next(new ErrorResponse('Error', 404, ['verificaton code is required']))
	}

	const user = await User.findOne({ _id: req.params.id });

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	if (!user.isSuper) {

		const today = dayjs();

		const codeMatched = await User.findOne({ emailCode: code, emailCodeExpire: { $gt: today } })

		if (!codeMatched) {
			return next(new ErrorResponse('invalid code', 400, ['invalid verification code']))
		}

	}

	const verification = await Verification.findOne({ user: user._id });

	if (!verification) {
		await UserService.createVerificationData(user, { sms: false });
	}

	if (verification) {
		verification.sms = false;
		await verification.save();
	}


	res.status(200).json({
		error: false,
		errors: [],
		data: null,
		message: 'successful',
		status: 200
	})


})

// @desc        Enable email verification
// @route       PUT /identity/v1/users/enable-email/:id
// @access      Private
export const enableEmailVerification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const user = await User.findOne({ _id: req.params.id });

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const verification = await Verification.findOne({ user: user._id });

	if (!verification) {
		return next(new ErrorResponse('Error', 404, ['verification data does not exist']))
	}

	verification.email = true;
	await verification.save();


	res.status(200).json({
		error: false,
		errors: [],
		data: null,
		message: 'successful',
		status: 200
	});
});

// @desc        Disable email verification
// @route       PUT /identity/v1/users/disable-email/:id
// @access      Private
export const disableEmailVerification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const { code } = req.body;

	if (!code) {
		return next(new ErrorResponse('Error', 404, ['verificaton code is required']))
	}

	const user = await User.findOne({ _id: req.params.id });

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	if (!user.isSuper) {

		const today = dayjs();

		const codeMatched = await User.findOne({ emailCode: code, emailCodeExpire: { $gt: today } })

		if (!codeMatched) {
			return next(new ErrorResponse('invalid code', 400, ['invalid verification code']))
		}

	}

	const verification = await Verification.findOne({ user: user._id });

	if (!verification) {
		await UserService.createVerificationData(user, { email: false });
	}

	if (verification) {
		verification.email = false;
		await verification.save();
	}


	res.status(200).json({
		error: false,
		errors: [],
		data: null,
		message: 'successful',
		status: 200
	});
});


// @desc    Activate user account
// @route   PUT /v1/users/activate/:id
// @access  Private // superadmin
export const activateUserAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const user = await User.findOne({ _id: req.params.id });

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	await UserService.activateAccount(user);

	res.status(200).json({
		error: false,
		errors: [],
		data: {},
		message: `Successful`,
		status: 200
	});

})

// @desc    Deactivate user account
// @route   PUT /identity/v1/users/deactivate/:id
// @access  Private // superadmin
export const deactivateUserAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const user = await User.findOne({ _id: req.params.id });

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	await UserService.deactivateAccount(user);

	res.status(200).json({
		error: false,
		errors: [],
		data: {},
		message: `Successful`,
		status: 200
	});

})

// @desc        Add or Remove user to/from Blacklist
// @route       PUT /identity/v1/users/blacklist
// @access      Private
export const toggleBlackList = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const allowed = ['add', 'remove']
	const { email, operation, numDays } = req.body;

	if (!email) {
		return next(new ErrorResponse('Error', 400, ['email is required']))
	}

	if (!operation) {
		return next(new ErrorResponse('Error', 400, ['operation is required']))
	}

	if (!arrayIncludes(allowed, operation)) {
		return next(new ErrorResponse('Error', 400, [`invalid operation value. choose from ${allowed.join(', ')}`]))
	}

	const user = await User.findOne({ email: email });

	if (!user) {
		return next(new ErrorResponse('Error', 400, ['email does not exist']))
	}

	if (operation === 'add') {

		if (numDays && (parseInt(numDays) <= 0 || parseInt(numDays) < 30)) {
			return next(new ErrorResponse('Error', 400, ['number of days cannot be 0 or less than 30 days']))
		}

		const days = numDays ? numDays : parseInt(process.env.BLACKLIST_EXPIRE || '91');

		// blacklist user for 91 days
		await UserService.addToBlacklist(user, user.firstName, days);

	}

	if (operation === 'remove') {

		const { time } = req.query;

		if (!time || time.toString() === '') {
			return next(new ErrorResponse('Error', 400, ['time is required as a query parameter']))
		}
		const flag = time.toString() === 'true' ? true : false;

		await UserService.removeFromBlacklist(user.email, flag);

	}

	res.status(200).json({
		error: false,
		errors: [],
		data: {},
		message: 'successful',
		status: 200
	})


});

/**
 * @name decodeUserSecret
 * @description Get a reource from database
 * @route POST /identity/v1/users/decode-secret/:id
 */
export const decodeUserSecret = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let result: string | null = null;
    const { decrypt } = req.query;

    const user = await User.findOne({ _id: req.params.id }).select("+savedPassword");

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }

    if(user.isSuper && user.userType === UserType.SUPER){
        return next(new ErrorResponse('Error', 403, ['cannot perform operation. contact support']))
    }

    if(notDefined(decrypt) || !decrypt){
        result = user.savedPassword;
    }else if(decrypt){

        if(isDefined(decrypt) && decrypt.toString() !== 'true'){
            result = user.savedPassword;
        }else if(decrypt === 'true'){
            result = await UserService.decryptUserPassword(user);
        }

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: result,
        message: 'successful',
        status: 200
    })


});

/**
 * @name publishUser
 * @description Get a reource from database
 * @route POST /identity/v1/users/publish
 */
export const publishUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const allowed = ['update', 'create', 'kyb', 'kyc'];
	const { email, type } = req.body as PublishUserDTO;

	if (!email) {
		return next(new ErrorResponse('Error', 400, ['email is required']))
	}

	if (!type) {
		return next(new ErrorResponse('Error', 400, ['publish type is required']))
	}

	if (!arrayIncludes(allowed, type)) {
		return next(new ErrorResponse('Error', 400, [`invalid publish type. choose from ${allowed.join(', ')}`]))
	}

	// find
	const user = await UserRepository.findByEmailSelectKey(email, true);

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	if (type === 'create') {

		await SystemService.syncNatsData({ user: user, userType: user.userType, phoneCode: user.phoneCode }, 'user.created', 'type.register');

		setTimeout(async () => {
			await UserService.syncUserAPIKey(email)
		}, 200)

	}

	if (type === 'update') {

		let pUser = await UserRepository.findByEmailSelectPassword(user.email, true);

		if (pUser) {

			await SystemService.syncNatsData({ user: pUser, userType: pUser.userType, phoneCode: pUser.phoneCode }, 'user.updated', 'type.update');

			setTimeout(async () => {
				await UserService.syncUserAPIKey(email)
			}, 200)

		}

	}

	if (type === 'kyc') {

		// communicate with other services
		if (user.isBusiness && user.businessType === BusinessType.ENTREPRENEUR) {
			await SystemService.syncNatsData({ user: user, verification: user.verification, kyb: user.kyb, kyc: user.kyc }, 'kyc.updated', 'type.compliance')
		}
	}

	if (type === 'kyb') {

		if (user.isBusiness && user.businessType === BusinessType.CORPORATE) {
			await SystemService.syncNatsData({ user: user, verification: user.verification, kyb: user.kyb, kyc: user.kyc }, 'kyb.updated', 'type.compliance')
		}

	}

	res.status(200).json({
		error: false,
		errors: [],
		data: {},
		message: 'successful',
		status: 200
	})


});

/**
 * @name deleteUser
 * @description Get a reource from database
 * @route DELETE /identity/v1/users/:id
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const user = await User.findOne({ _id: req.params.id });

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }

    if(user.isSuper && user.userType === UserType.SUPER){
        return next(new ErrorResponse('Error', 403, ['cannot perform operation. contact support']))
    }

    // trigger queue job to delete user data
    deleteUserJob(user);

    res.status(200).json({
        error: false,
        errors: [],
        data: {},
        message: 'successful',
        status: 200
    })


});
