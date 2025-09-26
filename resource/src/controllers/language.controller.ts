import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { asyncHandler } from '@btffamily/vacepay';
import { CacheKeys, computeKey } from '../utils/cache.util'
import redis from '../middleware/redis.mw'

import Language from '../models/Language.model';

// @desc    Get All Languages
// @route   GET /api/resource/v1/languages
// access   Public
export const getLanguages = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);
})

// @desc    Get A Language
// @route   GET /api/resource/v1/language/:id
// access   Public
export const getLanguage = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const cached = await redis.fetchData(CacheKeys.Language);

    if(cached !== null){

        res.status(200).json({
            error: false,
            errors: [],
            data: cached.data,
            message: 'successful',
            status: 200
        })

    }
	
	const lang = await Language.findById(req.params.id)

    if(!lang){
        return next(new ErrorResponse('Cannot find language', 404, ['Cannot find language']))
    }

    // cache data
    await redis.keepData({ key: computeKey(process.env.NODE_ENV,CacheKeys.Language), value: { data: lang } }, (15 * 86400)) // expires in 15 days

    res.status(200).json({
        error: false,
        errors: [],
        data: lang,
        message: 'successful',
        status: 200
    })

})

/** 
 * snippet
 * **/ 

// @desc        Login user (with verification)
// @route       POST /api/identity/v1/auth/login
// @access      Public
// export const funcd = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

// })