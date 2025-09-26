import Post from '../models/Post.model';
import { IResult, ITagDoc, IUserDoc, IPostDoc } from '../utils/types.util'
import { arrayIncludes } from '@btffamily/vacepay';
import crypto from 'crypto'
import User from '../models/User.model';
import Subscriber from '../models/Subscriber.model';
import { DecodeAPIKeyDTO } from '../dtos/user.dto';
import { APIKeyType } from '../utils/enums.util';
import Comment from '../models/Comment.model';

interface IOverview{
    total: number,
    writers: number,
    admins: number,
    teachers: number,
    mentors: number,
    subscribers: {
        total: number,
        enabled: number,
        disabled: number
    }
}

class UserService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    public hasPost(user: IUserDoc, post: IPostDoc): boolean {

        let flag = false;

        if(arrayIncludes(user.posts, post._id.toString())){
            flag = true;
        }

        return flag;

    }

    /**
     * 
     * @returns 
     */
    public async overview(): Promise<IOverview>{

        let result: IOverview = {
            total: 0,
            writers: 0,
            admins: 0,
            teachers: 0,
            mentors: 0,
            subscribers: {
                total: 0,
                enabled: 0,
                disabled: 0
            }
        }

        const users = await User.find({});

        const subscribers = await Subscriber.countDocuments();
        const enSubbsers = await Subscriber.countDocuments({ isEnabled: true });
        const dbSubbsers = await Subscriber.countDocuments({ isEnabled: false });

        if(users.length > 0){

            result.total = users.length;

            for(let i = 0; i < users.length; i++){
                const user = users[i];

                if(user.userType === 'writer'){
                    result.writers += 1;
                }

                if(user.userType === 'admin'){
                    result.admins += 1;
                }

                if(user.userType === 'teacher'){
                    result.teachers += 1;
                }

                if(user.userType === 'mentor'){
                    result.mentors += 1;
                }
                
            }

        }

        result.subscribers = {
            total: subscribers,
            enabled: enSubbsers,
            disabled: dbSubbsers
        }

        return result;

    }

    public async attachTag(user: IUserDoc, tag: ITagDoc): Promise<void>{

        if(!arrayIncludes(user.tags, tag._id.toString())){
            user.tags.push(tag._id);
            await user.save();
        }

    }

    public async detachTag(user: IUserDoc, tag: ITagDoc): Promise<void>{

        if(arrayIncludes(user.tags, tag._id.toString())){
            const filtered = user.tags.filter((x) => x.toString() !== tag._id.toString())
            user.tags = filtered;
            await user.save();
        }

    }

    public async attachPost(user: IUserDoc, post: IPostDoc): Promise<void>{

        if(!arrayIncludes(user.posts, post._id.toString())){
            user.posts.push(post._id);
            await user.save();
        }

    }

    public async detachPost(user: IUserDoc, post: IPostDoc): Promise<void>{

        if(arrayIncludes(user.posts, post._id.toString())){
            const filtered = user.posts.filter((x) => x.toString() !== post._id.toString())
            user.posts = filtered;
            await user.save();
        }

    }

    /**
     * @name checkEmail
     * @description validates against invalid email
     * @param email - The email to check
     * 
     * @returns {boolean} true/false to determine the state of the email
     */
    public async checkEmail(email: string): Promise<boolean>{

        const match = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        const matched: boolean = match.test(email);

        return matched;

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
     * @name deleteUserData
     * @param user 
     */
    public async deleteUserData(user: IUserDoc): Promise<void>{

        const delUser = await User.findOne({ _id: user._id })

        if(delUser){
            await Comment.deleteMany({ user: delUser._id })
            await Post.deleteMany({ user: delUser._id });
            await User.deleteOne({ _id: delUser._id });
        }


    }

}

export default new UserService();