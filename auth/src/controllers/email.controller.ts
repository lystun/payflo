import crypto from 'crypto';
import express, { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { Random, asyncHandler } from '@btffamily/vacepay';
import { sendGrid } from '../utils/email.util';

import User from '../models/User.model';
import { generate } from '../utils/random.util'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
import EmailService from '../services/email.service';
import UserService from '../services/user.service';
dayjs.extend(customparse)


// @desc    send welcome email to user
// @route   POST /api/identity/v1/emails/welcome/:id
// @access  Private
export const sendWelcomeEmail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { email, callbackUrl } = req.body;

    const user = await User.findById(req.params.id);

    if(!user){
        return next(new ErrorResponse('Error', 404, ['user does not exist']));
    }

    if(!email){
        return next(new ErrorResponse('Error', 400, ['email is required']));
    }

    if(!callbackUrl){
        return next(new ErrorResponse('Error', 400, ['callbackUrl is required']));
    }

    if(user.email !== email){
        return next(new ErrorResponse('Error', 400, ['email does not belong to user']));
    }

    try {

        // send welcome email
			await EmailService.sendWelcomeEmail({
				user: user,
                driver: 'zepto',
                options: {
					buttonText: 'login',
					buttonUrl: `${callbackUrl}`
				}
			});

        res.status(200).json({
            error: false,
            errors: [],
            data: null,
            message: 'successful',
            status: 200
        })
        
    } catch (err) {

        return next(new ErrorResponse('Error', 500, [`There was an error ${err}. Contact support`]))
        
    }

})


// @desc    send activation email
// @route   POST /api/identity/v1/emails/activate/:id
// @access  Private
export const sendActivationEmail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { email, callbackUrl } = req.body;

    const user = await User.findById(req.params.id);

    if(!user){
        return next(new ErrorResponse('Error', 404, ['user does not exist']));
    }

    if(!callbackUrl){
        return next(new ErrorResponse('Error', 400, ['callbackUrl is required']));
    }

    if(!email){
        return next(new ErrorResponse('Error', 400, ['email is required']));
    }
    
    if(user.email !== email){
        return next(new ErrorResponse('Error', 400, ['email does not belong to user']));
    }

    // generate activation token
    const activationToken = user.getActivationToken();
    await user.save({ validateBeforeSave: false });

    // generate activation url
    const activationUrl = `${callbackUrl}/${activationToken}`;

    await EmailService.sendActivationEmail({
        user: user,
        driver: 'zepto',
        options: {
            buttonText: 'Activate Account',
            buttonUrl: `${activationUrl}`
        }
    });

    user.isActivated = false;
    await user.save();

    res.status(200).json({
        error: false,
        errors: [],
        data: null,
        message: 'successful',
        status: 200
    });


})

// @desc    send forgot password email
// @route   POST /api/identity/v1/emails/forgot-password
// @access  Public
export const sendResetLink = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { email, callbackUrl } = req.body;

    if(!email && !callbackUrl){
        return next(new ErrorResponse('Error', 400, ['email is required', 'callbackUrl is required']));
    }

    if(!email){
        return next(new ErrorResponse('Error', 400, ['email is required']));
    }

    if(!callbackUrl){
        return next(new ErrorResponse('Error', 400, ['callbackUrl is required']));
    }

    const user = await User.findOne({email: email });

    if(!user){
        return next(new ErrorResponse('Error', 404, ['email does not exist']));
    }


    // generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // generate activation url
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
        message: 'successful',
        status: 200
    });


})

// @desc        Reset user password
// @route       POST /api/identity/v1/auth/reset-password
// @access      Public
export const resetPassword = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const token = req.params.token;
    const { password } = req.body;

	if(!password){
        return next(new ErrorResponse('Error', 400, ['new \'password\' is required']))
    }

	const hashed = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

	const user = await User.findOne({ resetPasswordToken: hashed });

	if(!user){
		return next(new ErrorResponse('error', 404, ['invalid token']));
	}

	const nd = dayjs(user.resetPasswordTokenExpire); // expire date
	const td = dayjs(); // today
	const diff = td.get('minutes') - nd.get('minutes');
	
	if(user && diff > 10 ){
		return next(new ErrorResponse('error', 404, ['invalid token']))
	}

	// match user password with regex
	const match =  /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[^\w\s]).{8,}$/;
	const matched: boolean = match.test(password);

	if(!matched){
		return next(new ErrorResponse('Error', 400, ['password must contain at least 8 characters, 1 lowercase letter, 1 uppercase letter, 1 special character and 1 number']))
	}

	user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpire = undefined;
    await user.save();

	res.status(200).json({
        error: false,
        errors: [],
        data: null,
        message: 'successful',
        status: 200
    })

	await EmailService.sendPasswordChangedEmail({
		user: user,
		driver: 'zepto',
	});

})

// @desc    send email verification code
// @route   POST /api/identity/v1/emails/send-otp-code
// @access  Public
export const sendOTPEmail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { email } = req.body;

    if(!email){
        return next( new ErrorResponse('Error', 400, ['email is required']))
    }

    const user = await User.findOne({email: email});

    if(!user){
        return next( new ErrorResponse('Error', 404, ['email does not exist']))
    }

    const mailCode = await UserService.initiateOTPCode(user);

    await EmailService.sendOTPEmail({
        user: user,
        driver: 'zepto',
        code: mailCode.toString(),
        options: {
            otpType: 'login'
        }
    });

    res.status(200).json({
        error: false,
        errors: [],
        data: null,
        message: 'successful',
        status: 200
    })


})

// @desc    send Invite Link
// @route   POST /api/identity/v1/emails/send-invite
// @access  Public
export const sendInvite = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { email, callback } = req.body;

    if(!callback){
		return next(new ErrorResponse('Error', 400, ['invite callback url is required']));
	}

    if(!email){
        return next( new ErrorResponse('Error', 400, ['email is required']))
    }

    const user = await User.findOne({email: email});

    if(!user){
        return next( new ErrorResponse('Error', 404, ['email does not exist']))
    }


    const token = user.getInviteToken();
	await user.save({ validateBeforeSave: false });
	const inviteLink = `${callback}/${token}`;

    await EmailService.sendInviteEmail({
        user: user,
        driver: 'zepto',
        options: {
            buttonText: 'Accept Invite',
            buttonUrl: `${inviteLink}`
        }
    });

    res.status(200).json({
        error: false,
        errors: [],
        data: null,
        message: 'successful',
        status: 200
    })
})