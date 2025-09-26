import { arrayIncludes, dateToday, hasDecimal, isDefined, isNeg, isPrecise, isZero, notDefined, toDecimal } from '@btffamily/vacepay';
import { SwapRevenueFundsDTO, UpdateWalletRevenueDTO } from '../dtos/vace.dto';
import Business from '../models/Business.model';
import User from '../models/User.model';
import { IProviderDoc, IResult, ITransactionDoc, IVaceFee, IWalletDoc } from '../utils/types.util'
import BusinessService from './business.service';
import Provider from '../models/Provider.model';
import { ProviderNameType, TransactionFeatureType, ValueType } from '../utils/enums.util';
import BusinessRepository from '../repositories/business.repository';
import Wallet from '../models/Wallet.model';
import WalletRepository from '../repositories/wallet.repository';
import TransactionRepository from '../repositories/transaction.repository';

class VacepayService {

    public adminEmail: string;

    constructor() {

        if (!process.env.SUPERADMIN_EMAIL) {
            throw new Error('superadmin email ENV is not defined')
        }

        this.adminEmail = process.env.SUPERADMIN_EMAIL;

    }

    /**
     * @name validateSwapFunds
     * @param data 
     * @returns 
     */
    public async validateSwapFunds(data: SwapRevenueFundsDTO): Promise<IResult> {

        const allowed = ['available', 'locked']
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { amount, fromBalance, toBalance, password } = data;

        if (isZero(amount) || !amount) {
            result.error = true;
            result.message = 'amount is required and cannot be zero'
        } else if (hasDecimal(amount) && !isPrecise({ value: amount, length: 2 })) {
            result.error = true;
            result.message = 'amount is required to be in 2 decimal places'
        } else if (!fromBalance) {
            result.error = true;
            result.message = 'from balance is required'
        } else if (!arrayIncludes(allowed, fromBalance)) {
            result.error = true;
            result.message = `invalid from balance value. choose from ${allowed.join(', ')}`
        } else if (!toBalance) {
            result.error = true;
            result.message = 'to balance is required'
        } else if (!arrayIncludes(allowed, toBalance)) {
            result.error = true;
            result.message = `invalid to balance value. choose from ${allowed.join(', ')}`
        } else if (fromBalance === toBalance) {
            result.error = true;
            result.message = `source balance must not be equal to destination balance`
        } else if (!password) {
            result.error = true;
            result.message = `password is required`
        } else {
            result.error = false;
            result.message = ''
        }

        return result;

    }

    /**
     * @name getAdminUser
     * @returns 
     */
    public async getAdminUser(): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null };

        const user = await User.findOne({ email: this.adminEmail }).populate([
            {
                path: 'business', populate: [
                    { path: 'user' },
                    { path: 'wallet' },
                    {
                        path: 'accounts', populate: [
                            { path: 'provider' }
                        ]
                    }
                ]
            }
        ]);

        if (user) {
            result.data = user;
        } else {
            result.error = true;
            result.code = 500;
            result.message = 'user does not exist'
        }

        return result;

    }

    /**
     * @name getAdminBusiness
     * @returns 
     */
    public async getAdminBusiness(): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null };

        const business = await BusinessRepository.findBynameOrEmail(this.adminEmail, true)

        if (business) {
            result.data = business;
        } else {
            result.error = true;
            result.code = 500;
            result.message = 'business does not exist'
        }

        return result;

    }

    /**
     * @name getAdminWallet
     * @param populate 
     * @returns 
     */
    public async getAdminWallet(populate: boolean = false): Promise<IWalletDoc | null> {

        const wallet = await WalletRepository.findByEmail(this.adminEmail, populate);
        return wallet ? wallet : null;

    }

    /**
     * @name isVaceAcccount
     * @param data 
     * @returns 
     */
    public async isVaceAcccount(data: { provider: string, accountNo: string }): Promise<boolean> {

        let result: boolean = false;
        const { provider, accountNo } = data;

        const business = await Business.findOne({ email: this.adminEmail }).populate([
            {
                path: 'accounts', populate: [
                    { path: 'provider' }
                ]
            }
        ]);

        if (business) {

            const account = BusinessService.getAccontByProvider(business.accounts, provider);

            if (account.accountNo === accountNo) {
                result = true;
            }

        }

        return result;

    }

    /**
     * @name updateWalletRevenue
     * @param data 
     * @returns 
     */
    public async updateWalletRevenue(data: UpdateWalletRevenueDTO): Promise<IWalletDoc> {

        let provider: IProviderDoc | null = null;

        const { transaction, wallet, business } = data;

        const _wallet = await Wallet.findOne({ walletID: wallet.walletID })
        const transactionData = await TransactionRepository.findByReferenceAndSelectRevenue(transaction.reference, true)

        if (transactionData && _wallet) {

            if (transactionData.provider._id) {
                provider = await Provider.findOne({ _id: transactionData.provider._id })
            } else {
                provider = await Provider.findOne({ _id: transactionData.provider })
            }

            if (provider) {

                // get the platform revenue
                const revenue = transactionData.revenue.amount;

                // update locked wallet balance
                _wallet.balance.locked = _wallet.balance.locked + revenue;


                // update the settlement wallet balance
                if (transactionData.feature === TransactionFeatureType.PAYMENT_LINK) {

                    const vatCharge = transactionData.fee + transactionData.vatFee;
                    const amountFee = (transactionData.amount - vatCharge);
                    const amountToSettle = transaction.settle.amount;
                    _wallet.balance.settlement = _wallet.balance.settlement + amountToSettle;

                }

                // attach transaction to wallet
                if (!arrayIncludes(_wallet.transactions, transactionData._id.toString())) {
                    _wallet.transactions.push(transactionData._id);
                }

                // update inflow
                if (!isZero(revenue)) {

                    _wallet.inflow.count = _wallet.inflow.count + 1;
                    _wallet.inflow.value = _wallet.inflow.value + transactionData.fee;
                    _wallet.inflow.updatedAt = dateToday(Date.now()).ISO;

                }

                await _wallet.save();

            }

        }


        return wallet;

    }

    /**
     * @name updateWalletRevenueReversal
     * @param data 
     * @returns 
     */
    public async updateWalletRevenueReversal(data: UpdateWalletRevenueDTO): Promise<IWalletDoc> {

        let provider: IProviderDoc | null = null;

        const { transaction, wallet, business } = data;

        const _wallet = await Wallet.findOne({ walletID: wallet.walletID })
        const transactionData = await TransactionRepository.findByReferenceAndSelectRevenue(transaction.reference, true)

        if (transactionData && _wallet) {

            if (transactionData.provider._id) {
                provider = await Provider.findOne({ _id: transactionData.provider._id })
            } else {
                provider = await Provider.findOne({ _id: transactionData.provider })
            }

            if (provider) {

                // get the platform revenue
                const revenue = transactionData.revenue.reversed;
                let balance = _wallet.balance.locked - revenue;

                // update wallet balances
                _wallet.balance.locked = balance < 0 ? 0 : balance;

                // attach transaction to wallet
                if (!arrayIncludes(_wallet.transactions, transactionData._id.toString())) {
                    _wallet.transactions.push(transactionData._id);
                }

                await _wallet.save();

            }

        }


        return wallet;

    }

    /**
     * @name updateWalletSettlement
     * @param wallet 
     * @param amount 
     * @returns 
     */
    public async updateWalletSettlement(wallet: IWalletDoc, amount: number): Promise<IWalletDoc> {

        const _wallet = await Wallet.findOne({ walletID: wallet.walletID })

        if (_wallet) {

            // settlement
            const sBalance = _wallet.balance.settlement - amount;
            _wallet.balance.settlement = isNeg(sBalance) ? 0 : toDecimal(sBalance, 2);

            // update available balance
            const aBalance = _wallet.balance.available - amount;
            _wallet.balance.available = isNeg(aBalance) ? 0 : toDecimal(aBalance, 2);

            // save
            await _wallet.save();

            wallet = _wallet;

        }

        return wallet;

    }


}

export default new VacepayService();