import { IResult, IUserDoc } from '../utils/types.util'
import crypto from 'crypto'
import { Request } from 'express'
import { DecodeAPIKeyDTO } from '../dtos/user.dto';
import { APIKeyType, UserType } from '../utils/enums.util';
import User from '../models/User.model';

class UserService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name decodeAPIKey
     * @param data 
     * @returns 
     */
    public async decodeAPIKey(data: DecodeAPIKeyDTO): Promise<IUserDoc | null> {

        let result: IUserDoc | null = null;
        const { apikey, type } = data;

        if (type === APIKeyType.SECRETKEY) {

            const token = crypto.createHash('sha256').update(apikey).digest('hex');
            const user = await User.findOne({ "apiKey.secret": apikey, "apiKey.token": token });

            if (user) {
                result = user;
            }

        }

        if (type === APIKeyType.PUBLICKEY) {

            const token = crypto.createHash('sha256').update(apikey).digest('hex');
            const user = await User.findOne({ "apiKey.public": apikey, "apiKey.publicToken": token });

            if (user) {
                result = user;
            }

        }

        return result;

    }

    /**
     * @name getLoggedInUser
     * @param data 
     * @returns 
     */
    public async getLoggedInUser(data: { req: Request, isAdmin: boolean }): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { req, isAdmin } = data;

        const user = await User.findOne({ _id: req.user._id });

        if (!user) {
            result.error = true;
            result.message = `authorized user details not found`
            result.code = 401;
        } else if (user && isAdmin === false && (user.userType === UserType.ADMIN || user.userType === UserType.SUPER)) {
            result.error = true;
            result.message = `user is not authorized to access this route`
            result.code = 401;
        } else {

            result.error = false;
            result.data = {
                user: user
            }

        }

        return result;

    }

    /**
     * @name deleteUserData
     * @param user 
     */
    public async deleteUserData(user: IUserDoc): Promise<void>{

        const delUser = await User.findOne({ _id: user._id })

        if(delUser){
            
            await User.deleteOne({ _id: delUser._id });

        }


    }

}

export default new UserService();