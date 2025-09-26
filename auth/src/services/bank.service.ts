import { BankProviderDTO } from '../dtos/provider.dto';
import { ProviderType } from '../utils/enums.util';
import ENV from '../utils/env.util';
import { IBank, IResult } from '../utils/types.util'
import SystemService from './system.service';

class BankService {

    public result: IResult;
    private banks: Array<IBank>;

    constructor () {
        this.result = { error: false, message: '', data: null }
        this.banks = [];
    }
    /**
     * @name formatAccountName
     * @param name 
     * @returns 
     */
    public formatAccountName(name: string): { first: string, middle: string, last: string }{
        let result: { first: string, middle: string, last: string } = { first: '', middle: '', last: '' };

        const split = name.split(' ');

        if(split.length > 1){

            result.first = split[0];
            result.middle = split[1] ? split[1] : ''
            result.last = split[2] ? split[2] : '';

        }else{
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

            result = bank; // capture bank details

            // find provider
            const provider = bank.providers.find((x) => {
                if (x.name === name) {
                    return x;
                }
            })

            if (provider) {
                result.code = provider.production.code.toString()
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
                    const pcCode = provider.name === ProviderType.BANI && provider.bankCode === bank.code ? bank.code : provider.bankCode
                    result.code = pcCode
                }

                result.listCode = provider.id ? provider.id : provider.name === ProviderType.BANI ? "02" : bank.code;
                result.provider = provider;

            } else {
                result.code = bank.code
                result.listCode = bank.code
            }

        }

        return result;

    }

}

export default new BankService();