import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { asyncHandler, isString, arrayIncludes } from '@btffamily/vacepay';
import { uploadBase64File } from '../utils/google.util'
import { CacheKeys, computeKey } from '../utils/cache.util'
import redis from '../middleware/redis.mw'

// import models
import Asset from '../models/Asset.model';
import { generate } from '../utils/random.util';

// @desc        Get Assets
// @route       POST /api/resource/v1/assets
// @access      Public
export const getAssets = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);
})

// @desc     Get an Asset
// @route    GET /api/resources/v1/assets/:id
// @access   Public
export const getAsset = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const cached = await redis.fetchData(CacheKeys.Asset);

    if(cached !== null){

        res.status(200).json({
            error: false,
            errors: [],
            data: cached.data,
            message: `successful`,
            status: 200,
        });

    }

    const asset = await Asset.findById(req.params.id);
 
    if (!asset) {
        return next(
            new ErrorResponse(`Not found`, 404, [`cnnot find asset`])
        );
    }

    // cache data
    await redis.keepData({ key: computeKey(process.env.NODE_ENV, CacheKeys.Asset), value: {data: asset}}, (15 * 86400));  // expire in 15 days
    
    res.status(200).json({
        error: false,
        errors: [],
        data: asset,
        message: `successful`,
        status: 200,
    });

})

// @desc     Add a Asset
// @route    POST /api/resources/v1/assets
// @access   Public
export const addAsset = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	
	const { name, type, data, isEnabled } = req.body;

    const existing = await Asset.findOne({ name: name });

    if(existing){
        return next(new ErrorResponse('Error', 400, ['asset name already existing']));
    }

    const allowed = ['image', 'text', 'file'];

    if(!arrayIncludes(allowed, type)){
        return next(new ErrorResponse('Error', 400, [`invalid asset type choose any of ${ allowed.join(', ') }`]));
    }

    const ID = generate(6, false);

    const asset = await Asset.create({
        name,
        assetID: `ASST-${ID}`,
        type,
        isEnabled: isEnabled ? isEnabled : true
    });

    if(type === 'image'){

        if(!data) {
            return next(new ErrorResponse(`Error`, 400, ['image data is required']));
        }
    
        if(!isString(data)){
            return next(new ErrorResponse(`Eror!`, 400, ['image data should be a string']));
        }

        const mime = data.split(';base64')[0].split(':')[1];

        if(!mime || mime === '') {
            return next(new ErrorResponse(`invalid format`, 400, ['image data is is expected to be base64 string']));
        }

        // upload file
        const fileData = {
            file: data,
            filename: name,
            mimeType: mime
        }

        // upload to google cloud storage
        const gData = await uploadBase64File(fileData);

        // save
        asset.url = gData.publicUrl;
        await asset.save();

    }

    if(type === 'text'){

        if(!data) {
            return next(new ErrorResponse(`Error`, 400, ['text data is required']));
        }

        if(!isString(data)){
            return next(new ErrorResponse(`Eror!`, 400, ['text data should be a string']));
        }

        asset.body = data;
        await asset.save();

    }

    await redis.deleteData(CacheKeys.Assets);
    await redis.deleteData(CacheKeys.Asset);

    res.status(200).json({
        error: false,
        errors: [],
        data: asset,
        message: `successful`,
        status: 200,
    });

})

// @desc     Enable an Asset
// @route    PUT /api/resource/v1/assets/enable/:id
// @access   Public
export const enableAsset = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const asset = await Asset.findOne({ _id: req.params.id });

    if(!asset){
        return next(new ErrorResponse('Error', 404, ['asset does not exist']));
    }

    asset.isEnabled = true;
    await asset.save();

    await redis.deleteData(CacheKeys.Assets);
    await redis.deleteData(CacheKeys.Asset);

    res.status(200).json({
        error: false,
        errors: [],
        data: null,
        message: `successful`,
        status: 200,
    });
})

// @desc     Disable an Asset
// @route    PUT /api/resource/v1/assets/disable/:id
// @access   Public
export const disableAsset = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const asset = await Asset.findOne({ _id: req.params.id });

    if(!asset){
        return next(new ErrorResponse('Error', 404, ['asset does not exist']));
    }

    asset.isEnabled = false;
    await asset.save();

    await redis.deleteData(CacheKeys.Assets);
    await redis.deleteData(CacheKeys.Asset);

    res.status(200).json({
        error: false,
        errors: [],
        data: null,
        message: `successful`,
        status: 200,
    });
})

// @desc     Remove an Asset
// @route    DELETE /api/resource/v1/assets/:id
// @access   Public
export const removeAsset = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const asset = await Asset.findOne({ _id: req.params.id });

    if(!asset){
        return next(new ErrorResponse('Error', 404, ['asset does not exist']));
    }

    await Asset.deleteOne({ _id: asset._id });

    await redis.deleteData(CacheKeys.Assets);
    await redis.deleteData(CacheKeys.Asset);

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