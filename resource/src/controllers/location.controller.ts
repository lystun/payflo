import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { asyncHandler } from '@btffamily/vacepay';
import { CacheKeys } from '../utils/cache.util'
import redis from '../middleware/redis.mw'

import Location from '../models/Location.model';
import Country from '../models/Country.model';
import { generate } from '../utils/random.util';

// @desc        Get Locations
// @route       GET /api/resource/v1/Locations
// @access      Public
export const getLocations = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);
})

// @desc        Get A Location
// @route       GET /api/resource/v1/Locations/:id
// @access      Public
export const getLocation = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const cached = await redis.fetchData(CacheKeys.Location);

    if(cached !== null){

        res.status(200).json({
            error: false,
            errors: [],
            data: cached.data,
            message: `successful`,
            status: 200,
        });

    }
	
	const location = await Location.findById(req.params.id).populate([ { path: 'country' } ]);
 
   if (!location) {
       return next(
           new ErrorResponse(`Not found`, 404, [`Cannot find location`])
       );
   }

   // cache data
   await redis.keepData({ key: CacheKeys.Location, value: { data: location } }, (15 * 86400)) // expires in 15 days
 
   res.status(200).json({
       error: false,
       errors: [],
       data: location,
       message: `successful`,
       status: 200,
   });

})

// @desc        Add A Location
// @route       POST /api/resource/v1/Locations/
// @access      Public
export const addLocation = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	

    const { name, LocationId, vicinity, components, countryCode } = req.body;

    if(!vicinity){
        return next( new ErrorResponse(`Error`, 400, [`vicinity is required`]) );
    }

    if(!components){
        return next( new ErrorResponse(`Error`, 400, [`Location components is required`]) );
    }

    if(!countryCode){
        return next( new ErrorResponse(`Error`, 400, [`country code is required`]) );
    }

    const country = await Country.findOne({ code2: countryCode });
    
    if(!country){
        return next( new ErrorResponse(`Error`, 400, [`country code is required`]) );
    }

    const location = await Location.create({

        name,
        LocationId,
        vicinity,
        components,
        country: country._id,
        isEnabled: true,
        isAvailable: true

    })

    await redis.deleteData(CacheKeys.Locations);
    await redis.deleteData(CacheKeys.Location);

    res.status(200).json({

        error: false,
        errors: [],
        data: location,
        message: `successful`,
        status: 200,

    })

});


// @desc        Enable A Location
// @route       PUT /api/resource/v1/Locations/enable/:id
// @access      Private
export const enableLocation = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	
	const location = await Location.findById(req.params.id);
 
   if (!location) {
       return next(
           new ErrorResponse(`Not found`, 404, [`Cannot find location`])
       );
   }

   location.isEnabled = true;
   await location.save();

   await redis.deleteData(CacheKeys.Locations);
    await redis.deleteData(CacheKeys.Location);
 
   res.status(200).json({
       error: false,
       errors: [],
       data: null,
       message: `successful`,
       status: 200,
   });

})

// @desc        Disable A Location
// @route       PUT /api/resource/v1/Locations/disable/:id
// @access      Private
export const disableLocation = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
	
	const location = await Location.findById(req.params.id);
 
   if (!location) {
       return next(
           new ErrorResponse(`Not found`, 404, [`Cannot find location`])
       );
   }

   location.isEnabled = false;
   await location.save();
 
   res.status(200).json({
       error: false,
       errors: [],
       data: null,
       message: `successful`,
       status: 200,
   });

   await redis.deleteData(CacheKeys.Locations);
    await redis.deleteData(CacheKeys.Location);

})

/** 
 * snippet
 * **/ 

// @desc        Login user (with verification)
// @route       POST /api/identity/v1/auth/login
// @access      Public
// export const funcd = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

// })