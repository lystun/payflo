import { Random, UIID, strIncludesEs6 } from '@btffamily/vacepay';
import { CreateAccountDataDTO, UpdateAccountDetailsDTO } from '../dtos/account.dto';
import Account from '../models/Account.model';
import Provider from '../models/Provider.model';
import { PrefixType, ProviderNameType } from '../utils/enums.util';
import { IAccountDoc, IBank, IBusinessDoc, IProviderDoc, IResult, ITransactionDoc } from '../utils/types.util'
import { BaniResponseDTO } from '../dtos/providers/bani.dto';
import SystemService from './system.service';
import { PSBApiResponseDTO } from '../dtos/providers/ninepsb.dto';
import ProviderService from './provider.service';
import BankService from './bank.service';
import { ResolvedBankDTO } from '../dtos/provider.dto';

class AccountService {

    constructor () {
    }

    /**
     * @name createAccountData
     * @param data 
     * @returns 
     */
    public async createAccountData(data: CreateAccountDataDTO): Promise<IResult>{

        let result: IResult = { error: false, message: '', code: 200, data: null }

        const { providerName, business, type } = data;

        const provider = await Provider.findOne({ name: providerName });

        if(provider){

            const exist = await Account.findOne({ provider: provider._id, business: business._id });

            if(!exist){

                let gen = `${PrefixType.ACCOUNT}${UIID(1)}`;

                const account = await Account.create({
                    code: gen.toString(),
                    currency: 'NGN',
                    isEnabled: true,
                    business: business._id,
                    provider: provider._id,
                    accountType: type,
                    description: `Vacepay generated bank account for ${business.name ? business.name : business.officialEmail } using ${provider.name} platform`
                });

                business.accounts.push(account._id);
                await business.save();


                result.data = account;

            }else{

                result.data = exist;

            }

        }else{

            result.code = 404;
            result.error = true;
            result.data = null;
            result.message = 'provider does not exist'

        }

        return result;

    }

    /**
     * @name updateBankDetails
     * @param account 
     * @param response 
     */
    public async updateBankDetails(data: UpdateAccountDetailsDTO): Promise<IAccountDoc>{

        let { account, response, provider } = data;

        const banks = await SystemService.readBanks();

        if(provider === ProviderNameType.BANI){

            let resp: BaniResponseDTO = response;

            const _name = resp.holder_bank_name.toString().split(' ');

            const bank = banks.find((x) => {
                if(strIncludesEs6(x.name.toLowerCase(), _name[0].toLowerCase())){
                    return x;
                }
            });

            account.accountName = resp.account_name
            account.accountNo = resp.holder_account_number.toString()
            account.accountType = resp.account_type
            account.providerRef = resp.payment_reference;
            account.limits.push({
                name: 'Daily Transfer',
                label: '0',
                value: 0
            });

            if(bank){
                account.bank = {
                    legalName: bank.legalName,
                    name: bank.name.toLowerCase(),
                    bankCode: bank.code,
                    bankType: bank.type
                }
            }

            await account.save()

        }

        if(provider === ProviderNameType.NINEPSB){

            let resp: PSBApiResponseDTO = response;
            const code: string = (process.env.NINEPSB_BANK_CODE || '120001').toString();
            const bank = banks.find((x) => x.code === code);

            // resolve the account
            const resolve = await BankService.resolveBankAccount({
                accountNo: resp.customer.account.number.toString(),
                bankCode: code,
                name: provider
            });

            const bankSender: ResolvedBankDTO = resolve.data;

            account.accountName = !resolve.error ? bankSender.accountName : `VACEPAY/${resp.customer.account.name}`;
            account.accountNo = !resolve.error ? bankSender.accountNo : resp.customer.account.number.toString()
            account.accountType = resp.customer.account.type.toLowerCase()
            account.providerRef = resp.transaction.reference;
            account.limits.push({
                name: 'Daily Transfer',
                label: '0',
                value: 0
            });

            if(bank){
                account.bank = {
                    legalName: bank.name,
                    name: '9payment service bank',
                    bankCode: bank.code,
                    bankType: bank.type
                }
            }

            await account.save();

        }

        return account;

    }

    /**
     * @name updateCustomerDetails
     * @param data 
     */
    public async updateCustomerDetails(data: UpdateAccountDetailsDTO): Promise<IAccountDoc>{

        let { account, response, provider, note } = data;

        if(provider === ProviderNameType.BANI){

            let resp: BaniResponseDTO = response;

            account.customer.note = note ? note : '';
            account.customer.reference = resp.customer_ref;

            await account.save();

        }

        if(provider === ProviderNameType.NINEPSB){

            let resp: PSBApiResponseDTO = response;

            account.customer.note = note ? note : '';
            account.customer.reference = resp.transaction.reference;

            await account.save();

        }

        return account;

    }

    /**
     * @name updateBankInflow
     * @param account 
     * @param amount 
     * @returns 
     */
    public async updateBankInflow(account: IAccountDoc, transaction: ITransactionDoc): Promise<IAccountDoc>{

        account.balance = account.balance + transaction.amount;
        await account.save();
        return account;

    }

    /**
     * @name updateWalletOutflow
     * @param account 
     * @param amount 
     * @returns 
     */
    public async updateAccountOutflow(account: IAccountDoc, transaction: ITransactionDoc): Promise<IAccountDoc>{

        account.balance = account.balance - (transaction.amount + transaction.fee);
        await account.save();
        return account;

    }

    /**
     * @name accountExists
     * @param provider 
     * @param business 
     * @returns 
     */
    public async accountExists(provider: IProviderDoc, business: IBusinessDoc): Promise<boolean> {

        let result: boolean = false;

        const account = await Account.findOne({ provider: provider._id, business: business._id });

        if (account && account.customer.reference && account.accountNo && account.accountName) {
            result = true;
        }

        return result;

    }

}

export default new AccountService();