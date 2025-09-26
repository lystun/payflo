import { FilterQuery, PipelineStage } from "mongoose";
import { IBalanceCount, IWalletDoc } from "../utils/types.util";
import Wallet from "../models/Wallet.model";

class WalletRepository {

    constructor() { }

    /**
     * @name findById
     * @param id 
     * @param populate 
     * @returns 
     */
    public async findById(id: any, populate: boolean = false): Promise<IWalletDoc | null> {

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
            {
                path: 'account', populate: [
                    { path: 'provider' }
                ]
            }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IWalletDoc> = { _id: id };

        // find wallet
        const wallet = await Wallet.findOne(query).populate(pop);

        return wallet;

    }

    /**
     * @name findByWalletID
     * @param id 
     * @param populate 
     * @returns 
     */
    public async findByWalletID(id: string, populate: boolean = false): Promise<IWalletDoc | null> {

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
            {
                path: 'account', populate: [
                    { path: 'provider' }
                ]
            }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IWalletDoc> = { walletID: id };

        // find wallet
        const wallet = await Wallet.findOne(query).populate(pop);

        return wallet;

    }

    /**
     * @name 
     * @param email 
     * @param populate 
     * @returns 
     */
    public async findByEmail(email: string, populate: boolean = false): Promise<IWalletDoc | null> {

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
            {
                path: 'account', populate: [
                    { path: 'provider' }
                ]
            }
        ]
        const pop = populate ? dataPop : [];

        // define filter query
        const query: FilterQuery<IWalletDoc> = { email: email };

        // find wallet
        const wallet = await Wallet.findOne(query).populate(pop);

        return wallet;

    }

    /**
     * @name aggregateAllBalances
     * @param user 
     * @returns 
     */
    public async aggregateAllBalances(): Promise<IBalanceCount> {

        let result: IBalanceCount = { balance: 0, locked: 0, settlement: 0, count: 0, data: [] };

        const gpl: PipelineStage = {
            $group: {
                _id: null,
                balance: { $sum: "$balance.available" },
                locked: { $sum: "$balance.locked" },
                settlement: { $sum: "$balance.settlement" },
                count: { $sum: 1 },
                data: {
                    $push: {
                        createdAt: "$createdAt",
                        email: "$email",
                        walletID: "$walletID",
                        currency: "$currency"
                    }
                }
            }
        }

        const aggregated = await Wallet.aggregate([gpl]);

        if (aggregated[0]) {

            result.balance = aggregated[0].balance;
            result.settlement = aggregated[0].settlement;
            result.locked = aggregated[0].locked;
            result.data = aggregated[0].data;
            result.count = aggregated[0].count;

        }

        return result;

    }

}

export default new WalletRepository