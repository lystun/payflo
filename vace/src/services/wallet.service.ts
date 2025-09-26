import { UIID, arrayIncludes, dateToday, hasDecimal, isArray, isNeg, isPos, isPrecise, isZero, monthsOfYear, notDefined, strIncludesEs6, toDecimal } from '@btffamily/vacepay';
import { BuyAirtimeDTO, BuyDataeDTO, CheckBalanceDTO, CreateWalletDTO, ProcessInternalFundingDTO, ProcessInternalTransferDTO, ReverseMoneyToWalletDTO, SendInternalEmail, SendMoneyDTO, WalletGraphDTO, WithdrawMoneyCorpDTO, WithdrawMoneyDTO, WithdrawRevenueDTO } from '../dtos/wallet.dto';
import Wallet from '../models/Wallet.model';
import { BusinessType, FeatureType, PrefixType, ProviderNameType, TransactionFeatureType, TransactionStatus, UserType } from '../utils/enums.util';
import { IAccountDoc, IProviderDoc, IResult, ITransactionDoc, IUserDoc, IWalletDoc, IYearGraphData } from '../utils/types.util'
import { BaniWebhookDataDTO, PayBillsDTO } from '../dtos/providers/bani.dto';
import Business from '../models/Business.model';
import TransactionService from './transaction.service';
import SystemService from './system.service';
import EmailService from './email.service';
import Transaction from '../models/Transaction.model';
import BusinessService from './business.service';
import AccountService from './account.service';
import { PSBApiResponseDTO } from '../dtos/providers/ninepsb.dto';
import BankService from './bank.service';
import NinepsbService from './providers/ninepsb.service';
import { set } from 'mongoose';
import ProviderService from './provider.service';
import { updateRevenueReversalJob, updateVacepayRevenueJob } from '../queues/jobs/revenue.job';
import BusinessRepository from '../repositories/business.repository';
import TransactionRepository from '../repositories/transaction.repository';
import WalletRepository from '../repositories/wallet.repository';

interface IOverview {
    balance: number,
    locked: number,
    settlement: number,
    inflow: {
        value: number,
        count: number,
        updatedAt: string
    }
    outflow: {
        value: number,
        count: number,
        updatedAt: string
    }
    transfer: {
        value: number,
        count: number,
        updatedAt: string
    }
    withdrawal: {
        value: number,
        count: number,
        updatedAt: string
    }
    analytics: {
        revenue: {
            amount: number,
            count: number,
            totalAmount: number,
        },
        inflow: {
            amount: number,
            count: number,
            totalAmount: number,
        },
        expenses: {
            amount: number,
            count: number,
            totalAmount: number,
        }
    }
}

interface IGraphData {
    income: Array<IYearGraphData>,
    transactions: Array<IYearGraphData>
}

class WalletService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name validateSendMoney
     * @param data 
     * @returns 
     */
    public async validateSendMoney(data: SendMoneyDTO): Promise<IResult> {

        const allowedTypes = ['vacepay', 'account'];

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { amount, bank, users, type, pin } = data;

        if (!pin) {
            result.error = true;
            result.message = 'transaction pin is required';
            result.code = 400;
        } else if (!type) {
            result.error = true;
            result.message = 'transfer type is required';
            result.code = 400;
        } else if (!arrayIncludes(allowedTypes, type)) {
            result.error = true;
            result.message = `invalid type value. choose from ${allowedTypes.join(',')}`;
            result.code = 400;
        } else if (notDefined(amount) || isZero(amount)) {
            result.error = true;
            result.message = 'amount is required and cannot be zero';
            result.code = 400;
        } else if (!isPos(amount)) {
            result.error = true;
            result.message = 'amount is required and cannot be negative';
            result.code = 400;
        } else if (hasDecimal(amount) && !isPrecise({ value: amount, length: 2 })) {
            result.error = true;
            result.message = 'amount is required to have only 2 decimals';
            result.code = 400;
        } else if (type === 'vacepay' && notDefined(users)) {
            result.error = true;
            result.message = 'list of vacepay users is required';
            result.code = 400;
        } else if (type === 'vacepay' && !isArray(users)) {
            result.error = true;
            result.message = 'list of vacepay users is required to be array of user ids';
            result.code = 400;
        } else if (type === 'account' && notDefined(bank)) {
            result.error = true;
            result.message = 'bank details is required';
            result.code = 400;
        } else if (type === 'account' && bank && !bank.accountNo) {
            result.error = true;
            result.message = 'acount number is required';
            result.code = 400;
        } else if (type === 'account' && bank && !bank.bankCode) {
            result.error = true;
            result.message = 'bank code is required';
            result.code = 400;
        } else if (type === 'account' && bank && !bank.accountName) {
            result.error = true;
            result.message = 'account name is required';
            result.code = 400;
        } else {
            result.error = false;
            result.message = '';
            result.code = 200;
        }

        return result;

    }

    /**
     * @name validateSendMoneyCorp
     * @param data 
     * @returns 
     */
    public async validateSendMoneyCorp(data: SendMoneyDTO): Promise<IResult> {

        const allowedTypes = ['vacepay', 'account'];

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { amount, bank, users, type, pin } = data;

        if (!pin) {
            result.error = true;
            result.message = 'transaction pin is required';
            result.code = 400;
        } else if (!type) {
            result.error = true;
            result.message = 'transfer type is required';
            result.code = 400;
        } else if (!arrayIncludes(allowedTypes, type)) {
            result.error = true;
            result.message = `invalid type value. choose from ${allowedTypes.join(',')}`;
            result.code = 400;
        } else if (notDefined(amount) || isZero(amount)) {
            result.error = true;
            result.message = 'amount is required and cannot be zero';
            result.code = 400;
        } else if (!isPos(amount)) {
            result.error = true;
            result.message = 'amount is required and cannot be negative';
            result.code = 400;
        } else if (hasDecimal(amount) && !isPrecise({ value: amount, length: 2 })) {
            result.error = true;
            result.message = 'amount is required to have only 2 decimals';
            result.code = 400;
        } else if (type === 'vacepay' && notDefined(users)) {
            result.error = true;
            result.message = 'list of vacepay users is required';
            result.code = 400;
        } else if (type === 'vacepay' && !isArray(users)) {
            result.error = true;
            result.message = 'list of vacepay users is required to be array of user ids';
            result.code = 400;
        } else if (type === 'account' && notDefined(bank)) {
            result.error = true;
            result.message = 'bank details is required';
            result.code = 400;
        } else if (type === 'account' && bank && !bank.accountNo) {
            result.error = true;
            result.message = 'acount number is required';
            result.code = 400;
        } else if (type === 'account' && bank && !bank.bankCode) {
            result.error = true;
            result.message = 'bank code is required';
            result.code = 400;
        } else {
            result.error = false;
            result.message = '';
            result.code = 200;
        }

        return result;

    }

    /**
     * @name validateWithdrawMoney
     * @param data 
     * @returns 
     */
    public async validateWithdrawMoney(data: WithdrawMoneyDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { amount, bank, pin } = data;

        if (!pin) {
            result.error = true;
            result.message = 'transaction pin is required';
            result.code = 400;
        } else if (notDefined(amount) || isZero(amount)) {
            result.error = true;
            result.message = 'amount is required and cannot be zero';
            result.code = 400;
        } else if (isNeg(amount)) {
            result.error = true;
            result.message = 'amount is required and cannot be negative';
            result.code = 400;
        } else if (hasDecimal(amount) && !isPrecise({ value: amount, length: 2 })) {
            result.error = true;
            result.message = 'amount is required to have only 2 decimals';
            result.code = 400;
        } else if (!bank) {
            result.error = true;
            result.message = 'bank details is required';
            result.code = 400;
        } else if (!bank.accountNo) {
            result.error = true;
            result.message = 'account number is required';
            result.code = 400;
        } else if (!bank.bankCode) {
            result.error = true;
            result.message = 'bank code is required';
            result.code = 400;
        } else if (!bank.accountName) {
            result.error = true;
            result.message = 'account name is required';
            result.code = 400;
        } else {
            result.error = false;
            result.message = '';
            result.code = 200;
        }

        return result;

    }

    /**
     * @name validateWithdrawRevenue
     * @param data 
     * @returns 
     */
    public async validateWithdrawRevenue(data: WithdrawRevenueDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { amount, bank, password } = data;

        if (!password) {
            result.error = true;
            result.message = 'password is required';
            result.code = 400;
        } else if (notDefined(amount) || isZero(amount)) {
            result.error = true;
            result.message = 'amount is required and cannot be zero';
            result.code = 400;
        } else if (isNeg(amount)) {
            result.error = true;
            result.message = 'amount is required and cannot be negative';
            result.code = 400;
        } else if (hasDecimal(amount) && !isPrecise({ value: amount, length: 2 })) {
            result.error = true;
            result.message = 'amount is required to have only 2 decimals';
            result.code = 400;
        } else if (!bank.accountNo) {
            result.error = true;
            result.message = 'account number is required';
            result.code = 400;
        } else if (!bank.bankCode) {
            result.error = true;
            result.message = 'bank code is required';
            result.code = 400;
        } else if (!bank.accountName) {
            result.error = true;
            result.message = 'account name is required';
            result.code = 400;
        } else {
            result.error = false;
            result.message = '';
            result.code = 200;
        }

        return result;

    }

    /**
     * @name validateWithdrawMoneyCorp
     * @param data 
     * @returns 
     */
    public async validateWithdrawMoneyCorp(data: WithdrawMoneyCorpDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { amount, accountNo, pin } = data;

        if (!pin) {
            result.error = true;
            result.message = 'transaction pin is required';
            result.code = 400;
        } else if (notDefined(amount) || isZero(amount)) {
            result.error = true;
            result.message = 'amount is required and cannot be zero';
            result.code = 400;
        } else if (isNeg(amount)) {
            result.error = true;
            result.message = 'amount is required and cannot be negative';
            result.code = 400;
        } else if (hasDecimal(amount) && !isPrecise({ value: amount, length: 2 })) {
            result.error = true;
            result.message = 'amount is required to have only 2 decimals';
            result.code = 400;
        } else if (!accountNo) {
            result.error = true;
            result.message = 'account number is required';
            result.code = 400;
        } else {
            result.error = false;
            result.message = '';
            result.code = 200;
        }

        return result;

    }

    /**
     * @name validateWithdrawMoney
     * @param data 
     * @returns 
     */
    public async validateBuyAirTimme(data: BuyAirtimeDTO): Promise<IResult> {

        const allowedNetworks = ['glo', 'airtel', '9mobile', 'mtn', 'smile']

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { amount, phoneNumber, network, pin } = data;

        if (!phoneNumber) {
            result.error = true;
            result.message = 'customer phone number is required';
            result.code = 400;
        } else if (notDefined(amount) || isZero(amount)) {
            result.error = true;
            result.message = 'amount is required and cannot be zero';
            result.code = 400;
        } else if (!isPos(amount)) {
            result.error = true;
            result.message = 'amount is required and cannot be negative';
            result.code = 400;
        } else if (hasDecimal(amount) && !isPrecise({ value: amount, length: 2 })) {
            result.error = true;
            result.message = 'amount is required to have only 2 decimals';
            result.code = 400;
        } else if (!network) {
            result.error = true;
            result.message = 'network name is required';
            result.code = 400;
        } else if (!arrayIncludes(allowedNetworks, network.toString())) {
            result.error = true;
            result.message = `invalid network name. choose from ${allowedNetworks.join(', ')}`;
            result.code = 400;
        } else if (!pin) {
            result.error = true;
            result.message = 'transaction pin is required';
            result.code = 400;
        } else {
            result.error = false;
            result.message = '';
            result.code = 200;
        }

        return result;

    }

    /**
    * @name validateBuyData
    * @param data 
    * @returns 
    */
    public async validateBuyData(data: BuyDataeDTO): Promise<IResult> {

        const allowedNetworks = ['glo', 'airtel', '9mobile', 'mtn', 'smile']

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { amount, phoneNumber, dataId, pin } = data;

        if (!phoneNumber) {
            result.error = true;
            result.message = 'customer phone number is required';
            result.code = 400;
        } else if (notDefined(amount) || isZero(amount)) {
            result.error = true;
            result.message = 'amount is required and cannot be zero';
            result.code = 400;
        } else if (!isPos(amount)) {
            result.error = true;
            result.message = 'amount is required and cannot be negative';
            result.code = 400;
        } else if (hasDecimal(amount) && !isPrecise({ value: amount, length: 2 })) {
            result.error = true;
            result.message = 'amount is required to have only 2 decimals';
            result.code = 400;
        } else if (!dataId) {
            result.error = true;
            result.message = 'dataId is required and must be an integer';
            result.code = 400;
        } else if (!pin) {
            result.error = true;
            result.message = 'transaction pin is required';
            result.code = 400;
        } else {
            result.error = false;
            result.message = '';
            result.code = 200;
        }

        return result;

    }

    /**
     * @name validatePayBill
     * @param data 
     * @returns 
     */
    public async validatePayBill(data: PayBillsDTO): Promise<IResult> {

        const allowedTypes = ['cable', 'utility', 'other']
        let result: IResult = { error: false, message: '', code: 200, data: null }

        const { itemId, pin, customerId, phoneNumber, amount, type } = data;

        if (!type) {
            result.error = true;
            result.message = 'bill type is required';
        } else if (!arrayIncludes(allowedTypes, type)) {
            result.error = true;
            result.message = `invalid bill type value. choose from ${allowedTypes.join(', ')}`;
        } else if (notDefined(amount) || isZero(amount)) {
            result.error = true;
            result.message = 'amount is required and cannot be zero';
            result.code = 400;
        } else if (!isPos(amount)) {
            result.error = true;
            result.message = 'amount is required and cannot be negative';
            result.code = 400;
        } else if (hasDecimal(amount) && !isPrecise({ value: amount, length: 2 })) {
            result.error = true;
            result.message = 'amount is required to have only 2 decimals';
            result.code = 400;
        } else if (!customerId) {
            result.error = true;
            result.message = `${type === 'cable' ? 'smart card number is required' : 'customer id is required'}`;
            result.code = 400;
        } else if (!itemId) {
            result.error = true;
            result.message = 'bill itme id is required';
            result.code = 400;
        } else if (!phoneNumber) {
            result.error = true;
            result.message = 'a valid phone number is required';
            result.code = 400;
        } else if (!pin) {
            result.error = true;
            result.message = 'transaction pin is required';
            result.code = 400;
        } else {
            result.error = false;
            result.message = '';
            result.code = 200;
        }

        return result;

    }


    /**
     * @name createWallet
     * @param data 
     * @returns 
     */
    public async createWallet(data: CreateWalletDTO): Promise<IWalletDoc> {

        const { business, currency } = data;

        const _exist = await Wallet.findOne({ business: business._id });

        if (_exist) {
            return _exist;
        } else {

            const code = `${PrefixType.WALLET}${UIID(2)}`;

            const wallet = await Wallet.create({
                walletID: code.toString(),
                currency: currency ? currency : 'NGN',
                email: business.email,
                balance: {
                    available: 0.00,
                    locked: 0.00
                },
                transfer: {
                    value: 0.00,
                    count: 0
                },
                withdrawal: {
                    value: 0.00,
                    count: 0
                },
                business: business._id,
            })

            business.wallet = wallet._id;
            await business.save()

            return wallet;

        }

    }

    /**
     * @name checkBalance
     * @param data 
     * @returns 
     */
    public async checkBalance(data: CheckBalanceDTO): Promise<boolean> {

        let result: boolean = false;
        const { provider, wallet, amount, type, category, frequency, settings } = data;

        const userWallet = await Wallet.findOne({ _id: wallet._id });

        if (userWallet) {

            let calculatedFee = await ProviderService.calculateFee({ amount, provider, settings, type, category });
            let freq = frequency ? frequency : 1;

            const vatAmount = (parseFloat(amount.toString()) + parseFloat(calculatedFee.fee.toString())) + calculatedFee.vat;

            const totalAmount = vatAmount * freq;

            if (userWallet.balance.available > totalAmount || userWallet.balance.available === totalAmount) {
                result = true
            } else {
                result = false;
            }

        }

        return result;

    }

    /**
     * @name updateBankInflow
     * @param wallet 
     * @param amount 
     * @returns 
     */
    public async updateBankInflow(wallet: IWalletDoc, transaction: ITransactionDoc, calculate: boolean = true): Promise<IWalletDoc> {

        const _wallet = await Wallet.findOne({ _id: wallet._id });
        const _transaction = await TransactionRepository.findByReference(transaction.reference, false);

        if (_wallet && _transaction &&
            (transaction.feature === TransactionFeatureType.BANK_ACCOUNT ||
                transaction.feature === TransactionFeatureType.INTERNAL_CREDIT)) {

            const combinedFee = _transaction.fee + _transaction.stampFee + _transaction.vatFee;
            const deductedFee = _transaction.amount - combinedFee // deduct Fee, Stamp-Duty fee and Vat fee
            const amountFee = calculate ? deductedFee : _transaction.amount;

            // update wallet balance
            let balance = _wallet.balance.available + amountFee
            _wallet.balance.available = toDecimal(balance, 2);

            // update inflow details
            let inflow = _wallet.inflow.value + amountFee;

            _wallet.inflow.count += 1;
            _wallet.inflow.value = toDecimal(inflow, 2)
            _wallet.inflow.updatedAt = dateToday(Date.now()).ISO;
            await _wallet.save();

            // update transaction
            transaction.balance.final = _wallet.balance.available;
            await transaction.save();

            // run queue job that processes updating vacepay revenue
            // updateVacepayRevenueJob(transaction);


            return wallet;

        } else {

            return wallet;

        }



    }

    /**
     * @name updateWalletSettledAmount
     * @description Updates wallet with settled amount after settlement is run
     * @param wallet 
     * @param transaction 
     * @returns 
     */
    public async updateWalletSettledAmount(wallet: IWalletDoc, transaction: ITransactionDoc): Promise<IWalletDoc> {

        const _wallet = await Wallet.findOne({ _id: wallet._id });

        if (_wallet) {

            const amountFee = (transaction.amount - transaction.fee)
            let balance = _wallet.balance.available + amountFee;

            _wallet.balance.available = toDecimal(balance, 2);
            let inflow = _wallet.inflow.value + amountFee;

            _wallet.inflow.count += 1;
            _wallet.inflow.value = toDecimal(inflow, 2);
            _wallet.inflow.updatedAt = dateToday(Date.now()).ISO;
            await _wallet.save();

            return _wallet

        } else {

            return wallet;

        }

    }

    /**
     * @name deductFromSettlement
     * @description Deducts settled amount from settlement balance
     * @param wallet 
     * @param amount 
     * @returns 
     */
    public async deductFromSettlement(wallet: IWalletDoc, amount: number): Promise<IWalletDoc> {

        const _wallet = await Wallet.findOne({ _id: wallet._id });

        if (_wallet) {

            let balance = _wallet.balance.settlement - amount;
            _wallet.balance.settlement = balance < 0 ? 0 : toDecimal(balance, 2);
            await _wallet.save();

            return _wallet

        } else {
            return wallet;
        }

    }

    /**
     * @name updateSettlementInflow
     * @description Updates wallet with settlement amount less the transaction fee + VAT
     * @param wallet 
     * @param transaction 
     * @returns 
     */
    public async updateSettlementInflow(wallet: IWalletDoc, transaction: ITransactionDoc): Promise<IWalletDoc> {

        const _wallet = await Wallet.findOne({ _id: wallet._id })

        if (_wallet && transaction.feature === TransactionFeatureType.PAYMENT_LINK) {

            const vatCharge = transaction.fee + transaction.vatFee;
            const amountFee = transaction.amount - vatCharge;
            const amountToSettle = transaction.settle.amount;

            let balance = _wallet.balance.settlement + amountToSettle;
            _wallet.balance.settlement = toDecimal(balance, 2);

            let inflow = _wallet.inflow.value + amountToSettle;

            _wallet.inflow.count += 1;
            _wallet.inflow.value = toDecimal(inflow, 2);
            _wallet.inflow.updatedAt = dateToday(Date.now()).ISO;

            await _wallet.save();

            // run queue job that processes updating vacepay revenue
            // updateVacepayRevenueJob(transaction);

            return _wallet;

        } else {
            return wallet;
        }

    }

    /**
     * @name updateWalletOutflow
     * @param wallet 
     * @param amount 
     * @returns 
     */
    public async updateWalletOutflow(wallet: IWalletDoc, transaction: ITransactionDoc): Promise<IWalletDoc> {

        const _wallet = await Wallet.findOne({ _id: wallet._id })

        if (_wallet) {

            const vatCharge = transaction.fee + transaction.vatFee;
            const amountFee = transaction.amount + vatCharge;
            let balance = _wallet.balance.available - amountFee;

            // update wallet balance
            _wallet.balance.available = toDecimal(balance, 2);
            await _wallet.save();

            if (transaction.feature === TransactionFeatureType.WALLET_WITHDRAW) {

                let outflow = _wallet.withdrawal.value + amountFee;

                // update inflow-details
                _wallet.withdrawal.count += 1;
                _wallet.withdrawal.value = toDecimal(outflow, 2)
                _wallet.withdrawal.updatedAt = dateToday(Date.now()).ISO;
            }

            if ((transaction.feature === TransactionFeatureType.WALLET_TRANSFER) ||
                (transaction.feature === TransactionFeatureType.WALLET_REFUND)) {

                let outflow = _wallet.transfer.value + amountFee;

                // update inflow-details
                _wallet.transfer.count += 1;
                _wallet.transfer.value = toDecimal(outflow, 2)
                _wallet.transfer.updatedAt = dateToday(Date.now()).ISO;
            }

            await _wallet.save();

            // update transaction
            transaction.balance.final = _wallet.balance.available;
            await transaction.save();

            // run queue job that processes updating vacepay revenue
            // updateVacepayRevenueJob(transaction);

            return _wallet;

        } else {
            return wallet
        }

    }

    /**
     * @name updateAdminWalletOutflow
     * @param wallet 
     * @param transaction 
     * @returns 
     */
    public async updateAdminWalletOutflow(wallet: IWalletDoc, transaction: ITransactionDoc): Promise<IWalletDoc> {

        const _wallet = await Wallet.findOne({ _id: wallet._id });

        if (_wallet) {

            const amountFee = (transaction.amount + transaction.fee)
            let balance = _wallet.balance.available - amountFee;

            // update wallet balance
            _wallet.balance.available = toDecimal(balance, 2);

            if (transaction.feature === TransactionFeatureType.WALLET_WITHDRAW) {

                let outflow = _wallet.withdrawal.value + amountFee;

                // update inflow-details
                _wallet.withdrawal.count += 1;
                _wallet.withdrawal.value = toDecimal(outflow, 2)
                _wallet.withdrawal.updatedAt = dateToday(Date.now()).ISO;

            }

            await _wallet.save();

            // update transaction
            transaction.balance.final = _wallet.balance.available;
            await transaction.save();

            return _wallet;

        } else {

            return wallet;

        }


    }

    /**
     * @name updateWalletVASOutflow
     * @description Updates wallet, taking out transaction amount without fee and VAT
     * @param wallet 
     * @param amount 
     * @returns 
     */
    public async updateWalletVASOutflow(wallet: IWalletDoc, transaction: ITransactionDoc): Promise<IWalletDoc> {

        const _wallet = await Wallet.findOne({ _id: wallet._id });

        if (_wallet) {

            const amountFee = transaction.amount;
            let balance = _wallet.balance.available - amountFee;
            let outflow = _wallet.outflow.value + amountFee;

            _wallet.balance.available = toDecimal(balance, 2);

            _wallet.outflow.count += 1;
            _wallet.outflow.value = toDecimal(outflow, 2);
            _wallet.outflow.updatedAt = dateToday(Date.now()).ISO;
            await _wallet.save();

            // update transaction
            transaction.balance.final = _wallet.balance.available;
            await transaction.save();

            // run queue job that processes updating vacepay revenue
            // updateVacepayRevenueJob(transaction);

            return _wallet;

        } else {

            return wallet;
        }



    }

    /**
     * @name updateWalletReversal
     * @description Updates wallet with transaction amount reversed
     * @param wallet 
     * @param transaction 
     * @returns 
     */
    public async updateWalletReversal(wallet: IWalletDoc, transaction: ITransactionDoc): Promise<IWalletDoc> {

        let amount: number = 0;
        const _wallet = await Wallet.findOne({ _id: wallet._id });

        if (_wallet) {

            if (transaction.feature !== TransactionFeatureType.WALLET_VAS &&
                transaction.feature !== TransactionFeatureType.WALLET_AIRTIME,
                transaction.feature !== TransactionFeatureType.WALLET_DATA &&
                transaction.feature !== TransactionFeatureType.WALLET_BILL
            ) {
                amount = transaction.amount + (transaction.fee + transaction.vatFee)
            } else {
                amount = transaction.amount;
            }

            let balance = _wallet.balance.available + amount; // fee is added here
            let reverse = _wallet.reversal.value + amount;

            // update wallet balance
            _wallet.balance.available = toDecimal(balance, 2);

            // update reversal details
            _wallet.reversal.count += 1;
            _wallet.reversal.value = toDecimal(reverse, 2);
            _wallet.reversal.updatedAt = dateToday(Date.now()).ISO;
            await _wallet.save();

            // update transaction 
            transaction.balance.final = _wallet.balance.available;
            await transaction.save();

            updateRevenueReversalJob(transaction) // revererse revenue

            return _wallet

        } else {

            return wallet;

        }


    }

    /**
     * @name sendCreditTransferEmail
     * @param data 
     */
    public async sendCreditTransferEmail(data: SendInternalEmail): Promise<void> {

        const { transaction, business, account, paymentLink, invoice, product, user, wallet } = data;

        if (transaction.feature === TransactionFeatureType.PAYMENT_LINK && paymentLink) {

            // create notification
            let message = `Incoming payment of ${transaction.amount.toLocaleString()} via your payment link ${paymentLink.name} was successful.`;
            let title = `Incoming payment via ${paymentLink.name}`;
            let smsMessage = `NGN${transaction.amount.toLocaleString()} was paid by ${transaction.customer.firstName} ${transaction.customer.lastName} via payment link.`;
            await SystemService.syncNatsData({ message, title, smsMessage, email: user ? user.email : business.email }, 'notification.created', 'type.notification');

            // send email
            await EmailService.sendPaymentLinkEmail({
                driver: 'zepto',
                business: business,
                account: account,
                template: 'payment_link',
                transaction: transaction,
                options: {
                    subject: 'Incoming payment successful',
                    salute: `${business.name}`,
                    bodyOne: `Incoming payment via your payment link - ${paymentLink.name} was successful`,
                    buttonText: 'View Payment',
                    buttonUrl: 'view'
                }
            });

        } else {

            // create notification
            let message = `Incoming payment of NGN${transaction.amount.toLocaleString()} to your Vacepay account number was successful.`;
            let title = `Your Vacepay account number was credited`;
            let smsMessage = `Your Vacepay account ${account.accountNo} was credited with NGN${transaction.amount.toLocaleString()}`;
            await SystemService.syncNatsData({ message, title, smsMessage, email: user ? user.email : business.email }, 'notification.created', 'type.notification');


            if (transaction.feature === TransactionFeatureType.BANK_ACCOUNT) {

                // send email
                await EmailService.sendBankInflowEmail({
                    driver: 'zepto',
                    business: business,
                    account: account,
                    template: 'wallet_credit',
                    transaction: transaction,
                    wallet: wallet,
                    options: {
                        subject: 'Wallet funded successfully',
                        salute: `${business.name}`,
                        bodyOne: `Your wallet was funded successfully. Please find the details of the transaction below`,
                        buttonText: 'View Payment',
                        buttonUrl: 'view'
                    }
                });

            } else {

                // send email
                await EmailService.sendBankInflowEmail({
                    driver: 'zepto',
                    business: business,
                    account: account,
                    template: 'wallet_credit',
                    transaction: transaction,
                    wallet: wallet,
                    options: {
                        subject: 'Wallet funded successfully',
                        salute: `${business.name}`,
                        bodyOne: `Your wallet was funded successfully. Please find the details of the transaction below`,
                        buttonText: 'View Payment',
                        buttonUrl: 'view'
                    }
                });

            }

        }


    }

    /**
     * @name sendBankSettledEmail
     * @param data 
     */
    public async sendBankSettledEmail(data: SendInternalEmail): Promise<void> {

        const { transaction, business, account, paymentLink, invoice, product, user, wallet } = data;

        // create notification
        let message = `NGN${transaction.amount.toLocaleString()} was credited into your bank ${business.bank.accountNo} | ${business.bank.accountName}`;
        let title = `Settlement Successful`;
        let smsMessage = `Your settlement bank account ${account.accountNo} was credited with NGN${transaction.amount.toLocaleString()}`;
        await SystemService.syncNatsData({ message, title, smsMessage, email: user ? user.email : business.email }, 'notification.created', 'type.notification');

        // send email
        await EmailService.sendBankSettledEmail({
            driver: 'zepto',
            business: business,
            account: account,
            template: 'bank_credited',
            transaction: transaction,
            wallet: wallet,
            options: {
                subject: 'Settlement completed',
                salute: `${business.name}`,
                bodyOne: `Your settlement bank account was credited for pending settlement successfully. Please find the details of the transaction below`,
                buttonText: 'View Details',
                buttonUrl: 'view'
            }
        });


    }

    /**
     * @name sendDebitTransferEmail
     * @param data 
     */
    public async sendDebitTransferEmail(data: SendInternalEmail): Promise<void> {

        const { transaction, business, account, recipientAccount, user, wallet } = data;

        if (recipientAccount) {
            // create notification
            let message = `Your Vacepay wallet got debited of ${transaction.amount.toLocaleString()} and remitted to ${recipientAccount?.accountNo} | ${recipientAccount?.accountName}`;
            let title = `Transfer successful`;
            await SystemService.syncNatsData({ message, title, email: business.email }, 'notification.created', 'type.notification');

            // send email
            await EmailService.sendWalletOutflowEmail({
                driver: 'zepto',
                business: business,
                account: account,
                template: 'wallet_debit',
                transaction: transaction,
                wallet: wallet,
                options: {
                    subject: 'Wallet debited successfully',
                    salute: `${business.name}`,
                    bodyOne: `Your walled was debited successfully. Please find the details of the transaction below`,
                    buttonText: 'View Details',
                    buttonUrl: 'view'
                }
            })

        } else {

            if (transaction.feature === TransactionFeatureType.WALLET_VAS ||
                transaction.feature === TransactionFeatureType.WALLET_AIRTIME ||
                transaction.feature === TransactionFeatureType.WALLET_DATA ||
                transaction.feature === TransactionFeatureType.WALLET_BILL) {

                let vasName = '';

                if (transaction.feature === TransactionFeatureType.WALLET_VAS) {
                    vasName = 'bills payment';
                } else if (transaction.feature === TransactionFeatureType.WALLET_AIRTIME) {
                    vasName = 'airtime purchase';
                } else if (transaction.feature === TransactionFeatureType.WALLET_DATA) {
                    vasName = 'data topup';
                } else if (transaction.feature === TransactionFeatureType.WALLET_BILL) {
                    vasName = 'bills payment';
                } else {
                    vasName = 'bills payment';
                }

                // create notification
                let message = `Your Vacepay wallet got debited of ${transaction.amount.toLocaleString()} for ${vasName}.`;
                let title = ProviderService.decodeNotificationTitle(transaction.feature)
                let smsMessage = `${title} on your Vacepay wallet ${account.accountNo} was successfull. Amount: NGN${transaction.amount.toLocaleString()}`;
                await SystemService.syncNatsData({ message, smsMessage, title, email: user ? user.email : business.email }, 'notification.created', 'type.notification');

                // send email
                await EmailService.sendWalletOutflowEmail({
                    driver: 'zepto',
                    business: business,
                    account: account,
                    template: 'wallet_debit',
                    transaction: transaction,
                    wallet: wallet,
                    options: {
                        subject: 'Wallet debited successfully',
                        salute: `${business.name}`,
                        bodyOne: `Your walled was debited successfully. Please find the details of the transaction below`,
                        buttonText: 'View Details',
                        buttonUrl: 'view'
                    }
                })


            } else {

                // create notification
                let message = `Your Vacepay wallet got debited of ${transaction.amount.toLocaleString()} and remitted to ${transaction.bank.accountNo}|${transaction.bank.accountName}`;
                let title = ProviderService.decodeNotificationTitle(transaction.feature)
                let smsMessage = `${title} on your Vacepay wallet ${account.accountNo}. Amount: NGN${transaction.amount.toLocaleString()}`;
                await SystemService.syncNatsData({ message, title, smsMessage, email: user ? user.email : business.email }, 'notification.created', 'type.notification');

                // send email
                await EmailService.sendWalletOutflowEmail({
                    driver: 'zepto',
                    business: business,
                    account: account,
                    template: 'wallet_debit',
                    transaction: transaction,
                    wallet: wallet,
                    options: {
                        subject: 'Wallet debited successfully',
                        salute: `${business.name}`,
                        bodyOne: `Your walled was debited successfully. Please find the details of the transaction below`,
                        buttonText: 'View Details',
                        buttonUrl: 'view'
                    }
                })

            }

        }

    }

    /**
     * @name sendWalletReversalEmail
     * @param data 
     */
    public async sendWalletReversalEmail(data: SendInternalEmail): Promise<void> {

        const { transaction, business, account, user, wallet } = data;

        if (transaction.feature === TransactionFeatureType.WALLET_REVERSAL) {

            // create notification
            let message = `Transaction unsuccessful. Your Vacepay wallet got credited with ${transaction.amount.toLocaleString()}.`;
            let title = ProviderService.decodeNotificationTitle(transaction.feature)
            let smsMessage = `${title} on your Vacepay wallet ${account.accountNo} was unsuccessful. your vacepay account has been credited with NGN${transaction.amount.toLocaleString()}`;
            await SystemService.syncNatsData({ message, smsMessage, title, email: user ? user.email : business.user }, 'notification.created', 'type.notification');

            // send email
            await EmailService.sendWalletReversalEmail({
                driver: 'zepto',
                business: business,
                account: account,
                template: 'wallet_reversal',
                transaction: transaction,
                wallet: wallet,
                options: {
                    subject: 'Wallet credited successfully',
                    salute: `${business.name}`,
                    bodyOne: `Your walled was credited successfully. Please find the details of the transaction below`,
                    buttonText: 'View Details',
                    buttonUrl: 'view'
                }
            });

        }

    }

    /**
     * @name processInternalTransfer
     * @param data 
     * @returns 
     */
    public async processInternalTransfer(data: ProcessInternalTransferDTO): Promise<IResult> {

        let resultList: Array<any> = [];
        let psbsender: PSBApiResponseDTO | null = null;
        let result: IResult = { error: false, message: '', code: 200, data: [] }

        const { business, recipients, amount, wallet, account, provider, providerName, reference } = data;
        let sourceWallet = wallet;

        if (provider.name === ProviderNameType.BANI) {

            for (let i = 0; recipients.length; i++) {

                let recipient = await Business.findOne({ _id: recipients[i] }).populate([
                    { path: 'wallet' },
                    {
                        path: 'accounts', populate: [
                            { path: 'provider' }
                        ]
                    }
                ]);

                if (recipient) {

                    let recipientWallet: IWalletDoc = recipient.wallet;
                    let recipientAccount: IAccountDoc = BusinessService.getAccontByProvider(recipient.accounts, providerName);
                    let recipientProvider: IProviderDoc = recipientAccount.provider;

                    if (recipientWallet && recipientAccount && recipientProvider) {

                        // create transaction for recipient
                        let recipientTxn = await TransactionService.createInternalTransaction({
                            business: recipient!,
                            provider: recipientProvider,
                            wallet: recipientWallet,
                            _sender: business,
                            _account: account,
                            amount: amount,
                            isWebhook: false,
                            reference: TransactionService.generateRef(),
                            merchantRef: reference,
                            type: 'credit',
                            feature: TransactionFeatureType.INTERNAL_CREDIT
                        })

                        // update inflow for recipient
                        let updatedWallet = await this.updateBankInflow(recipientWallet, recipientTxn);
                        await AccountService.updateBankInflow(recipientAccount, recipientTxn);

                        // create notification to notify recipient
                        await this.sendCreditTransferEmail({
                            business: recipient!,
                            account: recipientAccount,
                            transaction: recipientTxn,
                            recipientAccount,
                            wallet: updatedWallet,
                        })

                        // create transaction for business ( source )
                        let sourceTxn = await TransactionService.createInternalTransaction({
                            business: business,
                            provider: provider,
                            wallet: wallet,
                            _sender: business,
                            _account: recipientAccount,
                            amount: amount,
                            isWebhook: false,
                            reference: TransactionService.generateRef(),
                            merchantRef: reference,
                            type: 'debit',
                            feature: TransactionFeatureType.INTERNAL_DEBIT
                        });

                        // update outflow for business ( source )
                        sourceWallet = await this.updateWalletOutflow(sourceWallet, sourceTxn);
                        await AccountService.updateAccountOutflow(account, sourceTxn);

                        // create notification to notify recipient
                        await this.sendDebitTransferEmail({
                            business: business,
                            account: account,
                            transaction: sourceTxn,
                            recipientAccount,
                            wallet: sourceWallet
                        });

                        resultList.push({
                            accountName: recipientAccount.accountName,
                            accountNo: recipientAccount.accountNo,
                            recipientBalance: updatedWallet.balance.available,
                            sourceBalance: sourceWallet.balance.available,
                            sourceTransaction: sourceTxn,
                            recipientTransaction: recipientTxn,
                            amount: amount
                        });

                    } else {

                        //TODO: Log error audit here

                    }

                }

                if (resultList.length === recipients.length) {
                    break;
                }

            }

        }

        if (provider.name === ProviderNameType.NINEPSB) {

            result = await BankService.resolveBankAccount({
                accountNo: NinepsbService.bankAccount,
                bankCode: NinepsbService.bankCode,
                name: provider.name
            });

            if (!result.error) {
                psbsender = result.data;
            }

            if (result.error === false && psbsender) {

                for (let i = 0; recipients.length; i++) {

                    let recipient = await Business.findOne({ _id: recipients[i] }).populate([
                        { path: 'wallet' },
                        {
                            path: 'accounts', populate: [
                                { path: 'provider' }
                            ]
                        }
                    ]);

                    if (recipient) {

                        let recipientWallet: IWalletDoc = recipient.wallet;
                        let recipientAccount: IAccountDoc = recipient.accounts[0];
                        let recipientProvider: IProviderDoc = recipientAccount.provider;

                        if (recipientWallet && recipientAccount && recipientProvider) {

                            let txnref = TransactionService.generateRef(); // generate transaction reference

                            // create transaction for recipient
                            let recipientTxn = await TransactionService.createInternalTransaction({
                                business: recipient!,
                                provider: recipientProvider,
                                wallet: recipientWallet,
                                _sender: business,
                                _account: account,
                                amount: amount,
                                isWebhook: false,
                                reference: txnref,
                                merchantRef: reference,
                                type: 'credit',
                            })

                            // process fund bank account with NINEPSB
                            result = await NinepsbService.fundBankAccount({
                                type: "fund-normal",
                                reference: txnref,
                                amount,
                                recipient: {
                                    accountNo: recipientAccount.accountNo,
                                    bankCode: recipientAccount.bank.bankCode,
                                    accountName: recipientAccount.accountName,
                                },
                                sender: {
                                    accountName: psbsender.customer.account.name,
                                    accountNo: psbsender.customer.account.number
                                },
                                description: `incoming payment of NGN${amount.toLocaleString()} to ${recipientAccount.accountNo} | ${recipientAccount.accountName}`
                            });

                            // create transaction for business ( source )
                            let sourceTxn = await TransactionService.createInternalTransaction({
                                business: business,
                                provider: provider,
                                wallet: wallet,
                                _sender: business,
                                _account: recipientAccount,
                                amount: amount,
                                isWebhook: false,
                                reference: TransactionService.generateRef(),
                                merchantRef: reference,
                                type: 'debit',
                            });

                            // update outflow for business ( source )
                            sourceWallet = await this.updateWalletOutflow(sourceWallet, sourceTxn);
                            await AccountService.updateAccountOutflow(account, sourceTxn);

                            // create notification to notify source
                            await this.sendDebitTransferEmail({
                                business: business,
                                account: account,
                                transaction: sourceTxn,
                                recipientAccount,
                                wallet: sourceWallet
                            });

                            resultList.push({
                                accountName: recipientAccount.accountName,
                                accountNo: recipientAccount.accountNo,
                                recipientBalance: recipientWallet.balance.available + amount,
                                sourceBalance: sourceWallet.balance.available,
                                sourceTransaction: sourceTxn,
                                recipientTransaction: recipientTxn,
                                amount: amount
                            });

                        } else {

                            //TODO: Log error audit here

                        }

                    }

                }

            }


        }

        return result;

    }

    /**
     * @name processInternalFunding
     * @param data 
     * @returns 
     */
    public async processInternalFunding(data: ProcessInternalFundingDTO): Promise<IResult> {

        let resultList: Array<any> = [],
            psbsender: PSBApiResponseDTO | null = null;
        let result: IResult = { error: false, message: '', code: 200, data: [] }

        const { recipients, amount, providerName, adminBusiness, adminWallet, adminProvider, adminAccount } = data;

        if (result.error === false) {

            for (let i = 0; recipients.length; i++) {

                let business = await BusinessRepository.findById(recipients[i], true)

                if (business) {

                    let wallet: IWalletDoc = business.wallet;
                    let account: IAccountDoc = BusinessService.getAccontByProvider(business.accounts, providerName);
                    let provider: IProviderDoc = account.provider;

                    if (wallet && account && provider) {

                        // create transaction for recipient
                        let transaction = await TransactionService.createFundingTransaction({
                            business: business,
                            provider: provider,
                            wallet: wallet,
                            account: account,
                            amount: amount,
                            isWebhook: false,
                            reference: TransactionService.generateRef(),
                            type: 'credit',
                            feature: TransactionFeatureType.INTERNAL_CREDIT
                        })

                        // update inflow for recipient
                        let updatedWallet = await this.updateBankInflow(wallet, transaction);
                        await AccountService.updateBankInflow(account, transaction);

                        // create notification to notify recipient
                        await this.sendCreditTransferEmail({
                            business,
                            account,
                            transaction,
                            wallet: updatedWallet
                        });

                        // create debit transaction for admin
                        let adTransaction = await TransactionService.createFundingTransaction({
                            business: adminBusiness,
                            provider: adminProvider,
                            wallet: adminWallet,
                            account: account,
                            amount: amount,
                            isWebhook: false,
                            reference: TransactionService.generateRef(),
                            type: 'debit',
                            feature: TransactionFeatureType.INTERNAL_DEBIT
                        })

                        // update outflow for admin
                        await this.updateWalletOutflow(adminWallet, adTransaction);
                        await AccountService.updateBankInflow(adminAccount, adTransaction);

                        resultList.push({
                            accountName: account.accountName,
                            accountNo: account.accountNo,
                            balance: updatedWallet.balance.available,
                            amount: amount,
                            reference: transaction.reference
                        });


                    }

                }

                if ((i + 1) === recipients.length) {
                    break;
                }

            }

        }

        result.data = resultList;
        return result;

    }

    /**
     * @name reverseMoneyToWallet
     * @param data 
     * @returns 
     */
    public async reverseMoneyToWallet(data: ReverseMoneyToWalletDTO): Promise<ITransactionDoc> {

        let result: IResult = { error: false, message: '', code: 200, data: [] }

        const { account, provider, transaction, wallet, business, isWebhook, addFee } = data;
        const reference = TransactionService.generateRef();

        if (provider.name === ProviderNameType.BANI) {

            const newTransaction = await TransactionService.createReversalTransaction({
                type: 'credit',
                isWebhook: isWebhook,
                provider: provider,
                reference: reference,
                status: TransactionStatus.SUCCESSFUL,
                transaction: transaction,
                wallet: wallet,
                business: business,
                feature: TransactionFeatureType.WALLET_REVERSAL,
                addFee: addFee
            });

            // reverse money back to user's wallet
            const userWallet = await this.updateWalletReversal(wallet, newTransaction)
            await AccountService.updateBankInflow(account, newTransaction);

            // update initial transaction
            transaction.balance.final = userWallet.balance.available;
            await transaction.save();

            // send email
            await this.sendWalletReversalEmail({
                account,
                business,
                transaction: newTransaction,
                wallet: userWallet
            });

            result.data = newTransaction;

        }

        if (provider.name === ProviderNameType.NINEPSB) {

            const newTransaction = await TransactionService.createReversalTransaction({
                type: 'credit',
                isWebhook: isWebhook,
                provider: provider,
                reference: reference,
                status: TransactionStatus.SUCCESSFUL,
                transaction: transaction,
                wallet: wallet,
                business: business,
                feature: TransactionFeatureType.WALLET_REVERSAL,
                addFee: addFee
            });

            // reverse money back to user's wallet
            const userWallet = await this.updateWalletReversal(wallet, newTransaction)
            await AccountService.updateBankInflow(account, newTransaction);

            // update initial transaction
            transaction.balance.final = userWallet.balance.available;
            await transaction.save();

            // send email
            await this.sendCreditTransferEmail({
                account,
                business,
                transaction: newTransaction,
                wallet: userWallet
            })

            result.data = newTransaction;

        }

        return result.data;

    }

    /**
     * @name getOverview
     * @param user 
     * @returns 
     */
    public async getOverview(user: IUserDoc): Promise<IOverview> {

        let result: any = {};

        if (user.userType === UserType.ADMIN || user.userType === UserType.SUPER) {

            // get analytics
            const revenue = await TransactionRepository.aggregateDailyRevenue(user);
            const expenses = await TransactionRepository.aggregateDailyExpense(user);
            const inflow = await TransactionRepository.aggregateDailyInflow(user);
            const balances = await WalletRepository.aggregateAllBalances();

            result.analytics = {
                revenue,
                expenses,
                inflow
            },
            
            result.balances = {
                balance: balances.balance,
                locked: balances.locked,
                settlement: balances.settlement,
                count: balances.count,
            };

        } else if (user.userType === UserType.BUSINESS) {

            const wallet = await Wallet.findOne({ business: user._id });

            if (wallet) {

                result.balance = wallet.balance.available;
                result.settlement = wallet.balance.settlement;
                result.locked = wallet.balance.locked;
                result.inflow = wallet.inflow;
                result.outflow = wallet.outflow;
                result.transfer = wallet.transfer;
                result.withdrawal = wallet.withdrawal;

                // get analytics
                const revenue = await TransactionRepository.aggregateDailyRevenue(user);
                const expenses = await TransactionRepository.aggregateDailyExpense(user);
                const inflow = await TransactionRepository.aggregateDailyInflow(user);

                result.analytics = {
                    revenue,
                    expenses,
                    inflow
                }

            }

        }

        return result;

    }

    /**
     * @name getGraphData
     * @param data 
     * @returns 
     */
    public async getGraphData(data: WalletGraphDTO): Promise<IGraphData> {

        const { user, startDate, endDate } = data;
        let collection: Array<any> = [], transactions: Array<any> = []

        if (startDate && endDate) {
            // TODO: fix graph data from dates
        }

        collection = await TransactionRepository.aggregateIncomeGraph({ user });
        transactions = await TransactionRepository.aggregateTransactionGraph({ user });

        return { income: collection, transactions: transactions }

    }

}

export default new WalletService();
