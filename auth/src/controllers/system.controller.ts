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
dayjs.extend(customparse)


/**
 * @name getSystemConfiguration
 * @description Get resource from the database
 * @route POST /identity/v1/system/get-configuration
 * @access Private | superadmin, admin
 */
export const getSystemConfiguration = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const user = await User.findOne({ _id: req.user._id })

    if(!user){
        return next(new ErrorResponse('Error', 404, ['authorized user does not exist']))
    }

    const config = await SystemService.getSystemConfig();

    if(!config){
        return next(new ErrorResponse('Error', 500, ['system configuration is not found. contact support']))
    }

    //LOG: Create audit for config changes

    res.status(200).json({
        error: false,
        errors: [],
        data: config,
        message: 'successful',
        status: 200
    })

})

/**
 * @name updateNotifications
 * @description Update resources in the database
 * @route POST /identity/v1/system/update-notifications
 * @access Private | superadmin, admin
 */
export const updateNotifications = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { sms, email, dashboard, push } = req.body as UpdateNotificationsDTO;

    const user = await User.findOne({ _id: req.user._id })

    if(!user){
        return next(new ErrorResponse('Error', 404, ['authorized user does not exist']))
    }

    const config = await SystemService.getSystemConfig();

    if(!config){
        return next(new ErrorResponse('Error', 500, ['system configuration is not found. contact support']))
    }

    if(config){

        if(!notDefined(sms, true)){
            config.notifications.sms = sms;
        } 
        
        if(!notDefined(email, true)){
            config.notifications.email = email;
        } 

        if(!notDefined(push, true)){
            config.notifications.push = push;
        } 

        if(!notDefined(dashboard, true)){
            config.notifications.dashboard = dashboard;
        } 

        config.update.updatedBy = user._id;
        config.update.changes = req.body;
        await config.save();

    }

    //LOG: Create audit for config changes

    res.status(200).json({
        error: false,
        errors: [],
        data: config?.notifications,
        message: 'successful',
        status: 200
    })

})

/**
 * @name sendTestSMS
 * @description Send a test SMS real time
 * @route POST /identity/v1/system/test-sms
 * @access Private | superadmin, admin
 */
export const sendTestSMS = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const allowed = ['africas-talking', 'termii']
    const { driver, message, phoneNumber } = req.body as TestSMSDTO;
    let result: IResult = { error: false, message: '', code: 200, data: null }

    const config = await SystemService.getSystemConfig();

    if(!driver){
        return next(new ErrorResponse('Error', 404, ['authorized user does not exist']))
    }

    if(!arrayIncludes(allowed, driver)){
        return next(new ErrorResponse('Error', 400, [`invalid driver value. choose from ${allowed.join(', ')}`]))
    }

    if(!message){
        return next(new ErrorResponse('Error', 404, ['message is required']))
    }

    if(!phoneNumber){
        return next(new ErrorResponse('Error', 404, ['phone number is required']))
    }

    if(!strIncludesEs6(phoneNumber, '+')){
        return next(new ErrorResponse('Error', 404, ['a valid phone number is required']))
    }

    if(phoneNumber.charAt(0) !== '+'){
        return next(new ErrorResponse('Error', 404, ['a valid phone number is required']))
    }

    if(config && !config.notifications.sms){
        return next(new ErrorResponse('Error', 403, ['sms is currently disabled in configurations']))
    }

    if(driver === 'africas-talking'){

        result = await SMSService.sendSMSwithAFT({
            enqueue: true,
            message,
            numbers: phoneNumber,
        })

    }


    //LOG: Create audit for config changes

    res.status(200).json({
        error: false,
        errors: [],
        data: result,
        message: 'successful',
        status: 200
    })

})
