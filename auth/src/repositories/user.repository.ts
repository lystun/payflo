import { ObjectId, FilterQuery } from "mongoose";
import { IUserDoc } from "../utils/types.util";
import User from "../models/User.model";

class UserRepository {

    constructor() { }

    /**
     * @name findById
     * @param id 
     * @param populate 
     * @returns 
     */
    public async findById(id: any, populate: boolean = false): Promise<IUserDoc | null> {

        const dataPop = [
            { path: 'roles', select: '_id name', },
            { path: 'verification' },
            { path: 'kyc' },
            { path: 'kyb' },
            { path: 'country' }
        ]

        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IUserDoc> = { _id: id };

        // find player
        const user = await User.findOne(query).populate(pop);

        return user;

    }

    /**
     * @name findBynameOrEmail
     * @param param 
     * @param populate 
     * @returns 
     */
    public async findByEmail(email: string, populate: boolean = false): Promise<IUserDoc | null> {

        const dataPop = [
            { path: 'roles', select: '_id name', },
            { path: 'verification' },
            { path: 'kyc' },
            { path: 'kyb' },
            { path: 'country' }
        ]

        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IUserDoc> = { email: email };

        // find player
        const user = await User.findOne(query).populate(pop);

        return user;

    }

    /**
     * @name findByEmailSelectPin
     * @param email 
     * @param populate 
     * @returns 
     */
    public async findByEmailSelectPin(email: string, populate: boolean = false): Promise<IUserDoc | null> {

        const dataPop = [
            { path: 'roles', select: '_id name', },
            { path: 'verification' },
            { path: 'kyc' },
            { path: 'kyb' },
            { path: 'country' }
        ]

        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IUserDoc> = { email };

        // find player
        const user = await User.findOne(query).populate(pop).select('+transactionPin');

        return user;

    }

    /**
     * @name findByIdSelectKey
     * @param id 
     * @param populate 
     * @returns 
     */
    public async findByIdSelectKey(id: any, populate: boolean = false): Promise<IUserDoc | null> {

        const dataPop = [
            { path: 'roles', select: '_id name', },
            { path: 'verification' },
            { path: 'kyc' },
            { path: 'kyb' },
            { path: 'country' }
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
     * @name findByEmailSelectKey
     * @param email 
     * @param populate 
     * @returns 
     */
    public async findByEmailSelectKey(email: string, populate: boolean = false): Promise<IUserDoc | null> {

        const dataPop = [
            { path: 'roles', select: '_id name', },
            { path: 'verification' },
            { path: 'kyc' },
            { path: 'kyb' },
            { path: 'country' }
        ]

        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IUserDoc> = { email };

        // find player
        const user = await User.findOne(query).populate(pop)
        .select('+savedPassword +transactionPin +apiKey +apiKey.secret +apiKey.token +apiKey.public +apiKey.publicToken +apiKey.domain +apiKey.isActive +apiKey.updatedAt +keys +keys.secret +keys.token +keys.public +keys.publicToken +keys.domain +keys.isActive +keys.updatedAt');

        return user;

    }

    /**
     * @name findByEmailSelectPassword
     * @param email 
     * @param populate 
     * @returns 
     */
    public async findByEmailSelectPassword(email: string, populate: boolean = false): Promise<IUserDoc | null> {

        const dataPop = [
            { path: 'roles', select: '_id name', },
            { path: 'verification' },
            { path: 'kyc' },
            { path: 'kyb' },
            { path: 'country' }
        ]

        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IUserDoc> = { email: email };

        // find player
        const user = await User.findOne(query).populate(pop)
        .select('+password +passwordType +savedPassword +apiKey +apiKey.secret +apiKey.token +apiKey.public +apiKey.publicToken +apiKey.domain +apiKey.isActive +apiKey.updatedAt +keys +keys.secret +keys.token +keys.public +keys.publicToken +keys.domain +keys.isActive +keys.updatedAt');

        return user;

    }

    /**
     * @name findByIdAndSelectPassword
     * @param id 
     * @param populate 
     * @returns 
     */
    public async findByIdAndSelectPassword(id: any, populate: boolean = false): Promise<IUserDoc | null> {

        const dataPop = [
            { path: 'roles', select: '_id name', },
            { path: 'verification' },
            { path: 'kyc' },
            { path: 'kyb' },
            { path: 'country' }
        ]

        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IUserDoc> = { _id: id };

        // find player
        const user = await User.findOne(query).populate(pop).select('+password +passwordType +savedPassword');

        return user;

    }

    /**
     * @name findByIdAndSelectPIN
     * @param id 
     * @param populate 
     * @returns 
     */
    public async findByIdAndSelectPIN(id: any, populate: boolean = false): Promise<IUserDoc | null> {

        const dataPop = [
            { path: 'roles', select: '_id name', },
            { path: 'verification' },
            { path: 'kyc' },
            { path: 'kyb' },
            { path: 'country' }
        ]

        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IUserDoc> = { _id: id };

        // find player
        const user = await User.findOne(query).populate(pop).select('+transactionPin');

        return user;

    }

}

export default new UserRepository()