import { Random, UIID } from '@btffamily/vacepay';
import { AddBeneficiaryDTO } from '../dtos/business.dto';
import Beneficiary from '../models/Beneficiary.model';
import { IBeneficiaryDoc, IResult } from '../utils/types.util'

class BeneficiaryService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name addBeneficiary
     * @param data 
     * @returns 
     */
    public async addBeneficiary(data: AddBeneficiaryDTO): Promise<IBeneficiaryDoc>{

        const { business, bank, accountName, accountNo } = data;

        const exist = await Beneficiary.findOne({ business: business._id, accountNo: accountNo });

        if(exist){
            return exist;
        }else{

            let code: string = Random.randomCode(8,true).toUpperCase();

            const beneficiary = await Beneficiary.create({
                code: code.toString(),
                isEnabled: true,
                accountName: accountName,
                accountNo: accountNo,
                bank: {
                    bankCode: bank.bankCode,
                    platformCode: bank.platformCode,
                    bankId: bank.platformCode,
                    name: bank.name,
                    legalName: bank.legalName
                },
                providers: bank.providers,
                business: business._id
            });

            business.beneficiaries.push(beneficiary._id);
            await business.save();

            return beneficiary;

        }

    }

}

export default new BeneficiaryService();