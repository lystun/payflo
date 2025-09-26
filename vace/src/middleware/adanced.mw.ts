import { Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import redis from './redis.mw'
import { sortData } from '@btffamily/vacepay';
import { computeKey } from '../utils/cache.util'
import { advanced } from '../utils/result.util'

// this is important if you want to use res.advancedResults on the fly
declare global {
    namespace Express {
      interface Response {
        advancedResults?: any
      }
    }
}

const advancedResults = (model: Model<any>, populate: Array<any> = [], key: string = '', sortRef: string = '', enableCache: boolean = false) => async (req: Request<any>, res: Response, next: NextFunction ) => {

	if(enableCache === true){

		const cached = await redis.fetchData(computeKey(process.env.NODE_ENV, key));

		if(cached !== null){

			res.advancedResults = {
				error: false,
				errors: [],
				count: cached.count,
				total: cached.total,
				message: 'successfull',
				pagination: cached.pagination,
				data: cached.data,
				status: 200
			};

			// this part is important for express to move to next request
			next();

		}

		if(cached === null){

			// use the advanced results function
			const _result = await advanced(model, populate, sortRef, req);

			// save data to cache
			const data = {
				key: computeKey(process.env.NODE_ENV, key),
				value: { data: _result.data, pagination: _result.pagination }
			}
			
			await redis.keepData(data, parseInt('1800')); // expire in 30 minutes

			res.advancedResults = {
				error: false,
				errors: [],
				count: _result.count,
				total: _result.total,
				pagination: _result.pagination,
				data: _result.data,
				message: 'successfull',
				status: 200
			};

			// this part is important for express to move to next request
			next();

		}

	}

	if(enableCache === false){

		// use the advanced results function
		const _result = await advanced(model, populate, sortRef, req);

		res.advancedResults = {
			error: false,
			errors: [],
			count: _result.count,
			total: _result.total,
			pagination: _result.pagination,
			data: _result.data,
			message: 'successfull',
			status: 200
		};

		// this part is important for express to move to next request
		next();

	}

}

export default advancedResults;