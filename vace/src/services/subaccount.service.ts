import { Random, arrayIncludes, hasDecimal, isDefined, isNeg, isPrecise, isZero, notDefined } from '@btffamily/vacepay';
import { CreateSubaccountDTO, CreateSubaccountRequestDTO, FilterSubaccountDTO, UpdateSubaccountDTO } from '../dtos/subaccount.dto';
import Subaccount from '../models/Subaccount.model';
import { PrefixType, UserType, ValueType } from '../utils/enums.util';
import { IResult, ISubaccountDoc, IUserDoc } from '../utils/types.util'

interface IOverview {
    total: number, 
    active: number, 
    inactive: number, 
    inflow: number
}

class SubaccountService {

    constructor() {

    }

    /**
     * @name validateCreateSubaccount
     * @param data 
     * @returns 
     */
    public async validateCreateSubaccount(data: CreateSubaccountRequestDTO): Promise<IResult> {

        const allowed = ['percentage'];

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { accountNo, bankCode, email, name, phoneNumber, split } = data;

        if (!email) {
            result.error = true;
            result.message = 'email is required'
        } else if (!name) {
            result.error = true;
            result.message = 'subacccount name is required'
        } else if (!phoneNumber) {
            result.error = true;
            result.message = 'phone number is required'
        } else if (!accountNo) {
            result.error = true;
            result.message = 'account number is required'
        } else if (!bankCode) {
            result.error = true;
            result.message = 'bank code is required'
        } else if (!split.type) {
            result.error = true;
            result.message = 'split type is required'
        } else if (!arrayIncludes(allowed, split.type)) {
            result.error = true;
            result.message = `invalid split type value. choose from ${allowed}`
        } else if (!split.value || isZero(split.value) || isNeg(split.value)) {
            result.error = true;
            result.message = 'split value is required and cannot be zero or negative'
        } else if (hasDecimal(split.value) && !isPrecise({ value: split.value, length: 2 })) {
            result.error = true;
            result.message = 'decimal places cannot be more than 2'
        } else if (split.type === ValueType.PERCENTAGE && split.value > 100) {
            result.error = true;
            result.message = 'percentage value cannot be greater than 100'
        } else {
            result.error = false;
            result.message = ''
        }

        return result;

    }

    /**
     * @name validateUpdateSubaccount
     * @param data 
     * @returns 
     */
    public async validateUpdateSubaccount(data: UpdateSubaccountDTO): Promise<IResult> {

        const allowed = ['percentage', 'flat'];

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { split } = data;

        if (split.type && !arrayIncludes(allowed, split.type)) {
            result.error = true;
            result.message = `invalid split type value. choose from ${allowed}`
        } else if (split.value && isNeg(split.value)) {
            result.error = true;
            result.message = 'split value cannot be zero or negative'
        } else if (split.value && hasDecimal(split.value) && !isPrecise({ value: split.value, length: 2 })) {
            result.error = true;
            result.message = 'decimal places cannot be more than 2'
        } else if (split.type && split.value && split.type === ValueType.PERCENTAGE && split.value > 100) {
            result.error = true;
            result.message = 'percentage value cannot be greater than 100'
        } else {
            result.error = false;
            result.message = ''
        }

        return result;

    }

    /**
     * @name createSubaccount
     * @param data 
     * @returns 
     */
    public async createSubaccount(data: CreateSubaccountDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { business, split, name, bank, email, phoneCode, phoneNumber, description } = data;

        const exist = await Subaccount.findOne({ email: email, business: business._id });

        if (exist) {

            result.error = true;
            result.message = `subaccount ${exist.email} already exist`;
            result.data = exist;

        } else {

            let code: string = `${PrefixType.SUBACCOUNT}_${Random.randomCode(10, true)}`;

            const subaccount = await Subaccount.create({
                code: code,
                name: name,
                description: description ? description : '',
                split: {
                    type: split.type,
                    value: split.value
                },
                email: email,
                phoneCode: phoneCode,
                phoneNumber: phoneNumber,
                bank: {
                    accountName: bank.accountName,
                    accountNo: bank.accountNo,
                    bankCode: bank.bankCode,
                    platformCode: bank.platformCode,
                    legalName: bank.legalName,
                    name: bank.name
                },
                business: business._id
            });

            business.subaccounts.push(subaccount._id);
            await business.save();

            result.error = false;
            result.data = subaccount;

        }

        return result;

    }

    /**
     * @name defineFilterQuery
     * @param data 
     * @returns 
     */
    public defineFilterQuery(data: FilterSubaccountDTO): Array<any>{

        let result: Array<any> = [];

        if(isDefined(data.isEnabled, true)){
            result.push({ "isEnabled": data.isEnabled })
        }

        if(isDefined(data.business)){
            result.push({ "business": data.business })
        }

        if(isDefined(data.type)){
            result.push({ "split.type": data.type })
        }

        return result;

    }

    /**
     * @name getOverview
     * @param user 
     * @returns 
     */
    public async getOverview(user: IUserDoc): Promise<IOverview>{

        let total: number = 0, active: number = 0, inactive: number = 0, inflow: number = 0;

        if(user.userType === UserType.ADMIN || user.userType === UserType.SUPER){

            total = await Subaccount.countDocuments();
            active = await Subaccount.countDocuments({ isEnabled: true })
            inactive = await Subaccount.countDocuments({ isEnabled: false })

            const subaccounts = await Subaccount.find({});
            subaccounts.forEach((x) => {
                inflow = inflow + x.inflow.value;
            })

        }else if(user.userType === UserType.BUSINESS){

            total = await Subaccount.countDocuments({ business: user.business });
            active = await Subaccount.countDocuments({ isEnabled: true, business: user.business })
            inactive = await Subaccount.countDocuments({ isEnabled: false, business: user.business })

            const subaccounts = await Subaccount.find({ business: user.business });
            subaccounts.forEach((x) => {
                inflow = inflow + x.inflow.value;
            })

        }

        return {
            total,
            active,
            inactive,
            inflow
        }

    }

}

export default new SubaccountService();