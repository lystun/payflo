import ErrorResponse from '../utils/error.util'
import { Request, Response, NextFunction } from 'express'
import { asyncHandler } from '@btffamily/vacepay'
import { HeaderType } from '../utils/enums.util';
import redis from './redis.mw';
import { computeKey } from '../utils/cache.util';
import IdempotentService from '../services/security/idempotent.service';

declare global {
    namespace Express {
        interface Request {
            idempotentKey?: string
        }
    }
}

/**
 * @name checkIdempotency
 */
export const checkIdempotency = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {


    if (!req.headers[HeaderType.IDEMPOTENT]) {
        return next(new ErrorResponse('forbidden!', 403, ['no idempotent key specified']));
    }

    // get the key
    const idempKey: string = req.headers[HeaderType.IDEMPOTENT].toString();

    // capture key in global object
    req.idempotentKey = idempKey;

    // check request time
    const curTime = await IdempotentService.checkRequestTime({ type: 'user-time', payload: req.body, user: req.user })

    if (curTime.error) {

        return next(new ErrorResponse('forbidden!', 403, [`${curTime.message}`]));

    } else {

        const cached = await redis.fetchData(computeKey(process.env.APP_ENV, idempKey));

        if (cached) {

            const checkIdemp = await IdempotentService.checkRequestKey({ key: idempKey, payload: req.body, user: req.user });
    
            if (checkIdemp.error) {
    
                return next(new ErrorResponse('forbidden!', 403, [`${checkIdemp.message}`]));
    
            } else {

                return next();
    
            }
    
        }else {
            return next();
        }

    }


})

/**
 * @name checkTimeIndempotency
 */
export const checkTimeIndempotency = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {


    if (!req.headers[HeaderType.IDEMPOTENT]) {
        return next(new ErrorResponse('forbidden!', 403, ['no idempotent key specified']));
    }

    // get the key
    const idempKey: string = req.headers[HeaderType.IDEMPOTENT].toString();

    // capture key in global object
    req.idempotentKey = idempKey;

    // check request time
    const curTime = await IdempotentService.checkRequestTime({ type: 'user-time', payload: req.body, user: req.user })

    if (curTime.error) {

        return next(new ErrorResponse('forbidden!', 403, [`${curTime.message}`]));

    } else {

        const cached = await redis.fetchData(computeKey(process.env.APP_ENV, idempKey));

        if (cached) {

            const checkIdemp = await IdempotentService.checkRequestKey({ key: idempKey, payload: req.body, user: req.user });

            if (checkIdemp.error) {

                return next(new ErrorResponse('forbidden!', 403, [`${checkIdemp.message}`]));

            } else {

                return next();

            }

        } else {

            return next();

        }

    }


})