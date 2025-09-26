import crypto from 'crypto';
import ErrorResponse from '../utils/error.util';
import { Request, Response, NextFunction } from 'express'
import User from '../models/User.model'

import { IRedisConnOptions, IPermitOptions ,asyncHandler, protect as AuthCheck, authorize as Authorize, permit as permitCheck, arrayIncludes } from '@btffamily/vacepay';
import UserService from '../services/user.service';
import { BusinessType, UserType } from '../utils/enums.util';
import { IUserDoc } from '../utils/types.util';

declare global {
    namespace Express{
        interface Request{
            user?: any;
        }
    }
}

interface IPermit{
    entity?: string,
    actions?: Array<string>,
    roles?: Array<string>
}

export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    try {

        let authCheck: any;

        authCheck = await AuthCheck(req, process.env.JWT_SECRET || '');

        // make sure token exists
        if(authCheck === null){
            return next(new ErrorResponse('Invalid token', 401, ['user not authorized to access this route']))
        }

        if(authCheck.id){

            req.user = await User.findOne({ _id: authCheck.id });

            if(req.user){
                return next();
            }else{
                return next(new ErrorResponse('Invalid token', 401, ['user not authorized to access this route']))
            }

        }else{

            const user = await UserService.decodeAPIKey({ apikey: authCheck, type: 'secret' });

            if(user && user !== null){

                // this makes sure only corporate businesses can use API Keys
                if(user.userType === UserType.BUSINESS && user.businessType !== BusinessType.CORPORATE){
                    return next(new ErrorResponse('Forbidden!', 403, ['user is not authorized to use api keys']))
                }else{
                    req.user = user;
                    return next();
                }

            }else{
                return next(new ErrorResponse('Invalid token', 401, ['user not authorized to access this route']))
            }

        }
        
    } catch (err) {

        // console.log(err);
        return next(new ErrorResponse('Error!', 401, ['user not authorized to access this route']))
        
    }

})

export const authorize = (roles: Array<string>, perm?: IPermit) => asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let authPermit: boolean = false;

    const redisConn: IRedisConnOptions = {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        user: process.env.REDIS_USER || '',
        password: process.env.REDIS_PASSWORD || ''
    }

    const user: IUserDoc = req.user;

    if(!user){
        return next (new ErrorResponse('unauthorized!', 401, ['user is not signed in']))
    }

    await Authorize(roles, user.roles, process.env.AUTH_TYPE || 'development', process.env.MONGODB_URI || '', redisConn).then((resp: any) => {
        authPermit = resp;
    });

    if(!authPermit){
        return next (new ErrorResponse('unauthorized!', 401, ['user is not authorized to access this route']))
    }else{

        if(perm){

            const { actions, entity } = perm;

            const check = await permitCheck({
                roles: perm.roles,
                actions,
                entity,
                userType: user.userType,
                userPermissions: user.permissions,
            });
        
            if(check.flag === false){
                return next(new ErrorResponse('Not permitted!', 403, [`user not permitted to ${check.action} resource`]))
            }else{
                return next();
            }

        }else{
            return next();
        }

    }

})

export const permit = (data: IPermit) => asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const user: IUserDoc = req.user;
    const { actions, entity, roles } = data;

    const check = await permitCheck({
        roles,
        actions,
        entity,
        userType: user.userType,
        userPermissions: user.permissions,
    });

    if(check.flag === false){
        return next(new ErrorResponse('Not permitted!', 403, [`user not permitted to ${check.action} resource`]))
    }else{
        return next();
    }

})