import { MappedBankDTO } from "../dtos/bank.dto";
import { MappedCountryDTO } from "../dtos/country.dto";
import { ProviderNameType } from "../utils/enums.util";
import ENV from "../utils/env.util";
import { IBankDoc, ICountryDoc, IResult } from "../utils/types.util";

class BankMapper{

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name filterBankCode
     * @param data 
     * @returns 
     */
    private async filterBankCode(data: IBankDoc): Promise<string> {

        let code: string = '';

        if (data.providers && data.providers.length > 0) {

            const bani = data.providers.find((x) => x.name === ProviderNameType.BANI);
            const paystack = data.providers.find((x) => x.name === ProviderNameType.PAYSTACK);

            if (ENV.isProduction()) {

                if (paystack && bani) {

                    if (paystack.production.code && !bani.production.code) {
                        code = paystack.production.code
                    } else if (!paystack.production.code && bani.production.code) {
                        code = bani.production.code
                    } else if (paystack.production.code && bani.production.code) {
                        code = bani.production.code
                    }

                } else if (paystack && !bani) {
                    code = paystack.production.code
                } else if (!paystack && bani) {
                    code = bani.production.code
                } else {
                    code = data.code;
                }

            } else {

                const provider = data.providers.find((x) => {
                    if (x.active && x.bankCode) {
                        return x;
                    }
                });

                // if (provider) {
                //     code = provider.bankCode;
                // } else {
                //     code = data.code;
                // }

                code = data.code;

            }

        }

        return code;


    }

    /**
     * @name mapCountryData
     * @param data 
     * @returns 
     */
    public async mapBankData(data: IBankDoc): Promise<MappedBankDTO>{

        let code = await this.filterBankCode(data);

        let result: MappedBankDTO = {
            name: data.legalName,
            code: data.platformCode,
            country: data.country,
            currency: data.currency,
            isEnabled: data.isEnabled,
            type: data.type,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        }

        return result;

    }

    /**
     * @name mapCountryList
     * @param data 
     * @returns 
     */
    public async mapBankList(data: Array<IBankDoc>): Promise<Array<MappedBankDTO>>{

        let result: Array<MappedBankDTO> = [];

        for(let i = 0; i < data.length; i++){

            let bank = data[i];
            let mapped = await this.mapBankData(bank);

            result.push(mapped);

        }

        return result;

    }

}

export default new BankMapper()