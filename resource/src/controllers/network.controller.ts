import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { asyncHandler, strIncludesEs6, strToArrayEs6 } from '@btffamily/vacepay';
import { CacheKeys, computeKey } from '../utils/cache.util'
import redis from '../middleware/redis.mw'

// import models
import Bank from '../models/Bank.model';
import { generate } from '../utils/random.util';
import Network from '../models/Network.model';

/**
 * @name getNetworks
 * @description Get reource from database
 * @route GET /resource/v1/networks
 */
export const getNetworks = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);
})

/**
 * @name getNetwork
 * @description Get reource from database
 * @route GET /resource/v1/networks/:id
 */
export const getNetwork = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const network = await Network.findOne({ _id: req.params.id });
 
    if (!network) {
        return next( new ErrorResponse(`Not found`, 404, [`network does not exist`]) );
    }
 
   res.status(200).json({
       error: false,
       errors: [],
       data: network,
       message: `successful`,
       status: 200,
   });

})

/**
 * @name createNetwork
 * @description Create reource in the database
 * @route POST /resource/v1/networks
 */
export const createNetwork = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	
	const { name, label, description } = req.body;

    if(!name){
        return next(new ErrorResponse('Error', 400, [`network name is required`]))
    }

    if(!label){
        return next(new ErrorResponse('Error', 400, [`network label: [display name] is required`]))
    }

    const network = await Network.create({
        name,
        label,
        description
    });

    await redis.deleteData(CacheKeys.Networks);

    res.status(200).json({
        error: false,
        errors: [],
        data: network,
        message: `successful`,
        status: 200,
    });

})
