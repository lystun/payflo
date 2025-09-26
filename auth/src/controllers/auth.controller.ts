import crypto from 'crypto';
import { Request, Response, NextFunction, CookieOptions } from 'express';
import ErrorResponse from '../utils/error.util';
import { asyncHandler, strIncludesEs6, strToArrayEs6, isString, arrayIncludes, notDefined, isDefined } from '@btffamily/vacepay'
import { generate } from '../utils/random.util';
import { userLogger } from '../config/wiston.config';
import AuthService from '../services/auth.service';
import UserService from '../services/user.service';
import UserMapper from '../mappers/user.mapper'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import User from '../models/User.model'
import Role from '../models/Role.model'

// nats 
import Verification from '../models/Verification.model';
import SystemService from '../services/system.service';
import AuditService from '../services/audit.service';
import EmailService from '../services/email.service';
import { IUserDoc, IVerificationDoc } from '../utils/types.util';
import ENV from '../utils/env.util';
import { ForgotPasswordDTO, LoginDTO, RegisterDTO } from '../dtos/auth.dto';
import UserRepository from '../repositories/user.repository';
import { BusinessType, LoginType, UserType, VerificationType } from '../utils/enums.util';
import { createOrUpdateDeviceJob } from '../queues/jobs/device.job';
import { createAuditJob } from '../queues/jobs/audit.job';

declare global {
	namespace Express {
		interface Request {
			user?: any;
		}
	}
}


// @desc    Register User
// @route   POST /api/identity/v1/auth/register
// @access  Public
export const register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const { email, password, phoneNumber, phoneCode, userType, callbackUrl, businessType, businessName } = req.body as RegisterDTO;

	const validate = await UserService.validateRegister(req.body);

	if (validate.error) {
		return next(new ErrorResponse('Error', 400, [`${validate.message}`]));
	}

	// validate phone code
	if (!phoneCode) {
		return next(new ErrorResponse('Error', 400, ['phone code is required']));
	}

	const mailCheck = await UserService.checkEmail(email)

	if (!mailCheck) {
		return next(new ErrorResponse('Error', 400, ['a valid email is required']));
	}

	// validate existing email
	const exist = await User.findOne({ email: email.toLowerCase() });

	if (exist) {
		return next(new ErrorResponse('Error', 400, ['email already exist, use another email']));
	}

	const passCheck = await UserService.checkPassword(password);

	if (!passCheck) {
		return next(new ErrorResponse('Error', 400, ['password must contain at least 8 characters, 1 lowercase letter, 1 uppercase letter, 1 special character and 1 number']));
	}

	if (!strIncludesEs6(phoneCode, '+')) {
		return next(new ErrorResponse('Error', 400, ['phone code is must include \'+\' sign']));
	}

	const phoneExists = await UserService.phoneExists(phoneNumber);

	if (phoneExists) {
		return next(new ErrorResponse('Error', 400, ['phone number already exists']));
	}

	// create the user
	const user = await UserService.createUser({
		email,
		password,
		passwordType: 'self',
		phoneNumber: phoneNumber,
		phoneCode: phoneCode,
		userType: userType,
		businessType,
		businessName
	})

	const natsUser = await UserRepository.findByEmailSelectPassword(user.email, true);

	// send emails, publish nats and initialize notification
	if (natsUser) {

		try {

			// send activation OTP code
			const gencode = await UserService.initiateOTPCode(user);

			if (gencode) {

				await EmailService.sendOTPEmail({
					user: user,
					driver: 'zepto',
					code: gencode.toString(),
					options: {
						subject: 'Activate your Vacepay account',
						otpType: 'register',
					}
				});

			}

			// publish nats
			await SystemService.syncNatsData({ 
				user: natsUser, 
				userType: natsUser.userType, 
				phoneCode: natsUser.phoneCode, 
				callback: callbackUrl 
			}, 'user.created', 'type.register');

			//LOG: Audit Log
			await AuditService.createAudit({
				user: user._id,
				entityId: user._id,
				controller: 'auth',
				action: 'register',
				description: 'New user created',
				entity: 'User',
				type: 'success',
				changes: req.body
			})

			// send response to client
			res.status(200).json({
				error: false,
				errors: [],
				data: {
					email: user.email,
					phoneNumber: user.phoneNumber,
					phoneCode: phoneCode,
					_id: user._id,
					id: user.id
				},
				message: 'successful',
				status: 200
			});

		} catch (err) {
			return next(new ErrorResponse('Error', 500, [`${err}`]));
		}


	} else {
		return next(new ErrorResponse('Error', 500, ['an error occured. please contact support']));
	}

});


// @desc        Login user 
// @route       POST /api/identity/v1/auth/login
// @access      Public
export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	let isMatched: boolean = false;
	const { email, password, code, method, hash } = req.body as LoginDTO;

	const validate = await UserService.validateLogin(req.body);

	if (validate.error) {
		return next(new ErrorResponse('Error', 400, [`${validate.message}`]));
	}

	// check for user
	const user = await UserRepository.findByEmailSelectPassword(email.toLowerCase(), true);

	if (!user) {
		return next(new ErrorResponse('Error', 403, ['invalid credentials']))
	}

	if (!user.isActive) {
		return next(new ErrorResponse('Error!', 403, ['account currently deactivated. please contact support']))
	}

	if (user.isLocked) {
		return next(new ErrorResponse('Error!', 403, ['account currently locked for 30 minutes']))
	}

	if (!user.isActivated) {

		// send activation OTP code
		const gencode = await UserService.initiateOTPCode(user);

		if (gencode) {

			await EmailService.sendOTPEmail({
				user: user,
				driver: 'zepto',
				code: gencode.toString(),
				options: {
					subject: 'Activate your Vacepay account',
					otpType: 'register',
				}
			});

		}

		return next(new ErrorResponse('Error!', 403, ['account verification is required']))
	}

	const verification: IVerificationDoc = user.verification;

	if (!user.isSuper) {

		if (method === LoginType.EMAIL) {

			isMatched = await user.matchPassword(password);

			if (!isMatched) {

				// increase login limit
				if (user.loginLimit < 3) {

					user.loginLimit = user.increaseLoginLimit()
					await user.save();

					return next(new ErrorResponse('Invalid credentials', 403, ['invalid credentials']))

				} else if (user.loginLimit >= 3 && !user.checkLockedStatus()) {

					user.isLocked = true;
					await user.save();
					return next(new ErrorResponse('Forbidden', 403, ['account currently locked for 30 minutes. Contact support']))

				} else if (user.loginLimit >= 3 && user.checkLockedStatus()) {

					return next(new ErrorResponse('Forbidden!', 403, ['account currently locked for 30 minutes. Contact support']));

				} else {

					return next(new ErrorResponse('Invalid credentials', 403, ['invalid credentials']))

				}

			}

			if ((!code || code) && !verification.email && !verification.sms) {

				user.emailCode = undefined;
				user.emailCodeExpire = undefined;
				user.loginLimit = 0;
				user.isLocked = false;
				await user.save();

				// save request user object
				req.user = user;

				// update or create device
				createOrUpdateDeviceJob(user, req.headers['user-agent']!);

				const message = 'successful';
				sendTokenResponse(user, message, 200, res);

			}

			// generate email verification code
			else if (!code && verification.email) {

				// generate otp code
				const gencode = await UserService.initiateOTPCode(user);

				await EmailService.sendOTPEmail({
					user: user,
					driver: 'zepto',
					code: gencode.toString(),
					options: {
						otpType: 'login'
					}
				});

				res.status(206).json({
					error: false,
					errors: ['email verification is required'],
					data: null,
					message: 'successful',
					status: 206
				})

			}

			// TODO: implement SMS verification
			else if (!code && verification.sms) {

				user.emailCode = undefined;
				user.emailCodeExpire = undefined;
				user.loginLimit = 0;
				user.isLocked = false;
				await user.save();

				// save request user object
				req.user = user;

				const message = 'successful';
				sendTokenResponse(user, message, 200, res);

			}

			else if (code) {

				// check for email and sms verification
				if (verification.email) {

					const validUser = await UserService.validateOTPCode(code)

					if (!validUser) {
						return next(new ErrorResponse('Error!', 403, ['invalid verification code']))
					}

				} else if (verification.sms) {

				}

				user.emailCode = undefined;
				user.emailCodeExpire = undefined;
				user.loginLimit = 0;
				user.isLocked = false;
				await user.save();

				// save request user object
				req.user = user;

				// update or create device
				createOrUpdateDeviceJob(user, req.headers['user-agent']!);

				const message = 'successful';
				sendTokenResponse(user, message, 200, res);

			}

		}

		if (method === LoginType.BIOMETRIC && hash) {

			isMatched = await UserService.matchEncryptedPassword({ user, hash });

			if (!isMatched) {

				// increase login limit
				if (user.loginLimit < 3) {

					user.loginLimit = user.increaseLoginLimit()
					await user.save();

					return next(new ErrorResponse('Invalid credentials', 403, ['invalid credentials']))

				} else if (user.loginLimit >= 3 && !user.checkLockedStatus()) {

					user.isLocked = true;
					await user.save();

					return next(new ErrorResponse('Forbidden', 403, ['account currently locked for 30 minutes. Contact support']))

				} else if (user.loginLimit >= 3 && user.checkLockedStatus()) {

					return next(new ErrorResponse('Forbidden!', 403, ['account currently locked for 30 minutes. Contact support']));

				} else {

					return next(new ErrorResponse('Invalid credentials', 403, ['invalid credentials']))

				}


			}

			if ((!code || code) && !verification.email && !verification.sms) {

				user.emailCode = undefined;
				user.emailCodeExpire = undefined;
				user.loginLimit = 0;
				user.isLocked = false;
				await user.save();

				// save request user object
				req.user = user;

				// update or create device
				createOrUpdateDeviceJob(user, req.headers['user-agent']!);

				const message = 'successful';
				sendTokenResponse(user, message, 200, res);

			}

			// generate email verification code
			else if (!code && verification.email) {

				// generate otp code
				const gencode = await UserService.initiateOTPCode(user);

				await EmailService.sendOTPEmail({
					user: user,
					driver: 'zepto',
					code: gencode.toString(),
					options: {
						otpType: 'login'
					}
				});

				res.status(206).json({
					error: false,
					errors: ['email verification is required'],
					data: null,
					message: 'successful',
					status: 206
				})

			}

			// TODO: implement SMS verification
			else if (!code && verification.sms) {

				user.emailCode = undefined;
				user.emailCodeExpire = undefined;
				user.loginLimit = 0;
				user.isLocked = false;
				await user.save();

				// save request user object
				req.user = user;

				const message = 'successful';
				sendTokenResponse(user, message, 200, res);

			}

			else if (code) {

				// check for email and sms verification
				if (verification.email) {

					const validUser = await UserService.validateOTPCode(code)

					if (!validUser) {
						return next(new ErrorResponse('Error!', 403, ['invalid verification code']))
					}

				} else if (verification.sms) {

				}

				user.emailCode = undefined;
				user.emailCodeExpire = undefined;
				user.loginLimit = 0;
				user.isLocked = false;
				await user.save();

				// save request user object
				req.user = user;

				// update or create device
				createOrUpdateDeviceJob(user, req.headers['user-agent']!);

				const message = 'successful';
				sendTokenResponse(user, message, 200, res);

			}

		}

	}

	if (user.isSuper) {

		isMatched = await user.matchPassword(password);

		if (!isMatched) {

			// increase login limit
			if (user.loginLimit < 3) {

				user.loginLimit = user.increaseLoginLimit()
				await user.save();

				return next(new ErrorResponse('Invalid credentials', 403, ['invalid credentials']))

			} else if (user.loginLimit >= 3 && !user.checkLockedStatus()) {

				user.isLocked = true;
				await user.save();
				return next(new ErrorResponse('Forbidden', 403, ['account currently locked for 30 minutes. Contact support']))

			} else if (user.loginLimit >= 3 && user.checkLockedStatus()) {

				return next(new ErrorResponse('Forbidden!', 403, ['account currently locked for 30 minutes. Contact support']));

			} else {

				return next(new ErrorResponse('Invalid credentials', 403, ['invalid credentials']))

			}

		}

		user.loginLimit = 0;
		user.emailCode = undefined;
		user.emailCodeExpire = undefined;
		user.isLocked = false;
		await user.save();

		// save request user object
		req.user = user;

		// create or update device
		createOrUpdateDeviceJob(user, req.headers['user-agent']!);

		const message = 'successful';
		sendTokenResponse(user, message, 200, res);

	}

})

// @desc        Login user with socials 
// @route       POST /api/identity/v1/auth/login/social
// @access      Public
export const loginWithSocial = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const allowed = ['google', 'facebook', 'discord']
	const { code, brand, callback } = req.body;

	if (!callback) {
		return next(new ErrorResponse('Error', 400, ['callback url is required']));
	}

	if (!code) {
		return next(new ErrorResponse('invalid', 400, ['auth code is required']));
	}

	if (!brand) {
		return next(new ErrorResponse('invalid', 400, ['brand is required']));
	}

	if (!arrayIncludes(allowed, brand.toString())) {
		return next(new ErrorResponse('Error', 400, [`invalid brand value. choose from ${allowed.join(', ')}`]));
	}

	// create the auth class instance
	const auth = new AuthService(brand, callback);

	if (brand === 'google') {

		const authCreds = await auth.getGoogleCredentials(code);

		if (authCreds.result.error) {
			return next(new ErrorResponse('Error', 500, [`${authCreds.result.message}`, authCreds.result.data]))
		}

		const { creds } = authCreds; // extract credentials
		const gd = await auth.getGoogleUserData(creds.accessToken);

		if (gd.error) {
			return next(new ErrorResponse('Error', 500, [`${gd.message}`, gd.data]))
		}

		// check for user
		const user = await User.findOne({ email: gd.data.email }).select('+password +passwordType');

		if (!user) {
			return next(new ErrorResponse('Error', 403, ['invalid credentials']))
		}

		if (user.isAdmin || user.isSuper) {
			return next(new ErrorResponse('Error', 403, ['invalid credentials']))
		}

		const bcd = user.oauth.find((x: any) => x.brand === brand);
		const bcdx = user.oauth.findIndex((x: any) => x.brand === brand);

		if (bcd && bcdx >= 0) {

			bcd.brand = brand;
			bcd.creds = {
				accessToken: creds.accessToken,
				refreshToken: creds.refreshToken,
				scope: creds.scope,
				idToken: creds.idToken,
				expiryDate: creds.expiryDate,
				tokenType: creds.tokenType,
				data: gd.data
			}

		} else {

			user.oauth.push({
				brand: brand,
				creds: {
					accessToken: creds.accessToken,
					refreshToken: creds.refreshToken,
					scope: creds.scope,
					idToken: creds.idToken,
					expiryDate: creds.expiryDate,
					tokenType: creds.tokenType,
					data: gd.data
				}
			})

		}

		user.loginLimit = 0;
		user.isLocked = false;
		await user.save();

		// save request user object
		req.user = user;

		// log user activity
		userLogger.info(`User logged in [admin]`, {
			_id: user._id,
			email: user.email
		});

		const message = 'successful';
		sendTokenResponse(user, message, 200, res);

	}

	if (brand === 'discord') {

		const authCreds = await auth.getDiscordCredentials(code);

		if (authCreds.result.error) {
			return next(new ErrorResponse('Error', 500, [`${authCreds.result.message}`, authCreds.result.data]))
		}

		const { creds } = authCreds; // extract credentials
		const gd = await auth.getDiscordUserData(creds.accessToken, creds.tokenType);

		if (gd.error) {
			return next(new ErrorResponse('Error', 500, [`${gd.message}`, gd.data]))
		}

		// check for user
		const user = await User.findOne({ email: gd.data.email }).select('+password +passwordType');

		if (!user) {
			return next(new ErrorResponse('Error', 403, ['invalid credentials']))
		}

		if (user.isAdmin || user.isSuper) {
			return next(new ErrorResponse('Error', 403, ['invalid credentials']))
		}

		const bcd = user.oauth.find((x: any) => x.brand === brand);
		const bcdx = user.oauth.findIndex((x: any) => x.brand === brand);

		if (bcd && bcdx >= 0) {

			bcd.brand = brand;
			bcd.creds = {
				accessToken: creds.accessToken,
				refreshToken: creds.refreshToken,
				scope: creds.scope,
				idToken: '',
				expiryDate: creds.expiryDate,
				tokenType: creds.tokenType,
				data: gd.data
			}

		} else {

			user.oauth.push({
				brand: brand,
				creds: {
					accessToken: creds.accessToken,
					refreshToken: creds.refreshToken,
					scope: creds.scope,
					idToken: '',
					expiryDate: creds.expiryDate,
					tokenType: creds.tokenType,
					data: gd.data
				}
			})

		}

		user.loginLimit = 0;
		user.isLocked = false;
		await user.save();

		// save request user object
		req.user = user;

		// log user activity
		userLogger.info(`User logged in [admin]`, {
			_id: user._id,
			email: user.email
		});

		const message = 'successful';
		sendTokenResponse(user, message, 200, res);

	}

	if (brand === 'facebook') {

		const authCreds = await auth.getFacebookCredentials(code);

		if (authCreds.result.error) {
			return next(new ErrorResponse('Error', 500, [`${authCreds.result.message}`, authCreds.result.data]))
		}

		const { creds } = authCreds; // extract credentials
		const gd = await auth.getFacebookUserData(creds.accessToken);

		if (gd.error) {
			return next(new ErrorResponse('Error', 500, [`${gd.message}`, gd.data]))
		}

		// check for user
		const user = await User.findOne({ email: gd.data.email }).select('+password +passwordType');

		if (!user) {
			return next(new ErrorResponse('Error', 403, ['invalid credentials']))
		}

		if (user.isAdmin || user.isSuper) {
			return next(new ErrorResponse('Error', 403, ['invalid credentials']))
		}

		const bcd = user.oauth.find((x:any) => x.brand === brand);
		const bcdx = user.oauth.findIndex((x: any) => x.brand === brand);

		if (bcd && bcdx >= 0) {

			bcd.brand = brand;
			bcd.creds = {
				accessToken: creds.accessToken,
				refreshToken: creds.refreshToken,
				scope: creds.scope,
				idToken: '',
				expiryDate: creds.expiryDate,
				tokenType: creds.tokenType,
				data: gd.data
			}

		} else {

			user.oauth.push({
				brand: brand,
				creds: {
					accessToken: creds.accessToken,
					refreshToken: creds.refreshToken,
					scope: creds.scope,
					idToken: '',
					expiryDate: creds.expiryDate,
					tokenType: creds.tokenType,
					data: gd.data
				}
			})

		}

		user.loginLimit = 0;
		user.isLocked = false;
		await user.save();

		// save request user object
		req.user = user;

		// log user activity
		userLogger.info(`User logged in [admin]`, {
			_id: user._id,
			email: user.email
		});

		const message = 'successful';
		sendTokenResponse(user, message, 200, res);

	}


})

// @desc        Force change password 
// @route       POST /api/identity/v1/auth/force-password
// @access      Public
export const forcePassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const { email, password } = req.body;

	/// check
	if (!password && !email) {
		return next(new ErrorResponse('Error!', 404, ['password is required', 'email is required']));
	}

	if (!password) {
		return next(new ErrorResponse('Error!', 404, ['password is required']));
	}

	if (!email) {
		return next(new ErrorResponse('Error!', 404, ['email is required']));
	}

	const user = await User.findOne({ email: email });

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['user does not exist']));
	}

	if (user.passwordType !== 'generated') {
		return next(new ErrorResponse('Error', 403, ['password is self generated or self-changed']));
	}

	// match user password with regex
	const match = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[^\w\s]).{8,}$/;
	const matched: boolean = match.test(password);

	if (!matched) {
		return next(new ErrorResponse('Error', 400, ['password must contain at least 8 characters, 1 lowercase letter, 1 uppercase letter, 1 special character and 1 number']))
	}

	user.password = password;
	user.passwordType = 'self-changed';
	await user.save();

	// encrypt
	await UserService.encryptUserPassword(user, password);

	await EmailService.sendPasswordChangedEmail({
		user: user,
		driver: 'zepto',
	});

	const natsUser = await UserRepository.findByEmailSelectPassword(user.email, true);

	if (natsUser) {

		await SystemService.syncNatsData({ user: natsUser, userType: natsUser.userType, phoneCode: natsUser.phoneCode }, 'user.updated', 'type.update');

		setTimeout(async () => {
			await UserService.syncUserAPIKey(natsUser.email);
		}, 200)

	}

	res.status(200).json({
		error: false,
		errors: [],
		data: {
			email: user.email,
			userType: user.userType
		},
		message: 'successful',
		status: 200
	})

})

// @desc	Logout user
// @route   POST /api/identity/v1/auth/logout
// @access  Public
export const logout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	res.cookie('token', 'none', {
		expires: new Date(Date.now() + 10 + 1000),
		httpOnly: true
	});

	res.cookie('userType', 'none', {
		expires: new Date(Date.now() + 10 + 1000),
		httpOnly: true
	});

	res.status(200).json({
		error: false,
		errors: [],
		data: null,
		message: 'Logout successful',
		status: 200,
	});

})

// @desc        Get logged in user
// @route       POST /api/identity/v1/auth/user/:id
// @access      Private
export const getUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const options: CookieOptions = {
		expires: new Date(
			Date.now() + 70 * 24 * 60 * 60 * 1000
		),
		httpOnly: false,
		secure: false,
		sameSite: 'none'
	};

	const user = await UserRepository.findById(req.params.id, true);

	if (!user) {
		return next(new ErrorResponse('Cannot find user', 404, [`Cannot find user`]));
	}

	if (user.isLocked) {
		return next(new ErrorResponse('Error', 401, ['user account is currently locked.']))
	}

	if (!user.isActive) {
		return next(new ErrorResponse('Error', 401, ['user is not active.']))
	}

	// make cookie work for https
	if (ENV.isProduction()) {
		options.secure = true;
	}

	res.status(200).cookie('userType', user.userType, options).json({
		error: false,
		errors: [],
		data: user,
		message: 'success',
		status: 200,
	});

})

// @desc        change user password (with verification)
// @route       POST /api/identity/v1/auth/change-password/:id
// @access      Private
export const updatePassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const { oldPassword, newPassword, code } = req.body;

	// check for user
	const user = await User.findOne({ _id: req.params.id }).populate([{ path: "verification" }]).select('+password');

	if (!user) {
		return next(new ErrorResponse('Error', 400, ['invalid credentials']))
	}

	if (user.isSuper && user.userType === UserType.SUPER) {
		return next(new ErrorResponse('Error', 403, ['cannot change credentials. contact support']))
	}

	const verification: IVerificationDoc = user.verification;

	if (user.isBusiness && user.businessType === BusinessType.ENTREPRENEUR && verification.kyc !== VerificationType.APPROVED) {
		return next(new ErrorResponse('Error', 500, ['KYC verification is pending']))
	}

	if (user.isBusiness && user.businessType === BusinessType.CORPORATE && verification.kyb !== VerificationType.APPROVED) {
		return next(new ErrorResponse('Error', 500, ['KYB verification is pending']))
	}

	if (!code && !user.isSuper) {

		const mailCode = UserService.initiateOTPCode(user);
		await EmailService.sendOTPEmail({
			user: user,
			driver: 'zepto',
			code: mailCode.toString(),
			options: {
				otpType: 'login'
			}
		});

		res.status(206).json({
			error: true,
			errors: ['email verification is required'],
			data: null,
			message: 'verification required',
			status: 206
		})
	}

	if (code && !user.isSuper) {

		// validate email and password
		if (!oldPassword) {
			return next(new ErrorResponse('Error', 400, ['old password is required']));
		}

		if (!newPassword) {
			return next(new ErrorResponse('Error', 400, ['new password is required']));
		}

		const isMatched = await user.matchPassword(oldPassword);

		if (!isMatched) {
			return next(new ErrorResponse('Error', 400, ['invalid credentials']))
		}

		const newuser = await UserService.validateOTPCode(code);

		if (notDefined(newuser) || !newuser) {
			return next(new ErrorResponse('Error!', 403, ['invalid verification code']))
		}

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
			data: null,
			message: 'successfull',
			status: 200
		})

	}

});

// @desc        Send reset password link
// @route       POST /api/identity/v1/auth/forgot-password
// @access      Public
export const sendResetLink = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const allowed = ['otp', 'token']

	const { email, type, callbackUrl } = req.body as ForgotPasswordDTO;

	const superEmail = process.env.SUPERADMIN_EMAIL;

	if (!email) {
		return next(new ErrorResponse('Error!', 400, ['email is required']))
	}

	if (!type) {
		return next(new ErrorResponse('Error!', 400, ['reset type is required']))
	}

	if (!arrayIncludes(allowed, type)) {
		return next(new ErrorResponse('Error!', 400, [`invalid type value. choose from ${allowed.join(', ')}`]))
	}

	if (email.toLocaleLowerCase() === superEmail) {
		return next(new ErrorResponse('Error!', 403, ['cannot reset password. contact support']))
	}

	const user = await User.findOne({ email: email.toLowerCase() })

	if (!user) {
		return next(new ErrorResponse('Error', 404, ['email does not exist']));
	}

	if (type === 'token') {

		if (!callbackUrl) {
			return next(new ErrorResponse('Error!', 400, ['callback url is required']))
		}

		// Get reset token
		const resetToken = user.getResetPasswordToken();
		await user.save({ validateBeforeSave: false });

		try {

			const resetUrl = `${callbackUrl}/${resetToken}`;

			await EmailService.sendResetLinkEmail({
				user: user,
				driver: 'zepto',
				options: {
					buttonText: 'Change Password',
					buttonUrl: `${resetUrl}`
				}
			});

			res.status(200).json({
				error: false,
				errors: [],
				data: null,
				message: `Sent reset link to ${user.email}`,
				status: 200,
			});

		} catch (err) {

			user.resetPasswordToken = undefined;
			user.resetPasswordTokenExpire = undefined;
			await user.save({ validateBeforeSave: false });

			return next(new ErrorResponse('error!', 500, ['could not send email. Please try again']));

		}

	}

	if (type === 'otp') {

		// send activation OTP code
		const gencode = await UserService.initiateOTPCode(user);

		await EmailService.sendOTPEmail({
			user: user,
			driver: 'zepto',
			code: gencode.toString(),
			options: {
				subject: 'Reset your password',
				otpType: 'password-reset'
			}
		});

		res.status(200).json({
			error: false,
			errors: [],
			data: null,
			message: `Sent otp code to ${user.email}`,
			status: 200,
		});

	}

})

// @desc        Reset user password
// @route       POST /api/identity/v1/auth/reset-password
// @access      Public
export const resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const { password, token, code } = req.body;

	if (!token && !code) {
		return next(new ErrorResponse('Error', 400, ['token or code is required']))
	}

	if (token && code) {
		return next(new ErrorResponse('Error', 400, ['token and code cannot be present at the same time']))
	}

	if (!password) {
		return next(new ErrorResponse('Error', 400, ['new \'password\' is required']))
	}

	if (isDefined(token) && notDefined(code)) {

		const hashed = crypto
			.createHash('sha256')
			.update(token)
			.digest('hex');

		// const user = await User.findOne({ resetPasswordToken: hashed, resetPasswordTokenExpire: { $gt: new Date() }});
		const user = await User.findOne({ resetPasswordToken: hashed });

		if (!user) {
			return next(new ErrorResponse('error', 403, ['invalid token']));
		}

		const nd = dayjs(user.resetPasswordTokenExpire); // expire date
		const td = dayjs(); // today
		const diff = td.get('minutes') - nd.get('minutes');

		if (user && diff > 10) {
			return next(new ErrorResponse('error', 404, ['invalid token']))
		}

		const passCheck = await UserService.checkPassword(password);

		if (!passCheck) {
			return next(new ErrorResponse('Error', 400, ['password must contain at least 8 characters, 1 lowercase letter, 1 uppercase letter, 1 special character and 1 number']))
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
		});

		res.status(200).json({
			error: false,
			errors: [],
			data: null,
			message: 'successful',
			status: 200
		})

	}

	if (isDefined(code) && notDefined(token)) {

		const user = await UserService.validateOTPCode(code);

		if (notDefined(user) || !user) {
			return next(new ErrorResponse('Error!', 403, ['invalid verification code']))
		}

		const passCheck = await UserService.checkPassword(password);

		if (!passCheck) {
			return next(new ErrorResponse('Error', 400, ['password must contain at least 8 characters, 1 lowercase letter, 1 uppercase letter, 1 special character and 1 number']))
		}

		user.password = password;
		user.passwordType = 'self';
		user.resetPasswordToken = undefined;
		user.resetPasswordTokenExpire = undefined;
		user.emailCode = undefined;
		user.emailCodeExpire = undefined;
		await user.save();

		// encrypt password
		await UserService.encryptUserPassword(user, password);

		await EmailService.sendPasswordChangedEmail({
			user: user,
			driver: 'zepto',
		});

		res.status(200).json({
			error: false,
			errors: [],
			data: null,
			message: 'successful',
			status: 200
		})

	}

})

// @desc        Activate account
// @route       POST /api/identity/v1/auth/activate-account/
// @access      Public
export const activateAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	const { code, token } = req.body;

	if (!token && !code) {
		return next(new ErrorResponse('Error', 400, ['token or code is required']))
	}

	if (token && code) {
		return next(new ErrorResponse('Error', 400, ['token and code cannot be present at the same time']))
	}

	if (isDefined(token) && notDefined(code)) {

		const hashed = crypto
			.createHash('sha256')
			.update(token)
			.digest('hex');

		const today = dayjs();
		const user = await User.findOne({ activationToken: hashed, activationTokenExpire: { $gt: today } });

		if (!user) {
			return next(new ErrorResponse('error!', 403, ['invalid activation token']))
		}

		user.isActivated = true;
		user.activationToken = undefined;
		user.activationTokenExpire = undefined;
		await user.save();

	}

	if (isDefined(code) && notDefined(token)) {

		const user = await UserService.validateOTPCode(code);

		if (notDefined(user) || !user) {
			return next(new ErrorResponse('Error!', 403, ['invalid verification code']))
		}

		user.emailCode = undefined;
		user.emailCodeExpire = undefined;
		user.isActivated = true;
		await user.save();

		// send welcome email
		await EmailService.sendWelcomeEmail({
			user: user,
			driver: 'zepto',
			options: {
				buttonText: 'Login',
				buttonUrl: ``
			}
		});

	}

	res.status(200).json({
		error: false,
		errors: [],
		data: {},
		message: 'successful',
		status: 200
	})

})

// @desc        Attach role to a user
// @route       POST /api/identity/v1/auth/attach-role/:id
// @access      Private
export const attachRole = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	// find the roles
	let roleNames: Array<string> = [], roleIds: Array<string | any> = [];

	const { roles } = req.body;

	if (!isString(roles)) {
		return next(new ErrorResponse('error', 400, ['expected roles to be a string separated by commas or spaces']));
	}

	const user = await User.findById(req.params.id);

	if (!user) {
		return next(new ErrorResponse('error!', 404, ['user does not exist']));
	}

	// eslint-disable-next-line prettier/prettier
	if (strIncludesEs6(roles, ',')) {
		roleNames = strToArrayEs6(roles, ',');
	} else if (strIncludesEs6(roles, ' ')) {
		roleNames = strToArrayEs6(roles, ' ');
	} else {
		roleNames.push(roles);
	}

	// get the role objects and extract the IDs
	// may need to refactor this using es6
	for (let j = 0; j < roleNames.length; j++) {

		let role = await Role.findOne({ name: roleNames[j] });

		if (!role) {
			return next(new ErrorResponse('Error', 404, ['role does not exist']));
		}

		roleIds.push(role._id);
	}

	// check if user already has one of the role(s) specified.
	for (let m = 0; m < roleNames.length; m++) {

		const has = await user.hasRole(roleNames[m], user.roles);

		if (!has) {
			continue;
		} else {
			return next(new ErrorResponse('Error!', 404, ['user is already attached to one of the role(s) specified']));
		}

	}

	// set the data --- add the new role(s) specified;
	for (let n: number = 0; n < roleIds.length; n++) {
		user.roles.push(roleIds[n]);
	}
	await user.save();

	res.status(200).json({
		error: false,
		errors: [],
		data: null,
		message: `successful`,
		status: 200,
	});

})

// @desc        Detach role from a user
// @route       POST /api/identity/v1/auth/detach-role/:id
// @access      Private
export const detachRole = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

	let uRoles: Array<any> = [];
	let flag: boolean = true;

	const { roleName } = req.body;

	if (!roleName || !isString(roleName)) {
		return next(new ErrorResponse('error!', 404, ['role is required and expected to be a string']))
	}

	// find the role
	const role = await Role.findOne({ name: roleName });

	if (!role) {
		return next(new ErrorResponse('error', 404, ['role does not exist']));
	}

	const user = await User.findById(req.params.id);

	if (!user) {
		return next(new ErrorResponse('error!', 404, ['user does not exist']));
	}

	// check if user already has one of the role(s) specified.
	for (let m = 0; m < user.roles.length; m++) {

		if (user.roles[m].toString() === role._id.toString()) {

			flag = true;
			uRoles = user.roles.filter((r: any) => r.toString() !== role._id.toString());
			break;

		} else {

			flag = false;
			continue;

		}
	}

	if (!flag) {
		return next(new ErrorResponse('Error', 404, ['user does not have the role specified']))
	}

	// set the data
	user.roles = uRoles;
	await user.save();

	res.status(200).json({
		error: false,
		errors: [],
		data: null,
		message: 'successful',
		status: 200
	})

})

// Helper function: get token from model, create cookie and send response
const sendTokenResponse = async (user: IUserDoc, message: string, statusCode: number, res: Response): Promise<void> => {

	let token: string = '';

	// create token
	const userToken = await User.findOne({ _id: user._id });

	if (userToken) {
		token = userToken.getSignedJwtToken()
	}

	/*
		An HttpOnly Cookie is a tag added to a browser cookie that prevents client-side scripts
		from accessing data. It provides a gate that prevents the specialized cookie from being 
		accessed by anything other than the server. {true} value means only the server can access it.
	*/
	const options: CookieOptions = {
		expires: new Date(
			Date.now() + 70 * 24 * 60 * 60 * 1000
		),
		httpOnly: false,
		secure: false,
		sameSite: 'none'
	};

	// make cookie work for https
	if (ENV.isProduction()) {
		options.secure = true;
	}

	// update login 
	await UserService.updateLastLogin(user);

	const _user = await UserRepository.findByEmailSelectPassword(user.email, true)
	const mapped = await UserMapper.mapLoggedInUser(_user!);

	if (_user) {
		// TODO: send login info job
	}

	//LOG: Audit Log
	createAuditJob({
		user: user._id,
		action: 'login',
		type: 'success',
		description: 'User logged in successfully',
		entity: 'User',
		changes: { _id: user._id, email: user.email }
	});

	res.status(statusCode).cookie('token', token, options).cookie('userType', _user!.userType, options).json({
		error: false,
		errors: [],
		message: message,
		data: mapped,
		token: token,
		status: 200
	});
};
