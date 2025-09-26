import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { asyncHandler, isString, arrayIncludes } from '@btffamily/vacepay';
import { uploadBase64File } from '../utils/google.util'
import { CacheKeys, computeKey } from '../utils/cache.util'
import redis from '../middleware/redis.mw'

// import models
import Coin from '../models/Coin.model';
import { generate } from '../utils/random.util';

// @desc        Get Coins
// @route       POST /api/resource/v1/coins
// @access      Public
export const getCoins = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);
})

// @desc     Get a Coin
// @route    GET /api/resources/v1/coins/:id
// @access   Public
export const getCoin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const cached = await redis.fetchData(CacheKeys.Coin);

    if(cached !== null){

        res.status(200).json({
            error: false,
            errors: [],
            data: cached.data,
            message: `successful`,
            status: 200,
        });

    }


    const coin = await Coin.findById(req.params.id);
 
    if (!coin) {
        return next(
            new ErrorResponse(`Not found`, 404, [`cannot find coin`])
        );
    }

    // cache data
    await redis.keepData({ key: computeKey(process.env.NODE_ENV,CacheKeys.Coin), value: {data: coin}}, (2 * 86400));  // expire in 2 days
    
    res.status(200).json({
        error: false,
        errors: [],
        data: coin,
        message: `successful`,
        status: 200,
    });

})

// @desc     Add a Coin
// @route    POST /api/resources/v1/coins
// @access   Public
export const addCoin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	
	const { name, label, symbol, isFiat, isStable, isMajor, blockchain, icon  } = req.body;

    const allowed = ['BTC', 'ETH', 'LTC', 'USDT', 'USDC', 'NGNT', 'BSDNGNT'];

    if(!arrayIncludes(allowed, symbol)){
        return next(new ErrorResponse('Error', 400, [`invalid coin symbol choose any of ${ allowed.join(', ') }`]));
    }

    const existing = await Coin.findOne({ $and: [ { name: name }, { symbol: symbol } ] });

    if(existing){
        return next(new ErrorResponse('Error', 500, [`a coin with the name ${name} and symbol ${symbol} already exists`]));
    }

    const coin = await Coin.create({
        name,
        symbol,
        isFiat,
        isStable,
        isMajor,
        blockchain,
        label,
        isEnabled: true
    });

    if(icon){

        if(!isString(icon)){
            return next(new ErrorResponse(`Eror!`, 400, ['asset icon should be a string']));
        }
    
        const mime = icon.split(';base64')[0].split(':')[1];
    
        if(!mime || mime === '') {
            return next(new ErrorResponse(`invalid format`, 400, ['asset icon is is expected to be base64 string']));
        }

        // upload file
        const fileData = {
            file: icon,
            filename: name + '-' + 'icon',
            mimeType: mime
        }

        // upload to google cloud storage
        const gData = await uploadBase64File(fileData);

        coin.icon = gData.publicUrl;
        await coin.save();

    }

    await redis.deleteData(CacheKeys.Coins);
    await redis.deleteData(CacheKeys.Coin);

    res.status(200).json({
        error: false,
        errors: [],
        data: coin,
        message: `successful`,
        status: 200,
    });

})

// @desc     Upload Coin icon
// @route    PUT /api/resources/v1/coins/upload-icon/:id
// @access   Public
export const uploadIcon = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	
	const { icon  } = req.body;

    if(!icon){
        return next(new ErrorResponse('Error', 400, ['coin icon is required']));
    }

    const coin = await Coin.findOne({ _id: req.params.id });

    if(!coin){
        return next(new ErrorResponse('Error', 404, ['coin does not exist']));
    }

    if(!isString(icon)){
        return next(new ErrorResponse(`Eror!`, 400, ['asset icon should be a string']));
    }

    const mime = icon.split(';base64')[0].split(':')[1];

    if(!mime || mime === '') {
        return next(new ErrorResponse(`invalid format`, 400, ['asset icon is is expected to be base64 string']));
    }

    // upload file
    const fileData = {
        file: icon,
        filename: coin.name + '-' + 'icon',
        mimeType: mime
    }

    // upload to google cloud storage
    const gData = await uploadBase64File(fileData);

    coin.icon = gData.publicUrl;
    await coin.save();

    await redis.deleteData(CacheKeys.Coins);
    await redis.deleteData(CacheKeys.Coin);
    
    res.status(200).json({
        error: false,
        errors: [],
        data: coin,
        message: `successful`,
        status: 200,
    });

})

// @desc     Enable a Coin
// @route    PUT /api/resource/v1/coins/enable/:id
// @access   Public
export const enableCoin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const coin = await Coin.findOne({ _id: req.params.id });

    if(!coin){
        return next(new ErrorResponse('Error', 404, ['coin does not exist']));
    }

    coin.isEnabled = true;
    await coin.save();

    await redis.deleteData(CacheKeys.Coins);
    await redis.deleteData(CacheKeys.Coin);

    res.status(200).json({
        error: false,
        errors: [],
        data: null,
        message: `successful`,
        status: 200,
    });
})

// @desc     Disable a Coin
// @route    PUT /api/resource/v1/coins/disable/:id
// @access   Public
export const disableCoin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const coin = await Coin.findOne({ _id: req.params.id });

    if(!coin){
        return next(new ErrorResponse('Error', 404, ['coin does not exist']));
    }

    coin.isEnabled = false;
    await coin.save();

    await redis.deleteData(CacheKeys.Coins);
    await redis.deleteData(CacheKeys.Coin);

    res.status(200).json({
        error: false,
        errors: [],
        data: null,
        message: `successful`,
        status: 200,
    });
})

// @desc     Remove a Coin
// @route    DELETE /api/resource/v1/coins/:id
// @access   Public
export const removeCoin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const coin = await Coin.findOne({ _id: req.params.id });

    if(!coin){
        return next(new ErrorResponse('Error', 404, ['coin does not exist']));
    }

    await Coin.deleteOne({ _id: coin._id });

    await redis.deleteData(CacheKeys.Coins);
    await redis.deleteData(CacheKeys.Coin);

    res.status(200).json({
        error: false,
        errors: [],
        data: null,
        message: `successful`,
        status: 200,
    });
})

/** 
 * snippet
 * **/ 

// @desc        Login user (with verification)
// @route       POST /api/identity/v1/auth/login
// @access      Public
// export const funcd = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

// })