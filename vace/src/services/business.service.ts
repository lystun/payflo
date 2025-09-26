import { Random, UIID, arrayIncludes, capitalize, dateToday, isDefined, isNeg, notDefined } from '@btffamily/vacepay';
import { CreateBusinessDTO, CreateSettingsDataDTO, FilterBusinessDTO, SetBusinessChargesDTO, SettingFeeRequestDTO, UpdateBillsSettingsDTO, UpdateBusinessChargesDTO, UpdatePaymentSettingsDTO, UpdateResourceSettingsDTO, UpdateSettingsDTO, UpdateSettlementTimelineDTO, UpdateWalletSettingsDTO } from '../dtos/business.dto';
import Business from '../models/Business.model';
import { IAccountDoc, IBankDoc, IBusinessBank, IBusinessCharge, IBusinessDoc, IBusinessSocial, IKYBBank, IProviderDoc, IResult, ISettingDoc, IUserDoc, IWalletDoc, PTAccountType, ProviderType, SDAccountType } from '../utils/types.util'
import BankService from './bank.service';
import SystemService from './system.service';
import { BusinessType, DomainType, PrefixType, ProviderNameType, UserType, ValueType, VerificationType } from '../utils/enums.util';
import { CreateBaniCustomerDTO } from '../dtos/providers/bani.dto';
import BaniService from './providers/bani.service';
import { ObjectId } from 'mongoose';
import Account from '../models/Account.model';
import Provider from '../models/Provider.model';
import AccountService from './account.service';
import ProviderService from './provider.service';
import { GetWalletSocketDTO } from '../dtos/wallet.dto';
import mongoUtil from '../utils/mongo.util';
import NinepsbService from './providers/ninepsb.service';
import Setting from '../models/Setting.model';
import TransactionService from './transaction.service';
import UserService from './user.service';
import ENV from '../utils/env.util';

class BusinessService {

    constructor() {

    }

    /**
     * @name validateUpdateSettings
     * @param data 
     * @returns 
     */
    public async validateUpdateSettings(data: UpdateSettingsDTO): Promise<IResult> {

        const allowedDest = ['wallet', 'bank']
        const allowedStatuses = ['active', 'inactive']
        const allowedDomains = ['live', 'test', 'neutral']
        let result: IResult = { error: false, message: '', code: 200, data: null }

        const { incognito, settlement, wallet, bills, domain } = data;

        if (settlement && settlement.settleInto && !arrayIncludes(allowedDest, settlement.settleInto)) {
            result.error = true;
            result.message = `invalid settlement destination. choose from ${allowedDest.join(", ")}`
        }
        else if (wallet && wallet.inflow && !arrayIncludes(allowedStatuses, wallet.inflow)) {
            result.error = true;
            result.message = `invalid inflow settings value. choose from ${allowedStatuses.join(", ")}`
        }
        else if (wallet && wallet.outflow && !arrayIncludes(allowedStatuses, wallet.outflow)) {
            result.error = true;
            result.message = `invalid outflow settings value. choose from ${allowedStatuses.join(", ")}`
        }
        else if (bills && bills.airtime && !arrayIncludes(allowedStatuses, bills.airtime)) {
            result.error = true;
            result.message = `invalid airtime settings value. choose from ${allowedStatuses.join(", ")}`
        }
        else if (bills && bills.data && !arrayIncludes(allowedStatuses, bills.data)) {
            result.error = true;
            result.message = `invalid data settings value. choose from ${allowedStatuses.join(", ")}`
        }
        else if (bills && bills.cable && !arrayIncludes(allowedStatuses, bills.cable)) {
            result.error = true;
            result.message = `invalid cable settings value. choose from ${allowedStatuses.join(", ")}`
        }
        else if (bills && bills.electricity && !arrayIncludes(allowedStatuses, bills.electricity)) {
            result.error = true;
            result.message = `invalid electricity settings value. choose from ${allowedStatuses.join(", ")}`
        }
        else if (domain && !arrayIncludes(allowedDomains, domain)) {
            result.error = true;
            result.message = `invalid domain value. choose from ${allowedDomains.join(", ")}`
        }
        else {
            result.error = false;
            result.message = "";
        }

        return result;

    }

    /**
     * @name validateChargeSettings
     * @param data 
     * @returns 
     */
    public async validateChargeSettings(data: SetBusinessChargesDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null }

        const { bills, card, inflow, transfer } = data;

        if (card) {

            const chargeCheck = await this.validateBusinessCharge(card);

            if (chargeCheck.error) {
                result = chargeCheck
            } else {
                result.error = false;
                result.message = "";
            }

        }

        if (bills) {

            const chargeCheck = await this.validateBusinessCharge(bills);

            if (chargeCheck.error) {
                result = chargeCheck
            } else {
                result.error = false;
                result.message = "";
            }

        }

        if (transfer) {

            const chargeCheck = await this.validateBusinessCharge(transfer);

            if (chargeCheck.error) {
                result = chargeCheck
            } else {
                result.error = false;
                result.message = "";
            }

        }

        if (inflow) {

            const chargeCheck = await this.validateBusinessCharge(inflow);

            if (chargeCheck.error) {
                result = chargeCheck
            } else {
                result.error = false;
                result.message = "";
            }

        }

        return result;

    }

    /**
     * @name validateBusinessCharge
     * @param data 
     * @returns 
     */
    public async validateBusinessCharge(data: SettingFeeRequestDTO): Promise<IResult> {

        const allowedTypes = ['percentage', 'flat']
        let result: IResult = { error: false, message: '', code: 200, data: null }

        const { capped, markup, providerFee, providerMarkup, type, value, vatType, vatValue, stampDuty } = data;

        if (!type) {
            result.error = true;
            result.message = 'fee type is required';
            result.code = 400;
        } else if (!arrayIncludes(allowedTypes, type.toString())) {
            result.error = true;
            result.message = `invalid fee type. choose from ${allowedTypes.join(', ')}`;
            result.code = 400;
        } else if (isNeg(providerFee)) {
            result.error = true;
            result.message = `provider fee is required and cannot be zero or negative for a ${type} type`;
            result.code = 400;
        } else if (type === ValueType.PERCENTAGE && Math.round(providerFee) > 100) {
            result.error = true;
            result.message = `percentage fee type cannot be greater than 100`;
            result.code = 400;
        } else if (isDefined(providerMarkup) && isNeg(providerMarkup)) {
            result.error = true;
            result.message = `provider markup is required and cannot be zero or negative for a ${type} type`;
            result.code = 400;
        } else if (isNeg(value)) {
            result.error = true;
            result.message = `fee is required and cannot be zero or negative for a ${type} type`;
            result.code = 400;
        } else if (type === ValueType.PERCENTAGE && Math.round(value) > 100) {
            result.error = true;
            result.message = `percentage fee type cannot be greater than 100`;
            result.code = 400;
        } else if (isDefined(markup) && (isNeg(markup))) {
            result.error = true;
            result.message = `invalid markup value for a ${type} type`;
            result.code = 400;
        } else if (markup && Math.round(markup) > 100) {
            result.error = true;
            result.message = 'markup value cannot be greater than 100';
            result.code = 400;
        } else if (capped && (isNeg(capped))) {
            result.error = true;
            result.message = `invalid capped value for a ${type} type`;
            result.code = 400;
        } else if (vatType && !arrayIncludes(allowedTypes, vatType)) {
            result.error = true;
            result.message = `invalid vat type. choose from ${allowedTypes.join(', ')}`;
            result.code = 400;
        } else if (vatValue && (isNeg(vatValue))) {
            result.error = true;
            result.message = `invalid vat value`;
            result.code = 400;
        } else if (vatValue && !vatType) {
            result.error = true;
            result.message = `vat type is required`;
            result.code = 400;
        } else if (vatValue && vatType === ValueType.PERCENTAGE && Math.round(vatValue) > 100) {
            result.error = true;
            result.message = `percentage vat type cannot be greater than 100`;
            result.code = 400;
        } else if (stampDuty && (isNeg(stampDuty))) {
            result.error = true;
            result.message = `invalid stamp duty value for a ${type} type`;
            result.code = 400;
        } else {
            result.error = false;
            result.message = ``;
            result.code = 200;
        }

        return result;

    }

    /**
     * @name getWalletViaSocket
     * @param data 
     * @returns 
     */
    public async getWalletViaSocket(data: GetWalletSocketDTO): Promise<IWalletDoc | null> {

        let result: IWalletDoc | null = null;

        const convId = mongoUtil.stringToMongoId(data.businessId);
        const business = await Business.findOne({ _id: convId }).populate([
            { path: 'wallet' }
        ]);

        if (business) {
            result = business.wallet;
        }

        return result;

    }



    /**
     * @name updateSocials
     * @param KYB 
     * @param list 
     */
    public async updateSocials(business: IBusinessDoc, list: Array<IBusinessSocial>): Promise<void> {

        let socials = business.socials;

        for (let i = 0; i < list.length; i++) {

            let data: IBusinessSocial = list[i];

            const handle = socials.find((x) => x.name.toLowerCase() === data.name.toLowerCase());
            const handleIndex = socials.findIndex((x) => x.name.toLowerCase() === data.name.toLowerCase());

            if (handle && handleIndex >= 0) {
                handle.url = data.url ? data.url : handle.url;
                handle.username = data.username ? data.username : handle.username;
                handle.description = data.description ? data.description : handle.description;

                socials.splice(handleIndex, 1, handle);
                business.socials = socials;

            } else {

                const handle: IBusinessSocial = {
                    name: data.name,
                    url: data.url,
                    username: data.username,
                    description: data.description
                }

                business.socials.push(handle);
            }

        }

        await business.save();

    }

    /**
     * @name updateBanks
     * @param business 
     * @param list 
     */
    public async updateKYBBank(business: IBusinessDoc, provider: IProviderDoc, data: IKYBBank): Promise<void> {

        let created = await BankService.createBank({
            code: data.bankCode,
            accountName: data.accountName,
            accountNo: data.accountNo,
            business: business,
            provider: provider
        });

        let createdBank: IBankDoc = created;

        let newBank: IBusinessBank = {
            accountNo: createdBank.accountNo,
            accountName: createdBank.accountName,
            bankCode: createdBank.code,
            platformCode: createdBank.platformCode,
            name: createdBank.legalName,
            updatedAt: dateToday(Date.now()).ISO
        };

        if (!arrayIncludes(business.banks, created._id.toString())) {
            business.banks.push(created._id);
            business.bank = newBank;
        }

        await business.save();

    }

    /**
     * @name createBusiness
     * @description create new business record in DB
     * @param user 
     * @param {CreateBusinessDTO} data 
     * @returns {IBusinessDoc} business
     */
    public async createBusiness(user: IUserDoc, data: CreateBusinessDTO): Promise<IBusinessDoc> {

        const allowed = ['corporate', 'sme-business', 'smb-business', 'entrepreneur']

        let btype = 'corporate';
        if (arrayIncludes(allowed, data.type)) {
            btype = data.type;
        }

        const exist = await Business.findOne({ email: user.email });

        if (exist) {
            return exist;
        } else {

            let _bid = `${PrefixType.BUSINESS}${Random.randomNum(6)}`;
            let code = `${Random.randomCode(6, true)}`;

            // encrypt transaction pin
            const pin = await SystemService.encryptData({
                password: user.email,
                payload: `${Random.randomNum(4)}`,
                separator: '_'
            });

            const business = await Business.create({
                _id: user._id,
                id: user._id,
                name: data.name,
                displayName: data.name,
                email: user.email,
                officialEmail: user.email,
                user: user._id,
                businessType: btype,
                phoneNumber: user.phoneNumber,
                phoneCode: user.phoneCode,
                code: code.toString(),
                businessID: _bid.toString(),
                tier: data.tier,
                transactionPin: pin,
                dailyTransaction: {
                    limit: data.limit.value,
                    label: data.limit.label
                },
            });

            user.business = business._id;
            await user.save();

            return business;

        }

    }

    /**
     * @name createBankAccount
     * @param businessId 
     * @param providerName 
     * @returns 
     */
    public async createBankAccount(businessId: ObjectId, providerName: ProviderType, type?: PTAccountType): Promise<IResult> {

        let customerName: any = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }

        const business = await Business.findOne({ _id: businessId }).populate([
            { path: 'user' },
            { path: 'wallet' }
        ]);
        const provider = await Provider.findOne({ name: providerName });

        if (business && provider && providerName === ProviderNameType.BANI) {

            const wallet: IWalletDoc = business.wallet;
            const user: IUserDoc = business.user;

            // create account date for user
            const check = await AccountService.accountExists(provider, business);

            if (check === false) {

                const _crAccount = await AccountService.createAccountData({ business, providerName: 'bani', type: 'permanent' });

                const account: IAccountDoc = _crAccount.data;

                const user: IUserDoc = business.user;
                let note = `Bani<>Vacepay customer created on - ${dateToday(Date.now()).ISO}`

                if (business.businessType === BusinessType.ENTREPRENEUR) {
                    customerName = {
                        firstName: user.firstName,
                        lastName: user.lastName,
                        name: `${user.firstName} ${user.lastName}`
                    }
                } else if (business.businessType === BusinessType.CORPORATE) {
                    customerName = {
                        firstName: business.owner.firstName,
                        lastName: business.owner.lastName,
                        name: `${business.name}`
                    }
                }

                let phoneNumber = UserService.attachPhoneCode(business.phoneCode, business.phoneNumber)

                const customerResp = await BaniService.createCustomer({
                    firstName: customerName.firstName,
                    lastName: customerName.lastName,
                    address: business.location.address,
                    city: business.location.city,
                    email: business.email,
                    phoneNumber: phoneNumber,
                    state: business.location.state,
                    note: note
                });

                if (customerResp.error === false) {

                    // upate account details with customer info
                    const _updatedAccount = await AccountService.updateCustomerDetails({
                        account,
                        provider: 'bani',
                        response: customerResp.data,
                        note: note
                    });

                    // update wallet and account: attach details
                    _updatedAccount.wallet = wallet._id;
                    await _updatedAccount.save();

                    wallet.account = _updatedAccount._id;
                    await wallet.save();

                    // generate bani account number usring information from customer
                    const txnref = TransactionService.generateRef();
                    const bankResp = await BaniService.generateAccount({
                        accountType: type ? type : 'permanent',
                        currency: 'NGN',
                        countryCode: 'NG',
                        step: 'direct',
                        customerRef: _updatedAccount.customer.reference,
                        reference: txnref.toString(),
                        nameOnly: false,
                        bvnNumber: business.legal.bvnNumber,
                        accountName: customerName.name
                    });

                    // update business account details generated with bani
                    if (bankResp.error === false) {

                        result.data = await AccountService.updateBankDetails({
                            account: _updatedAccount,
                            response: bankResp.data,
                            provider: 'bani',
                            note: note
                        });

                    } else {
                        result = bankResp;
                    }

                } else {
                    result = customerResp;
                }

            }

        }

        if (business && provider && providerName === ProviderNameType.NINEPSB) {

            const wallet: IWalletDoc = business.wallet;
            const txnref = TransactionService.generateRef(); // terra reference

            // create account date for user
            const check = await ProviderService.accountExists(provider, business);

            if (check === false) {

                const _crAccount = await AccountService.createAccountData({ business, providerName: 'ninepsb', type: 'static' });

                const user: IUserDoc = business.user;
                let note = `NinePSB<>Vacepay customer created on - ${dateToday(Date.now()).ISO}`;

                if (_crAccount.error === false) {

                    const account: IAccountDoc = _crAccount.data;

                    // generate ninepsb account number usring information from business
                    let accountType: SDAccountType = type ? type === 'permanent' ? 'static' : 'dynamic' : 'static';
                    let nameSplit = business.name.split(' ');
                    const bankResp = await NinepsbService.generateAccount({
                        reference: txnref,
                        accountType: accountType,
                        amount: 0,
                        amountType: 'any',
                        country: 'NGA',
                        currency: 'NGN',
                        description: note,
                        customer: {
                            firstName: nameSplit[0],
                            lastName: nameSplit[1]
                        }
                    });

                    // update business account details generated with ninepsb
                    if (bankResp.error === false) {

                        // upate account details with customer info
                        const _updatedAccount = await AccountService.updateCustomerDetails({
                            account,
                            provider: 'ninepsb',
                            response: bankResp.data,
                            note: note
                        });

                        // update wallet and account: attach details
                        _updatedAccount.wallet = wallet._id;
                        await _updatedAccount.save();

                        wallet.account = _updatedAccount._id;
                        await wallet.save();

                        // update account details
                        result.data = await AccountService.updateBankDetails({
                            account: _updatedAccount,
                            response: bankResp.data,
                            provider: 'ninepsb',
                            note: note
                        });


                    } else {

                        result = bankResp;

                    }


                } else {
                    result = _crAccount;
                }

            }

        }

        return result;


    }

    /**
     * @name createSettingData
     * @param data 
     */
    public async createSettingData(data: CreateSettingsDataDTO): Promise<void> {

        const { business, user } = data;

        const exist = await Setting.findOne({ business: business._id });

        if (!exist) {

            let domain = DomainType.TEST;
            let card: string = 'active';
            let tokenize: string = 'inactive';
    
            if (ENV.isProduction()) {
                domain = DomainType.LIVE;
                card = 'inactive';
                tokenize = 'inactive';
            }

            const settings = await Setting.create({
                settlement: {
                    currency: 'NGN',
                    label: 'T+1',
                    days: 1
                },
                feeInflow: {
                    vatType: ValueType.PERCENTAGE,
                    vatValue: 0
                },
                feeOutflow: {
                    vatType: ValueType.FLAT,
                    vatValue: 0
                },
                cardFee: {
                    vatType: ValueType.FLAT,
                    vatValue: 0
                },
                billsFee: {
                    vatType: ValueType.FLAT,
                    vatValue: 0
                },
                transferFee: {
                    vatType: ValueType.FLAT,
                    vatValue: 0
                },
                inflowFee: {
                    vatType: ValueType.FLAT,
                    vatValue: 0
                },
                card: {
                    isEnabled: card,
                    tokenize: tokenize
                },
                domain: domain,
                business: business._id
            });

            // set default charges for corporates
            if (user.businessType === BusinessType.CORPORATE) {
                await this.setDefaultCharges(settings);
            } else if (user.userType === UserType.SUPER) {
                await this.setDefaultCharges(settings);
            }

            business.settings = settings._id;
            await business.save();

        }

    }

    /**
     * @name setDefaultCharges
     * @param settings 
     * @returns 
     */
    private async setDefaultCharges(settings: ISettingDoc): Promise<ISettingDoc> {

        const providers = await Provider.find({});

        const cardProvider = await ProviderService.getProviderFromList('card', providers);
        const billProvider = await ProviderService.getProviderFromList('bills', providers);
        const bankProvider = await ProviderService.getProviderFromList('bank', providers);

        // set card charges
        if (cardProvider) {

            settings.cardFee = {
                vatType: ValueType.PERCENTAGE,
                vatValue: 7.5,
                type: cardProvider.vaceOutflow.type,
                providerFee: cardProvider.vaceOutflow.providerFee,
                value: cardProvider.vaceOutflow.value,
                providerMarkup: cardProvider.vaceOutflow.providerMarkup,
                markup: cardProvider.vaceOutflow.markup,
                capped: cardProvider.vaceOutflow.capped,
                providerCap: cardProvider.vaceOutflow.providerCap,
                chargeFee: cardProvider.vaceOutflow.chargeFee,
                stampDuty: 0
            }

        }

        // set bills charges
        if (billProvider) {

            settings.billsFee = {
                vatType: ValueType.PERCENTAGE,
                vatValue: 0,
                type: billProvider.vaceOutflow.type,
                providerFee: billProvider.vaceOutflow.providerFee,
                value: billProvider.vaceOutflow.value,
                providerMarkup: billProvider.vaceOutflow.providerMarkup,
                markup: billProvider.vaceOutflow.markup,
                capped: billProvider.vaceOutflow.capped,
                providerCap: billProvider.vaceOutflow.providerCap,
                chargeFee: billProvider.vaceOutflow.chargeFee,
                stampDuty: 0
            }

        }

        // set transfer & inflow charges
        if (bankProvider) {

            settings.transferFee = {
                vatType: ValueType.PERCENTAGE,
                vatValue: 7.5,
                type: bankProvider.vaceOutflow.type,
                providerFee: bankProvider.vaceOutflow.providerFee,
                value: bankProvider.vaceOutflow.value,
                providerMarkup: bankProvider.vaceOutflow.providerMarkup,
                markup: bankProvider.vaceOutflow.markup,
                capped: bankProvider.vaceOutflow.capped,
                providerCap: bankProvider.vaceInflow.providerCap,
                chargeFee: bankProvider.vaceOutflow.chargeFee,
                stampDuty: 0
            }

            settings.inflowFee = {
                vatType: ValueType.PERCENTAGE,
                vatValue: 0,
                type: bankProvider.vaceInflow.type,
                providerFee: bankProvider.vaceInflow.providerFee,
                value: bankProvider.vaceInflow.value,
                providerMarkup: bankProvider.vaceInflow.providerMarkup,
                markup: bankProvider.vaceInflow.markup,
                capped: bankProvider.vaceInflow.capped,
                providerCap: bankProvider.vaceInflow.providerCap,
                chargeFee: bankProvider.vaceInflow.chargeFee,
                stampDuty: 50
            }

        }

        await settings.save();
        return settings;

    }

    /**
     * @name isValidPin
     * @param id 
     * @param pin 
     * @returns 
     */
    public async matchPIN(id: ObjectId, pin: string): Promise<boolean> {

        let result: boolean = false;

        const decryptedPin = await this.decryptTransactionPin(id);

        if (decryptedPin && decryptedPin === pin.toString()) {
            result = true;
        } else {
            result = false;
        }

        return result;
    }

    /**
     * @name decryptTransactionPin
     * @param id 
     * @returns 
     */
    public async decryptTransactionPin(id: ObjectId): Promise<string> {

        let result: string = '';

        const business = await Business.findOne({ _id: id }).populate([{ path: 'user' }]).select('+transactionPin');

        if (business) {

            const user: IUserDoc = business.user;

            const decrypted = await SystemService.decryptData({
                password: user.email,
                payload: business.transactionPin,
                separator: '-'
            });

            if (decrypted.error === false) {

                result = decrypted.data.toString()

            }

        }

        return result;
    }

    /**
     * @name isCompliant
     * @param user 
     * @returns 
     */
    public isCompliant(user: IUserDoc): boolean {

        let result: boolean = false;

        if (user.businessType === BusinessType.CORPORATE && user.identity.kyb === VerificationType.APPROVED) {
            result = true;
        } else if (user.businessType === BusinessType.ENTREPRENEUR && user.identity.kyc === VerificationType.APPROVED) {
            result = true;
        }

        return result;

    }

    /**
     * @name getAccontByProvider
     * @param accounts 
     * @param name 
     * @returns 
     */
    public getAccontByProvider(accounts: Array<IAccountDoc>, name: string): IAccountDoc {

        const account = accounts.find((x) => x.provider.name === name);

        if (account) {
            return account;
        } else {
            return accounts[0];
        }

    }

    /**
     * @name initiateOTPCode
     * @param user 
     * @returns 
     */
    public async initiateOTPCode(user: IBusinessDoc): Promise<string> {

        const gencode = Random.randomNum(6);
        user.emailCode = gencode.toString();
        user.emailCodeExpire = Date.now() + 30 * 60 * 1000; // 30 minutes // generates timestamp
        await user.save();

        return gencode.toString();

    }

    /**
     * @name validateOTPCode
     * @param user 
     * @param code 
     * @returns 
     */
    public async validateOTPCode(code: string): Promise<IBusinessDoc | null> {

        const today = Date.now(); // get timestamp from today's date
        const _foundUser = await Business.findOne({ emailCode: code.toString(), emailCodeExpire: { $gt: today } })

        return _foundUser ? _foundUser : null;
    }

    /**
     * @name updateSettlementTimeline
     * @param data 
     * @returns 
     */
    public async updateSettlementTimeline(data: UpdateSettlementTimelineDTO): Promise<ISettingDoc> {

        const { settings, days } = data;

        let noOfDays = days !== undefined && days !== null ? days : settings.settlement.days

        settings.settlement.days = noOfDays;
        settings.settlement.label = `T+${noOfDays.toString()}`;
        settings.settlement.currency = settings.settlement.currency;
        await settings.save();

        return settings;

    }

    /**
     * @name updateChargeFees
     * @param data 
     * @returns 
     */
    public async updateChargeFees(data: UpdateBusinessChargesDTO): Promise<ISettingDoc> {

        let { settings, type, charges } = data;

        if (type === 'card') {

            // set fee and charges
            settings.cardFee.chargeFee = isDefined(charges.chargeFee, true) ? charges.chargeFee : settings.cardFee.chargeFee;
            settings.cardFee.type = charges.type ? charges.type : settings.cardFee.type;
            settings.cardFee.value = isDefined(charges.value) ? charges.value : settings.cardFee.value;
            settings.cardFee.capped = isDefined(charges.capped) ? charges.capped : settings.cardFee.capped;
            settings.cardFee.providerCap = isDefined(charges.providerCap) ? charges.providerCap : settings.cardFee.providerCap;
            settings.cardFee.markup = isDefined(charges.markup) ? charges.markup : settings.cardFee.markup;
            settings.cardFee.providerFee = isDefined(charges.providerFee) ? charges.providerFee : settings.cardFee.providerFee;
            settings.cardFee.providerMarkup = isDefined(charges.providerMarkup) ? charges.providerMarkup : settings.cardFee.providerMarkup;

            // set VAT and stamp duty
            settings.cardFee.vatType = charges.vatType ? charges.vatType : settings.cardFee.vatType;
            settings.cardFee.vatValue = isDefined(charges.vatValue) ? charges.vatValue : settings.cardFee.vatValue;
            settings.cardFee.stampDuty = isDefined(charges.stampDuty) ? charges.stampDuty : settings.cardFee.stampDuty

        }

        if (type === 'bills') {

            // set fee and charges
            settings.billsFee.chargeFee = isDefined(charges.chargeFee, true) ? charges.chargeFee : settings.billsFee.chargeFee;
            settings.billsFee.type = charges.type ? charges.type : settings.billsFee.type;
            settings.billsFee.value = isDefined(charges.value) ? charges.value : settings.billsFee.value;
            settings.billsFee.capped = isDefined(charges.capped) ? charges.capped : settings.billsFee.capped;
            settings.billsFee.providerCap = isDefined(charges.providerCap) ? charges.providerCap : settings.billsFee.providerCap;
            settings.billsFee.markup = isDefined(charges.markup) ? charges.markup : settings.billsFee.markup;
            settings.billsFee.providerFee = isDefined(charges.providerFee) ? charges.providerFee : settings.billsFee.providerFee;
            settings.billsFee.providerMarkup = isDefined(charges.providerMarkup) ? charges.providerMarkup : settings.billsFee.providerMarkup;

            // set VAT and stamp duty
            settings.billsFee.vatType = charges.vatType ? charges.vatType : settings.billsFee.vatType;
            settings.billsFee.vatValue = isDefined(charges.vatValue) ? charges.vatValue : settings.billsFee.vatValue;
            settings.billsFee.stampDuty = isDefined(charges.stampDuty) ? charges.stampDuty : settings.billsFee.stampDuty

        }

        if (type === 'transfer') {

            // set fee and charges
            settings.transferFee.chargeFee = isDefined(charges.chargeFee, true) ? charges.chargeFee : settings.transferFee.chargeFee;
            settings.transferFee.type = charges.type ? charges.type : settings.transferFee.type;
            settings.transferFee.value = isDefined(charges.value) ? charges.value : settings.transferFee.value;
            settings.transferFee.capped = isDefined(charges.capped) ? charges.capped : settings.transferFee.capped;
            settings.transferFee.providerCap = isDefined(charges.providerCap) ? charges.providerCap : settings.transferFee.providerCap;
            settings.transferFee.markup = isDefined(charges.markup) ? charges.markup : settings.transferFee.markup;
            settings.transferFee.providerFee = isDefined(charges.providerFee) ? charges.providerFee : settings.transferFee.providerFee;
            settings.transferFee.providerMarkup = isDefined(charges.providerMarkup) ? charges.providerMarkup : settings.transferFee.providerMarkup;

            // set VAT and stamp duty
            settings.transferFee.vatType = charges.vatType ? charges.vatType : settings.transferFee.vatType;
            settings.transferFee.vatValue = isDefined(charges.vatValue) ? charges.vatValue : settings.transferFee.vatValue;
            settings.transferFee.stampDuty = isDefined(charges.stampDuty) ? charges.stampDuty : settings.transferFee.stampDuty

        }

        if (type === 'inflow') {

            // set fee and charges
            settings.inflowFee.chargeFee = isDefined(charges.chargeFee, true) ? charges.chargeFee : settings.inflowFee.chargeFee;
            settings.inflowFee.type = charges.type ? charges.type : settings.inflowFee.type;
            settings.inflowFee.value = isDefined(charges.value) ? charges.value : settings.inflowFee.value;
            settings.inflowFee.capped = isDefined(charges.capped) ? charges.capped : settings.inflowFee.capped;
            settings.inflowFee.providerCap = isDefined(charges.providerCap) ? charges.providerCap : settings.inflowFee.providerCap;
            settings.inflowFee.markup = isDefined(charges.markup) ? charges.markup : settings.inflowFee.markup;
            settings.inflowFee.providerFee = isDefined(charges.providerFee) ? charges.providerFee : settings.inflowFee.providerFee;
            settings.inflowFee.providerMarkup = isDefined(charges.providerMarkup) ? charges.providerMarkup : settings.inflowFee.providerMarkup;

            // set VAT and stamp duty
            settings.inflowFee.vatType = charges.vatType ? charges.vatType : settings.inflowFee.vatType;
            settings.inflowFee.vatValue = isDefined(charges.vatValue) ? charges.vatValue : settings.inflowFee.vatValue;
            settings.inflowFee.stampDuty = isDefined(charges.stampDuty) ? charges.stampDuty : settings.inflowFee.stampDuty

        }

        await settings.save()
        return settings;

    }

    /**
     * @name updateWalletSettings
     * @param data 
     * @returns 
     */
    public async updateWalletSettings(data: UpdateWalletSettingsDTO): Promise<ISettingDoc> {

        let { settings, inflow, outflow } = data;

        if (inflow) {
            settings.wallet.inflow = inflow;
        }

        if (outflow) {
            settings.wallet.outflow = outflow;
        }

        await settings.save()
        return settings;

    }

    /**
     * @name updatePaymentSettings
     * @param data 
     * @returns 
     */
    public async updatePaymentSettings(data: UpdatePaymentSettingsDTO): Promise<ISettingDoc> {

        let { settings, invoice, product, request } = data;

        if (invoice) {
            settings.paymentLink.invoice = invoice;
        }

        if (product) {
            settings.paymentLink.product = product;
        }

        if (request) {
            settings.paymentLink.request = request;
        }

        await settings.save()
        return settings;

    }

    /**
     * @name updateResourceSettings
     * @param data 
     * @returns 
     */
    public async updateResourceSettings(data: UpdateResourceSettingsDTO): Promise<ISettingDoc> {

        let { settings, invoice, product, refund } = data;

        if (invoice) {
            settings.invoice = invoice;
        }

        if (product) {
            settings.product = product;
        }

        if (refund) {
            settings.refund = refund;
        }

        await settings.save()
        return settings;

    }

    /**
     * @name updateBillsSettings
     * @param payload 
     * @returns 
     */
    public async updateBillsSettings(payload: UpdateBillsSettingsDTO): Promise<ISettingDoc> {

        let { settings, airtime, cable, data, electricity } = payload;

        if (airtime) {
            settings.bills.airtime = airtime;
        }

        if (cable) {
            settings.bills.cable = cable;
        }

        if (data) {
            settings.bills.data = data;
        }

        if (electricity) {
            settings.bills.electricity = electricity;
        }

        await settings.save()
        return settings;

    }

    /**
     * @name updateDomainSettings
     * @param settings 
     * @param domain 
     * @returns 
     */
    public async updateDomainSettings(settings: ISettingDoc, domain: string): Promise<ISettingDoc> {

        settings.domain = domain;
        await settings.save()

        return settings;

    }

    /**
     * @name defineFilterQuery
     * @param data 
     * @returns 
     */
    public defineFilterQuery(data: FilterBusinessDTO): Array<any> {

        let result: Array<any> = [];

        if (isDefined(data.type)) {
            result.push({ "businessType": data.type })
        }

        return result;

    }

}

export default new BusinessService();