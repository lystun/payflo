import { ObjectId, FilterQuery } from "mongoose";
import { IBusinessDoc } from "../utils/types.util";
import Business from "../models/Business.model";

class BusinessRepository {

    constructor() { }

    /**
     * @name findById
     * @param id 
     * @param populate 
     * @returns 
     */
    public async findById(id: any, populate: boolean = false): Promise<IBusinessDoc | null> {

        const dataPop = [
            { path: 'user' },
            { path: 'wallet' },
            { path: 'settings' },
            {
                path: 'accounts', populate: [
                    { path: 'provider' }
                ]
            },
            { path: 'banks' },
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IBusinessDoc> = { _id: id };

        // find player
        const business = await Business.findOne(query).populate(pop);

        return business;

    }

    /**
     * @name findByIdSelectPin
     * @param id 
     * @param populate 
     * @returns 
     */
    public async findByIdAndSelectPin(id: any, populate: boolean = false): Promise<IBusinessDoc | null> {

        const dataPop = [
            { path: 'user' },
            { path: 'wallet' },
            { path: 'settings' },
            {
                path: 'accounts', populate: [
                    { path: 'provider' }
                ]
            },
            { path: 'banks' },
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IBusinessDoc> = { _id: id };

        // find player
        const business = await Business.findOne(query).populate(pop).select('+transactionPin');

        return business;

    }

    /**
     * @name findBynameOrEmail
     * @param param 
     * @param populate 
     * @returns 
     */
    public async findBynameOrEmail(param: string, populate: boolean = false): Promise<IBusinessDoc | null> {

        const dataPop = [
            { path: 'user' },
            { path: 'wallet' },
            { path: 'settings' },
            {
                path: 'accounts', populate: [
                    { path: 'provider' }
                ]
            },
            { path: 'banks' },
        ]

        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IBusinessDoc> = { $or: [{ email: param }, { name: param }] };

        // find player
        const business = await Business.findOne(query).populate(pop);

        return business;

    }

    /**
     * @name findByIdOrBusinessID
     * @param param 
     * @param populate 
     * @returns 
     */
    public async findByBusinessID(param: string, populate: boolean = false): Promise<IBusinessDoc | null> {

        const dataPop = [
            { path: 'user' },
            { path: 'wallet' },
            { path: 'settings' },
            {
                path: 'accounts', populate: [
                    { path: 'provider' }
                ]
            },
            { path: 'banks' },
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IBusinessDoc> = { businessID: param };

        // find player
        const business = await Business.findOne(query).populate(pop);

        return business;

    }

    /**
     * @name findByUser
     * @param user 
     * @param populate 
     * @returns 
     */
    public async findByUser(user: any, populate: boolean = false): Promise<IBusinessDoc | null> {

        const dataPop = [
            { path: 'user' },
            { path: 'wallet' },
            { path: 'settings' },
            {
                path: 'accounts', populate: [
                    { path: 'provider' }
                ]
            },
            { path: 'banks' },
        ]
        const pop = populate ? dataPop : [];

        if (user) {

            let query: FilterQuery<IBusinessDoc> = {}

            if (user && user.business) {

                if(user.business._id){
                    query = { _id: user.business._id }
                }else{
                    query = { _id: user.business }
                }

            }else if(user._id){

                query = { user: user._id }

            } else {

                query = { user: user }

            }

            // find player
            const business = await Business.findOne(query).populate(pop);

            return business;

        } else {

            return null;

        }



    }

    /**
     * @name findByBusiness
     * @param business
     * @param populate 
     * @returns 
     */
    public async findByBusiness(business: any, populate: boolean = false): Promise<IBusinessDoc | null> {

        const dataPop = [
            { path: 'user' },
            { path: 'wallet' },
            { path: 'settings' },
            {
                path: 'accounts', populate: [
                    { path: 'provider' }
                ]
            },
            { path: 'banks' },
        ]
        const pop = populate ? dataPop : [];

        if (business) {

            let query: FilterQuery<IBusinessDoc> = {}

            if (business._id) {
                query = { _id: business._id }
            }else if(business){
                query = { _id: business }
            }

            // find player
            const businessData = await Business.findOne(query).populate(pop);
            return businessData;

        } else {

            return null;

        }



    }

}

export default new BusinessRepository