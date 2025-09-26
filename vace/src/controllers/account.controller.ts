import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { asyncHandler } from '@btffamily/vacepay'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import Account from '../models/Account.model';

/**
 * @name getAccounts
 * @description Get reources from database
 * @route GET /vace/v1/accounts
 */
export const getAccounts = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);   
})

/**
 * @name getAccount
 * @description Get a reource from database
 * @route GET /vace/v1/accounts/:id
 */
export const getAccount = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

    const account = await Account.findOne({ _id: req.params.id }).populate([
        { path: 'wallet' },
        { path: 'business', select: 'wallet _id email officialEmail name ' }
    ]);

    if(!account){
        return next(new ErrorResponse('Error', 404, [`account does not exist`]))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: account,
        message: 'successful',
        status: 200
    })

})


