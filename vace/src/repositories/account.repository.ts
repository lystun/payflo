import { FilterQuery } from "mongoose";
import { IAccountDoc } from "../utils/types.util";
import Account from "../models/Account.model";

class AccountRepository {

    constructor() { }

    /**
     * @name findByReferenceOrNumber
     * @param ref 
     * @param number 
     * @param populate 
     * @returns 
     */
    public async findByReferenceOrNumber(ref: string, number: string, populate: boolean = false): Promise<IAccountDoc | null> {

        const dataPop = [
            {
                path: 'business', populate: [
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
            },
            { path: 'wallet' },
            { path: "provider" }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IAccountDoc> = { $or: [{ "customer.reference": ref }, { accountNo: number }] };

        // find player
        const account = await Account.findOne(query).populate(pop);

        return account;

    }

    /**
     * @name findByAcccountNo
     * @param accountNo 
     * @param populate 
     * @returns 
     */
    public async findByAcccountNo(accountNo: string, populate: boolean = false): Promise<IAccountDoc | null> {

        const dataPop = [
            {
                path: 'business', populate: [
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
            },
            { path: 'wallet' },
            { path: "provider" }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IAccountDoc> = { accountNo: accountNo };

        // find player
        const account = await Account.findOne(query).populate(pop);

        return account;

    }

    /**
     * @name findByCustomerReference
     * @param reference 
     * @param populate 
     * @returns 
     */
    public async findByCustomerReference(reference: string, populate: boolean = false): Promise<IAccountDoc | null> {

        const dataPop = [
            {
                path: 'business', populate: [
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
            },
            { path: 'wallet' },
            { path: "provider" }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IAccountDoc> = { "customer.reference": reference };

        // find player
        const account = await Account.findOne(query).populate(pop);

        return account;

    }

    /**
     * @name findByProviderReference
     * @param ref 
     * @param providerRef 
     * @param populate 
     * @returns 
     */
    public async findByProviderReference(custRef: string, providerRef: string, populate: boolean = false): Promise<IAccountDoc | null> {

        const dataPop = [
            {
                path: 'business', populate: [
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
            },
            { path: 'wallet' },
            { path: "provider" }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IAccountDoc> = { $or: [{ "customer.reference": custRef }, { providerRef: providerRef }] };

        // find player
        const account = await Account.findOne(query).populate(pop);

        return account;

    }

    /**
     * @name findByBusinessId
     * @param id 
     * @param populate 
     * @returns 
     */
    public async findByBusinessId(id: any, populate: boolean = false): Promise<IAccountDoc | null> {

        const dataPop = [
            {
                path: 'business', populate: [
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
            },
            { path: 'wallet' },
            { path: "provider" }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IAccountDoc> = { business: id };

        // find player
        const account = await Account.findOne(query).populate(pop);

        return account;

    }

    /**
     * @name findAndSelectEmptyAccounts
     * @param populate 
     * @returns 
     */
    public async findAndSelectEmptyAccounts(populate: boolean = false): Promise<Array<IAccountDoc>> {

        const dataPop = [
            {
                path: 'business', populate: [
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
            },
            { path: 'wallet' },
            { path: "provider" }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IAccountDoc> = { $or: [{ accountNo: { $exists: false } }, { accountNo: '' }] };

        // find player
        const accounts = await Account.find(query).populate(pop);

        return accounts;

    }

}

export default new AccountRepository