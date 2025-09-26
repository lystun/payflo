import { IBankDoc, IBeneficiaryDoc, IResult, ISubaccountDoc } from '../utils/types.util'
import { MapReplaceBankCodeDTO, MapReplaceBankCodeListDTO, MapReplaceCodeListDTO } from '../dtos/bank.dto';

class BankMapper {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name rep
     * @param beneficiary 
     * @returns 
     */
    public async mapReplaceBankCode(data: MapReplaceBankCodeDTO): Promise<any> {

        const { type, bank, beneficiary, subaccount } = data;

        if (type === 'beneficiary' && beneficiary) {

            let bank = beneficiary.bank;

            if (bank.bankCode && bank.platformCode) {
                bank.bankCode = bank.platformCode
            }

            await console.log("After", bank);

            beneficiary.bank = bank;

            return beneficiary;

        }

        if (type === 'bank' && bank) {

            if (bank.code && bank.platformCode) {
                bank.code = bank.platformCode
            }

            return bank;

        }

        if (type === 'subaccount' && subaccount) {

            if (subaccount.bank && subaccount.bank.platformCode) {
                subaccount.bank.bankCode = subaccount.bank.platformCode
            }

            return subaccount;

        }

    }

    /**
     * @name mapReplaceBankCodeList
     * @param data 
     * @returns 
     */
    public async mapReplaceBankCodeList(data: MapReplaceBankCodeListDTO): Promise<MapReplaceCodeListDTO> {

        let beneficiaryList: Array<IBeneficiaryDoc> = [];
        let bankList: Array<IBankDoc> = [];
        let subaccountList: Array<ISubaccountDoc> = [];

        const { type, banks, beneficiaries, subaccounts } = data;

        if (type === 'beneficiary' && beneficiaries) {

            for (let i = 0; i < beneficiaries.length; i++) {

                let beneficiary = beneficiaries[i];
                let mapped = await this.mapReplaceBankCode({
                    type: 'beneficiary',
                    beneficiary: beneficiary
                })

                beneficiaryList.push(mapped)

            }

        }

        if (type === 'bank' && banks) {

            for (let i = 0; i < banks.length; i++) {

                let bank = banks[i];
                let mapped = await this.mapReplaceBankCode({
                    type: 'bank',
                    bank: bank
                })

                bankList.push(mapped)

            }

        }

        if (type === 'subaccount' && subaccounts) {

            for (let i = 0; i < subaccounts.length; i++) {

                let subaccount = subaccounts[i];
                let mapped = await this.mapReplaceBankCode({
                    type: 'subaccount',
                    subaccount: subaccount
                })

                subaccountList.push(mapped)

            }

        }

        return { beneficiaries: beneficiaryList, banks: bankList, subaccounts: subaccountList }

    }

}

export default new BankMapper();