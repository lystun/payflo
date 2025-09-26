import { FilterQuery } from "mongoose";
import { IUserDoc } from "../utils/types.util";
import User from "../models/User.model";

class UserRepository {

    constructor() { }

    /**
     * @name findByEmail
     * @param ref 
     * @param number 
     * @param populate 
     * @returns 
     */
    public async findByEmail(email: string, populate: boolean = false): Promise<IUserDoc | null> {

        const dataPop = [
            {
                path: 'business', populate: [
                    { path: 'user' },
                    { path: 'settings' }
                ]
            }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IUserDoc> = { email: email };

        // find player
        const account = await User.findOne(query).populate(pop)
        .select('+apiKey +apiKey.secret +apiKey.token +apiKey.public +apiKey.publicToken +apiKey.domain +apiKey.isActive +apiKey.updatedAt +keys +keys.secret +keys.token +keys.public +keys.publicToken +keys.domain +keys.isActive +keys.updatedAt');

        return account;

    }

    /**
     * @name findByIdAndSelectKey
     * @param id 
     * @param populate 
     * @returns 
     */
    public async findByIdAndSelectKey(id: any, populate: boolean = false): Promise<IUserDoc | null> {

        const dataPop = [
            {
                path: 'business', populate: [
                    { path: 'user' },
                    { path: 'settings' }
                ]
            }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IUserDoc> = { _id: id };

        // find player
        const user = await User.findOne(query).populate(pop)
        .select('+apiKey +apiKey.secret +apiKey.token +apiKey.public +apiKey.publicToken +apiKey.domain +apiKey.isActive +apiKey.updatedAt +keys +keys.secret +keys.token +keys.public +keys.publicToken +keys.domain +keys.isActive +keys.updatedAt');

        return user;

    }

    /**
     * @name findByEmailAndSelectKey
     * @param email 
     * @param populate 
     * @returns 
     */
    public async findByEmailAndSelectKey(email: any, populate: boolean = false): Promise<IUserDoc | null> {

        const dataPop = [
            {
                path: 'business', populate: [
                    { path: 'user' },
                    { path: 'settings' }
                ]
            }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IUserDoc> = { email: email };

        // find player
        const user = await User.findOne(query).populate(pop)
        .select('+apiKey +apiKey.secret +apiKey.token +apiKey.public +apiKey.publicToken +apiKey.domain +apiKey.isActive +apiKey.updatedAt +keys +keys.secret +keys.token +keys.public +keys.publicToken +keys.domain +keys.isActive +keys.updatedAt');

        return user;

    }

    /**
     * @name findByBusinessId
     * @param id 
     * @param populate 
     * @returns 
     */
    public async findByBusinessId(id: any, populate: boolean = false): Promise<IUserDoc | null> {

        const dataPop = [
            {
                path: 'business', populate: [
                    { path: 'user' },
                    { path: 'settings' }
                ]
            }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IUserDoc> = { business: id };

        // find player
        const user = await User.findOne(query).populate(pop)
        .select("+webhook +webhook.url +webhook.header +webhook.domain +webhook.isActive +webhook.createdAt +apiKey +apiKey.key +apiKey.token +apiKey.domain +apiKey.isActive +apiKey.createdAt +keys +keys.token +keys.key +keys.domain +keys.isActive +keys.createdAt");

        return user;

    }

    /**
     * @name findByIdAndSelectWebhook
     * @param id 
     * @param populate 
     * @returns 
     */
    public async findByIdAndSelectWebhook(id: any, populate: boolean = false): Promise<IUserDoc | null> {

        const dataPop = [
            {
                path: 'business', populate: [
                    { path: 'user' },
                    { path: 'settings' }
                ]
            }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IUserDoc> = { _id: id };

        // find player
        const user = await User.findOne(query).populate(pop)
        .select("+webhook +webhook.url +webhook.header +webhook.domain +webhook.isActive +webhook.createdAt +apiKey +apiKey.token +apiKey.publicToken +apiKey.public +apiKey.secret +apiKey.domain +apiKey.isActive +apiKey.updatedAt +keys +keys.token +keys.publicToken +keys.public +keys.secret +keys.domain +keys.isActive +keys.updatedAt");

        return user;

    }

}

export default new UserRepository