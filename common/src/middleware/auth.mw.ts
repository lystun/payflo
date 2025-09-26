import crypto from 'crypto'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { Request } from 'express'
import { getRolesByName } from './role.mw'
import { ObjectId } from 'mongoose'
import redis from './redis.mw';
import { CacheKeys } from '../utils/cache.util'
import { arrayIncludes, charLen } from '../utils/functions.util'

export interface IRedisConnOptions {
    host: string;
    port: number;
    password: string;
    user: string
}

export interface IRedisData {
    key: string;
    value: any;
}

export interface IPermitOptions{
    entity?: string,
    actions?: Array<string>,
    roles?: Array<string>,
    userType: string,
    userPermissions: Array<{
        entity: string,
        actions: Array<string>
    }>
}

export const protect = async (req: Request, secret: string): Promise<string | JwtPayload | any> => {

    let result: string | JwtPayload | any = '';
    let token: string = '';

    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){

        token = req.headers.authorization.split(' ')[1];  // get token from bearer

    }else if(req.cookies.token){

        token = req.cookies.token;

    }

    if(!token || token === ''){
        result = ''
    }

    if(token){

        try {

            var decoded = jwt.verify(token, secret);
            result = decoded;
            
        } catch (err) {

            // return the token (API Key) instead if there is an error in decoding (works for API keys)
            result = token;
        } 
        
    }

    return result;

}

export const authorize = async (roles: Array<string>, userRoles: Array<any>, authType: string, authDB: string, options: IRedisConnOptions): Promise<boolean> => {

    let allRoles:Array<any> = [];
    let resultFlag: boolean = false;

    // connect to redis
    // await redis.connect({ user: options.user, password: options.password, host: options.host, port: options.port });

    const fetch = await getRolesByName(roles, authType, authDB);

    // get authorized IDs //
    const ids = fetch.map((e: any) => { 
        if(e !== undefined && e !== null){
            return e._id;
        }
    });

    // check if user roles matches the authorized roles
    const flag = checkRole(ids, userRoles);

    if(flag){
        resultFlag = true
    }else{
        resultFlag = false;
    }

    return resultFlag;


}

export const permit = async (data: IPermitOptions): Promise<{ flag: boolean, action: string }> => {

    let flag: boolean = true;
    let _action: string = '';

    const { actions, entity, roles, userPermissions, userType } = data;
    
    if(entity && actions && roles){

        if(arrayIncludes(roles, userType)){

            const permission = userPermissions.find((x) => x.entity === entity);

            if(permission){

                // process actions
                for(let i = 0; i < actions.length; i++){

                    let action = actions[i];
                    let found = permission.actions.find((x) => x === action);

                    if(found){
                        flag = true;
                        break;
                    }else{
                        flag = false;
                        _action = action;
                        continue;
                    }

                }

            }else{
                // not permitted
                flag = false;
            }

        }else{
            flag = true
        }

    }else{
        flag = true;
    }

    return { flag, action: _action }

}

const checkRole = (roleIds: Array<string>, roles: Array<any>): boolean => {

    let flag: boolean = false;

    let mappedRoles = roles.map((x: any) => {
        if(x._id || x.id || x.name){
            return x._id;
        }else{
            return x
        }
    })

    for(let i = 0; i < roleIds.length; i++){

        for(let j = 0; j < mappedRoles.length; j++){

            if(roleIds[i] !== undefined && roleIds[i].toString() === mappedRoles[j].toString()){
                flag = true;
            }

        }

    }

    return flag;

}