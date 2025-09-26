import crypto from 'crypto';
import mongoose, { ObjectId, Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { asyncHandler, strIncludesEs6, arrayIncludes, isString } from '@btffamily/vacepay'
import { generate } from '../utils/random.util';
import { uploadBase64File } from '../utils/google.util'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models

import SettlementRepository from '../repositories/settlement.repository';
import BusinessRepository from '../repositories/business.repository';
import TransactionRepository from '../repositories/transaction.repository';

/**
 * @name getSettlementMetrics
 * @description Get a reource from database
 * @route GET /terra/v1/metrics/settlement/:id
 */
export const getSettlementMetrics = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

    const settlement = await SettlementRepository.findById(req.params.id, false);

    if(!settlement){
        return next(new ErrorResponse('Error', 404, ['settlement does not exist']))
    }

    const metrics = await SettlementRepository.aggregateTransactionMetrics(settlement)
	
	res.status(200).json({
		error: false,
		errors: [],
		data: metrics,
		message: 'successful',
		status: 200
	})

})

/**
 * @name getSettlementBusinessMetrics
 * @description Get a reource from database
 * @route POST /vace/v1/metrics/settlment-business
 */
export const getSettlementBusinessMetrics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { code, businessId } = req.body;

    if(!code){
        return next(new ErrorResponse('Error', 400, ['settlement code is required']))
    }

    if(!businessId){
        return next(new ErrorResponse('Error', 400, ['business id is required']))
    }

    const settlement = await SettlementRepository.findByCode(code, false);

    if (!settlement) {
        return next(new ErrorResponse('Error', 404, ['settlement does not exist']))
    }

    const business = await BusinessRepository.findById(businessId, false);

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    const analytics = await TransactionRepository.aggregateSettlementAnalytics({
        settlement,
        business
    })
    

    res.status(200).json({
        error: false,
        errors: [],
        data: analytics,
        message: 'successful',
        status: 200
    })

})


