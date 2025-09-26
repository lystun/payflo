import { CreateBankDTO } from '../dtos/account.dto';
import { BaniResponseDTO } from '../dtos/providers/bani.dto';
import { PSBApiResponseDTO } from '../dtos/providers/ninepsb.dto';
import { BankProviderDTO, ResolveBankDTO } from '../dtos/provider.dto';
import Bank from '../models/Bank.model';
import { ProviderNameType } from '../utils/enums.util';
import ENV from '../utils/env.util';
import { IBank, IBankDoc, IBankProvider, IResult } from '../utils/types.util'
import ProviderService from './provider.service';
import NinepsbService from './providers/ninepsb.service';
import SystemService from './system.service';
import e from 'express';

class BankService {

    public result: IResult;
    private banks: Array<IBank>;

    constructor() {
        this.result = { error: false, message: '', data: null }
        this.banks = [];
    }

    /**
     * @name createBank
     * @param code 
     * @returns 
     */
    public async createBank(data: CreateBankDTO): Promise<IBankDoc> {

        this.banks = await SystemService.readBanks();
        let result: IResult = { error: false, message: '', data: null }

        const { code, accountName, accountNo, business, provider } = data;
        const bank = await this.getBank(code, provider.name);

        if (bank) {

            const exist = await Bank.findOne({ code: bank.code, accountNo: accountNo, business: business._id });

            if (exist) {
                result.data = exist;
            } else {

                const newBank = await Bank.create({
                    code: bank.code,
                    platformCode: bank.platformCode,
                    accountName: accountName,
                    accountNo: accountNo,
                    name: bank.name.toLowerCase(),
                    legalName: bank.legalName,
                    type: bank.type,
                    country: bank.country,
                    currency: bank.currency,
                    providers: bank.providers,
                    business: business._id
                });

                result.data = newBank;

            }

        }

        return result.data;

    }

    /**
     * @name formatAccountName
     * @param name 
     * @returns 
     */
    public formatAccountName(name: string): { first: string, middle: string, last: string } {
        let result: { first: string, middle: string, last: string } = { first: '', middle: '', last: '' };

        const split = name.split(' ');

        if (split.length > 1) {

            result.first = split[0];
            result.middle = split[1] ? split[1] : ''
            result.last = split[2] ? split[2] : '';

        } else {
            result.first = split[0];
        }

        return result;
    }

    /**
     * @name getBank
     * @param code 
     * @param name 
     * @returns 
     */
    public async getBank(code: string, name: string): Promise<IBank | null> {

        let result: IBank | null = null;
        const bankList = await SystemService.readBanks();

        const bank = bankList.find((x) => x.platformCode === code);

        if (ENV.isProduction() && bank) {

            // find provider
            const provider = bank.providers.find((x) => {
                if (x.name === name) {
                    return x;
                }
            })

            if (provider) {

                result = bank; // capture bank details
                result.code = provider.production.code.toString()
                result.platformCode = bank.platformCode;
                result.listCode = provider.production.list;
                result.provider = provider;
                
            }


        } else if ((ENV.isStaging() || ENV.isDev()) && bank) {

            result = bank; // capture bank details

            // find provider
            const provider = bank.providers.find((x) => {
                if (x.name === name) {
                    return x;
                }
            })

            if (provider) {

                if (provider.bankCode === bank.code) {
                    result.code = bank.code
                } else {
                    const pcCode = provider.name === ProviderNameType.BANI && provider.bankCode === bank.code ? bank.code : provider.bankCode
                    result.code = pcCode
                }

                result.platformCode = bank.platformCode;
                result.listCode = provider.id ? provider.id : bank.code;
                result.provider = provider;

            } else {
                result.code = bank.code
                result.platformCode = bank.platformCode;
                result.listCode = bank.code
            }

        }

        return result;

    }

    /**
     * @name resolveBankAccount
     * @param data 
     * @returns 
     */
    public async resolveBankAccount(data: ResolveBankDTO): Promise<IResult> {

        let response: IResult = { error: false, message: '', code: 200, data: null };
        const { bankCode, accountNo, name } = data;

        const bank = await this.getBank(bankCode, name);

        if (bank && bank.provider && bank.provider.name === ProviderNameType.PAYSTACK) {

            response = await ProviderService.resolveAccount({
                accountNo,
                code: bank.code,
                provider: ProviderNameType.PAYSTACK,
                type: 'nuban'
            });

            if (!response.error) {

                response.data = {
                    accountNo: response.data.account_number,
                    accountName: response.data.account_name,
                    bankCode: bank.code,
                    platformCode: bank.platformCode,
                    bankName: bank.legalName,
                    bankId: bank.platformCode,
                    providers: bank.providers
                }

            }

        }

        if (bank && bank.provider && bank.provider.name === ProviderNameType.BANI) {

            response = await ProviderService.resolveAccount({
                accountNo,
                code: bank.code,
                countryCode: 'NG',
                listCode: bank.listCode,
                provider: ProviderNameType.BANI,
                type: 'nuban'
            });

            const _response: BaniResponseDTO = response.data;

            if (!response.error) {

                response.data = {
                    accountNo: _response.account_number,
                    accountName: _response.account_name,
                    bankCode: bank.code,
                    platformCode: bank.platformCode,
                    bankName: _response.bank_name,
                    bankId: bank.platformCode,
                    providers: bank.providers
                }

            }

        }

        if (bank && bank.provider && bank.provider.name === ProviderNameType.NINEPSB) {

            response = await ProviderService.resolveAccount({
                accountNo,
                code: bank.code,
                provider: ProviderNameType.NINEPSB,
                type: 'nuban'
            });

            if (!response.error) {

                const _response: PSBApiResponseDTO = response.data;

                response.data = {
                    accountNo: _response.customer.account.number,
                    accountName: _response.customer.account.name,
                    bankCode: bank.code,
                    platformCode: bank.platformCode,
                    bankName: bank.legalName,
                    bankId: bank.platformCode,
                    providers: bank.providers
                }

            }

        }

        return response;

    }

}

export default new BankService();