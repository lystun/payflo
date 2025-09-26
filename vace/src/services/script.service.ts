import { Random, arrayIncludes, dateToday, toDecimal } from "@btffamily/vacepay";
import Business from "../models/Business.model";
import Card from "../models/Card.model";
import Provider from "../models/Provider.model";
import Settlement from "../models/Settlement.model";
import Transaction from "../models/Transaction.model";
import User from "../models/User.model"
import businessRepository from "../repositories/business.repository";
import settlementRepository from "../repositories/settlement.repository";
import transactionRepository from "../repositories/transaction.repository";
import AccountService from "./account.service";
import BusinessService from "./business.service";
import cardService from "./card.service";
import ProviderService from "./provider.service";
import settlementService from "./settlement.service";
import systemService from "./system.service";
import WalletService from "./wallet.service";
import { BusinessType, PrefixType, ProviderNameType, SettlementStatus, TransactionChannelType, TransactionFeatureType, TransactionStatus } from "../utils/enums.util";
import { IBusinessDoc, ICardDoc, IProviderDoc, IResult, ISettingDoc, ISettlementDoc, ISettlementPayout, ITransactionDoc, IUserDoc, IWalletDoc } from "../utils/types.util";
import dayjs from 'dayjs';
import customParse from 'dayjs/plugin/customParseFormat';
import { updateDueSettlementJob } from "../queues/jobs/settlement.job";
import envUtil from "../utils/env.util";
import vacepayService from "./vacepay.service";
import Bank from "../models/Bank.model";
dayjs.extend(customParse);

class ScriptService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    public async createVacepayBaniWallet(): Promise<void> {

        const vacepayUser = await User.findOne({ email: process.env.SUPERADMIN_EMAIL });
        const business = await Business.findOne({ email: process.env.SUPERADMIN_EMAIL });
        const provider = await Provider.findOne({ name: 'bani' });

        if (vacepayUser && provider && business) {

            // check
            const check = await ProviderService.accountExists(provider, business);

            if (check === false) {

                // create business data for vacepay
                vacepayUser.phoneCode = '+234';
                vacepayUser.phoneNumber = '08138068180';
                vacepayUser.firstName = vacepayUser.firstName ? vacepayUser.firstName : 'Vace';
                vacepayUser.lastName = vacepayUser.lastName ? vacepayUser.lastName : 'Technologies';
                await vacepayUser.save();

                business.phoneCode = vacepayUser.phoneCode;
                business.phoneNumber = vacepayUser.phoneNumber;
                business.location.city = business.location.city ? business.location.city : 'Maitama';
                business.location.address = business.location.address ? business.location.address : '1a Taraba Close, Maitama, Abuja';
                business.location.state = business.location.state ? business.location.state : 'Abuja';
                business.officialEmail = business.officialEmail ? business.officialEmail : vacepayUser.email;
                business.legal = {
                    bvnNumber: process.env.SUPERADMIN_BVN || '',
                    ninNumber: process.env.SUPERADMIN_NIN || ''
                }
                business.owner.firstName = process.env.PLATFORM_FIRSTNAME || '';
                business.owner.lastName = process.env.PLATFORM_LASTNAME || '';
                await business.save();

                // create business settings
                await BusinessService.createSettingData({
                    business: business,
                    user: vacepayUser
                });

                // create wallet data for vacepay
                await WalletService.createWallet({ business, currency: 'NGN' });

                // generate a bank account for vacepay via bani
                await BusinessService.createBankAccount(business._id, 'bani');

                console.log('generated-bani-vacepay-account')

            }


        } else if (vacepayUser && provider && !business) {

            await BusinessService.createBusiness(vacepayUser, {
                type: BusinessType.CORPORATE,
                name: 'Vace Technologies Limited',
                tier: '3',
                limit: {
                    label: '3M',
                    value: 300000000
                }
            });

        }

    }

    public async runSettlementTask(): Promise<void> {

        // sync provider names
        await console.log("START-SYNC-NAMES")
        await this.syncProviderNames();

        // re-calculate transaction amouts
        await console.log("START-CALC-AMTS")
        await this.recalculateAmounts();

        // clear pending settlements
        await console.log("START-CLEAR-PSET")
        await this.clearPendingSettlements();

        // update cleared report
        await console.log("START-UP-CLREPT")
        await this.updateClearedReport();

        // adjust admin wallet
        await console.log("START-ADJT-ADW")
        await this.adjustAdminWallet()

        // adjust user's settlement balance
        await console.log("START-ADJT-USER")
        await this.adjustUserSettlement()

    }

    public async completeSettlements(): Promise<void> {

        const settlements = await Settlement.find({
            $or: [
                { status: SettlementStatus.PENDING },
                { status: SettlementStatus.PROCESSING }
            ]
        })

        if (settlements.length > 0) {

            for (let i = 0; i < settlements.length; i++) {

                let settlement = settlements[i];
                let businessList = await this.extractBusinessList(settlement._id);
                let settledList = businessList.filter((x) => x.completed === true);
                let unSettledList = businessList.filter((x) => x.completed === false);

                settlement.analytics.settled.businesses = settledList.map((m) => m.businessId);

                if (unSettledList.length === 0 && settledList.length > 0) {
                    settlement.status = SettlementStatus.COMPLETED;
                }

                await settlement.save();
                await console.log('SETTLED :', settlement.code)

            }



        }

    }

    private async extractBusinessList(id: any): Promise<Array<{ businessId: any, completed: boolean }>> {

        let result: Array<{ businessId: any, completed: boolean }> = [];

        const transactions = await Transaction.find({ settlement: id, feature: TransactionFeatureType.PAYMENT_LINK });

        if (transactions.length > 0) {

            for (let i = 0; i < transactions.length; i++) {

                let transaction = transactions[i];

                let exist = result.find((m) => m.businessId.toString() === transaction.business.toString())
                let existIndex = result.findIndex((m) => m.businessId.toString() === transaction.business.toString())

                if (exist) {

                    if (exist.completed === true && (transaction.settle.status !== SettlementStatus.COMPLETED)) {
                        exist.completed = false;
                    } else if (transaction.settle.status === SettlementStatus.COMPLETED) {
                        exist.completed = true;
                    }

                    result.splice(existIndex, 1, exist)

                } else {
                    result.push({
                        businessId: transaction.business,
                        completed: transaction.settle.status === SettlementStatus.COMPLETED ? true : false
                    });
                }


            }

        }

        return result;

    }

    public async createSettingData(): Promise<void> {

        const businesses = await Business.find({}).populate([
            { path: 'user' },
            { path: 'settings' }
        ])

        if (businesses.length > 0) {

            for (let i = 0; i < businesses.length; i++) {

                let business = businesses[i];
                let user: IUserDoc = business.user;

                if (!business.settings) {

                    await BusinessService.createSettingData({ business, user })
                    await console.log("SETTINGS - ", business.name)

                }

            }

        }

    }

    public async syncProviderNames(): Promise<void> {
        const transactions = await Transaction.find({}).populate([{ path: 'provider' }])

        for (let i = 0; i < transactions.length; i++) {

            let transaction = transactions[i];

            if (!transaction.providerName || transaction.providerName === '') {
                let provider: IProviderDoc = transaction.provider;
                transaction.providerName = provider.name;
                await transaction.save();

                await console.log('COMPLETE-NAME-SYNC', transaction.reference)
            }

        }
    }

    public async recalculateAmounts(): Promise<void> {

        const transactions = await Transaction.find({}).populate([
            { path: 'provider' },
            {
                path: 'business', populate: [
                    { path: 'settings' }
                ]
            }
        ]).select("+revenue +revenue.amount +revenue.unitAmount +revenue.reversed +revenue.unitReversed")

        for (let i = 0; i < transactions.length; i++) {

            let transaction = transactions[i];
            let provider: IProviderDoc = transaction.provider;
            let business: IBusinessDoc = transaction.business;
            let settings: ISettingDoc = business.settings;

            if (provider.name === ProviderNameType.BANI && transaction.feature === TransactionFeatureType.PAYMENT_LINK) {

                let amount: number = transaction.amount;

                let calculatedFee = await ProviderService.calculateFee({
                    type: 'transfer',
                    category: 'inflow',
                    amount: amount,
                    provider: provider,
                    settings: settings,
                });

                transaction.fee = calculatedFee.fee;
                transaction.unitFee = calculatedFee.fee * 100;
                transaction.vatFee = calculatedFee.vat;
                transaction.unitVatFee = calculatedFee.vat * 100;
                transaction.revenue.amount = calculatedFee.revenue;
                transaction.revenue.unitAmount = calculatedFee.revenue * 100;
                transaction.settle.amount = calculatedFee.settlement;

                await transaction.save();

                await console.log("BANK-DONE-FOR", transaction.reference)

            } else if (provider.name === ProviderNameType.BLUSALT && transaction.feature === TransactionFeatureType.PAYMENT_LINK) {

                let amount: number = transaction.amount;

                let calculatedFee = await ProviderService.calculateFee({
                    type: 'card',
                    category: 'outflow',
                    amount: amount,
                    provider: provider,
                    settings: settings,
                });

                transaction.fee = calculatedFee.fee;
                transaction.unitFee = calculatedFee.fee * 100;
                transaction.vatFee = calculatedFee.vat;
                transaction.unitVatFee = calculatedFee.vat * 100;
                transaction.revenue.amount = calculatedFee.revenue;
                transaction.revenue.unitAmount = calculatedFee.revenue * 100;
                transaction.settle.amount = calculatedFee.settlement;

                await transaction.save();

                await console.log("CARD-DONE-FOR", transaction.reference)

            }


        }
    }

    public async clearPendingSettlements(): Promise<void> {
        const settlements = await Settlement.find({
            status: SettlementStatus.PENDING
        })

        for (let i = 0; i < settlements.length; i++) {

            let settlement = settlements[i]

            settlement.totalAmount = 0;
            settlement.groups = [];
            settlement.transactions = []
            settlement.businesses = []
            settlement.overview = {
                amount: 0,
                businesses: 0,
                dueToday: { amount: 0, businesses: 0 },
                pastDue: { amount: 0, businesses: 0 },
                revenue: 0,
                totalAmount: 0,
                totalFee: 0,
                totalVat: 0
            }

            await settlement.save()

            await console.log('COMPLETE-STT', settlement.code)

        }
    }

    public async updateClearedReport(): Promise<void> {

        await console.log("STARTING-TRX")

        const transactions = await Transaction.find({
            feature: TransactionFeatureType.PAYMENT_LINK,
            status: TransactionStatus.SUCCESSFUL
        });

        for (let i = 0; i < transactions.length; i++) {

            let transactionData = await transactionRepository.findById(transactions[i]._id, true);

            if (transactionData) {

                let business: IBusinessDoc = transactionData.business;
                let settlement: ISettlementDoc = transactionData.settlement;
                let transaction = transactions[i];

                await settlementService.updateSettlementReport({
                    business,
                    settlement,
                    transactions: [transaction._id]
                });

                await console.log("COMPLETED :", transaction.reference)

            }



        }

    }

    public async syncSettlementToBusiness(): Promise<void> {

        const settlements = await Settlement.find({}).populate([{ path: 'businesses' }]);

        for (let i = 0; i < settlements.length; i++) {

            let settlement = settlements[i]
            await this.mapBusinessSync(settlement.businesses, settlement);
            await console.log('COMPLETE-SYNC', settlement.code)

        }
    }

    public async mapBusinessSync(businesses: Array<IBusinessDoc>, settlement: ISettlementDoc): Promise<void> {

        for (let i = 0; i < businesses.length; i++) {

            let business = businesses[i];

            if (!arrayIncludes(business.settlements, settlement._id.toString())) {
                business.settlements.push(settlement._id);
                await business.save()
            }

        }
    }

    public async generateMerchantId(): Promise<void> {

        const businesses = await Business.find({});

        for (let i = 0; i < businesses.length; i++) {

            let business = businesses[i];
            if (!business.merhcantID) {
                business.merhcantID = `${PrefixType.MERCHANT_ID}${Random.randomNum(8)}`;
                await business.save();
            }

        }
    }

    public async adjustAdminWallet(): Promise<void> {

        const transactions = await Transaction.find({}).populate([
            { path: 'provider' },
            {
                path: 'business', populate: [
                    { path: 'settings' }
                ]
            }
        ]).select("+revenue +revenue.amount +revenue.unitAmount +revenue.reversed +revenue.unitReversed")

        const adminWallet = await vacepayService.getAdminWallet();

        let settlement: number = 0, revenue: number = 0, count: number = 0;

        if (adminWallet) {

            for (let i = 0; i < transactions.length; i++) {

                let transaction = transactions[i];

                if (transaction.feature === TransactionFeatureType.PAYMENT_LINK && transaction.status === TransactionStatus.SUCCESSFUL) {
                    settlement = settlement + transaction.settle.amount;
                    revenue = revenue + transaction.revenue.amount;
                    count += 1;
                } else if (transaction.status === TransactionStatus.SUCCESSFUL) {
                    revenue = revenue + transaction.revenue.amount;
                }

            }

            adminWallet.balance.locked = toDecimal(revenue, 2);
            adminWallet.balance.settlement = toDecimal(settlement, 2);
            await adminWallet.save();

            await console.log("ADMIN-WALLET-ADUSTED", revenue, settlement, count)

        }

    }

    public async adjustUserSettlement(): Promise<void> {

        const transactions = await Transaction.find({ feature: TransactionFeatureType.PAYMENT_LINK });
        let businessList: Array<{ businessId: any, settlement: number }> = [];

        // loop through all transactions and get out list
        businessList = await this.extractList(transactions);

        // loop through businessList update settlement
        if (businessList.length > 0) {

            for (let i = 0; i < businessList.length; i++) {

                let listData = businessList[i];
                let business = await businessRepository.findById(listData.businessId, true);

                if (business) {

                    let wallet: IWalletDoc = business.wallet;
                    wallet.balance.settlement = toDecimal(listData.settlement, 2);
                    await wallet.save();

                    await console.log("USER-WALLET-ADUSTED", listData)

                }


            }

        }

    }

    private async extractList(transactions: Array<ITransactionDoc>): Promise<any> {

        let businessList: Array<{ businessId: any, settlement: number }> = [];

        for (let i = 0; i < transactions.length; i++) {

            let transaction = transactions[i];

            if (transaction.feature === TransactionFeatureType.PAYMENT_LINK && transaction.status === TransactionStatus.SUCCESSFUL) {

                let exist = businessList.find((x) => x.businessId.toString() === transaction.business.toString())
                let existIndex = businessList.findIndex((x) => x.businessId.toString() === transaction.business.toString())

                if (exist && existIndex >= 0) {

                    exist.settlement = exist.settlement + transaction.settle.amount;
                    businessList.splice(existIndex, 1, exist)

                } else {

                    businessList.push({
                        businessId: transaction.business,
                        settlement: transaction.settle.amount
                    })

                }

            }


        }

        return businessList

    }

    /**
     * @name syncBankProvidersId
     * @key bank-providers-id
     */
    public async syncBankProvidersId(): Promise<void> {

        let count = 0;
        const banks = await Bank.find({});

        for (let i = 0; i < banks.length; i++) {

            let bank = banks[i];

            let bani = bank.providers.find((x) => x.name === ProviderNameType.BANI);
            let baniI = bank.providers.findIndex((x) => x.name === ProviderNameType.BANI);

            if (bani && baniI >= 0) {
                bani.id = 'NGSQGT';
                bank.providers.splice(baniI, 1, bani)
            }

            let paystack = bank.providers.find((x) => x.name === ProviderNameType.PAYSTACK);
            let paystackI = bank.providers.findIndex((x) => x.name === ProviderNameType.PAYSTACK);

            if (paystack && paystackI >= 0) {
                paystack.id = paystack.bankCode ? paystack.bankCode : bank.code;
                bank.providers.splice(paystackI, 1, paystack)
            }

            let ninepsb = bank.providers.find((x) => x.name === ProviderNameType.NINEPSB);
            let ninepsbI = bank.providers.findIndex((x) => x.name === ProviderNameType.NINEPSB);

            if (ninepsb && ninepsbI >= 0) {
                ninepsb.id = ninepsb.bankCode ? ninepsb.bankCode : bank.code;
                bank.providers.splice(ninepsbI, 1, ninepsb)
            }

            let netmfb = bank.providers.find((x) => x.name === ProviderNameType.NETMFB);
            let netmfbI = bank.providers.findIndex((x) => x.name === ProviderNameType.NETMFB);

            if (netmfb && netmfbI >= 0) {
                netmfb.id = netmfb.bankCode ? netmfb.bankCode : bank.code;
                bank.providers.splice(netmfbI, 1, netmfb)
            }

            await bank.save()

        }

        if (count >= 0) {
            await console.log("provider ids synced")
        }
    }

    public async cleanReversalTransactions(): Promise<void>{

        const transactions = await Transaction.find({ $or: [
            { feature: TransactionFeatureType.WALLET_REVERSAL }
        ] })

        if(transactions.length > 0){

            for(let i = 0; i < transactions.length; i++){

                let transaction = transactions[i]

                if(transaction.status === TransactionStatus.SUCCESSFUL){

                    transaction.vatFee = 0;
                    transaction.unitVatFee = 0;
                    transaction.fee = 0;
                    transaction.unitFee = 0;
                    await transaction.save();

                    await console.log('COMPLETE-CLEAN: ', transaction.reference)
                }

            }

        }

    }

    public async updateAfterSettledTransactions(): Promise<void>{

        const transactions = await Transaction.find({
            $and: [
                { feature: TransactionFeatureType.BANK_SETTLEMENT },
                {
                    $or: [
                        { channel: TransactionChannelType.BANK_SETTLEMENT },
                        { channel: TransactionChannelType.WALLET_SETTLEMENT },
                        { channel: TransactionChannelType.BANK_TRANSFER }
                    ]
                }
            ]
        })

        if(transactions.length > 0){

            for(let i = 0; i < transactions.length; i++){

                let transaction = transactions[i]

                if(transaction.status === TransactionStatus.SUCCESSFUL){

                    transaction.settle.settledAt = transaction.createdAt;
                    transaction.settle.status = SettlementStatus.COMPLETED;
                    await transaction.save()

                    await console.log('COMPLETE-CLEAN: ', transaction.reference)
                }

            }

        }

    }

}

export default new ScriptService();
