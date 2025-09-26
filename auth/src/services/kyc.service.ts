import { UpdateAddressKYCDTO, UpdateBasicKYCDTO, UpdateIDKYCDTO } from '../dtos/compliance.dto';
import Kyc from '../models/Kyc.model';
import { IDType } from '../utils/enums.util';
import { IResult, IBasicKyc, IAddressKyc, IIDKYC, IUserDoc, IKycDoc } from '../utils/types.util'
import { arrayIncludes, checkDateFormat, isBase64, strIncludesEs6 } from '@btffamily/vacepay';

class KYCService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name validateBasicKyc
     * @param data 
     * @returns 
     */
    public async validateBasicKyc (data: UpdateBasicKYCDTO): Promise<IResult>{

        const allowed = ['male', 'female'];
        const allowedActions = ['save-new', 'update-data']
        let result: IResult = { error: false, message: '', data: null }
        const { firstName, lastName, middleName, dob, gender, phoneCode, phoneNumber, action } = data;
    
        if(!firstName){
            result.error = true;
            result.message = 'first name is required'
        }else if(action && !arrayIncludes(allowedActions, action)){
            result.error = true;
            result.message = `invalid action value. choose from ${allowedActions.join(', ')}`
        }else if(!lastName){
            result.error = true;
            result.message = 'last name is required'
        }else if(!middleName){
            result.error = true;
            result.message = 'middle name is required'
        }else if(!dob){
            result.error = true;
            result.message = 'date of birth [dob] is required'
        }else if(!checkDateFormat(dob)){
            result.error = true;
            result.message = 'invalid date format. use YYYY-MM-DD or YYYY/MM/DD'
        }else if(!gender){
            result.error = true;
            result.message = 'gender is required'
        }else if(!arrayIncludes(allowed, gender)){
            result.error = true;
            result.message = `invalid gender value. choose from ${allowed.join(', ')}`
        }else{
            result.error = false;
            result.message = ''
        }
    
        return result;
    
    }

    /**
     * @name validateIDKyc
     * @param data 
     * @returns 
     */
    public async validateIDKyc(data: UpdateIDKYCDTO): Promise<IResult> {

        const allowedActions = ['save-new', 'update-data']
        const allowed = ['card','passport','license', 'nin-slip'];
        let result: IResult = { error: false, message: '', data: null }
    
        if(!data.type){
            result.error = true;
            result.message = 'id type is required'
        }else if(!arrayIncludes(allowed, data.type)){
            result.error = true;
            result.message = `invalid type value. choose from ${allowed.join(', ')}`
        }else if(!data.front){
            result.error = true;
            result.message = 'id front image is required'
        }else if(!isBase64(data.front)){
            result.error = true;
            result.message = 'id front image is required to be a base64 string'
        }else if(data.type !== IDType.PASSPORT && !data.back){
            result.error = true;
            result.message = 'id back image is required'
        }else if(data.type !== IDType.PASSPORT && data.back && !isBase64(data.back)){
            result.error = true;
            result.message = 'id back image is required to be a base64 string'
        }else if(data.action && !arrayIncludes(allowedActions, data.action)){
            result.error = true;
            result.message = `invalid action value. choose from ${allowedActions.join(', ')}`
        }else {
            result.error = false;
            result.message = ''
        }
    
        return result;
    
    }

    /**
     * @name validateAddressKyc
     * @param data 
     * @returns 
     */
    public async validateAddressKyc(data: UpdateAddressKYCDTO): Promise<IResult> {

        const allowed = ['save-new', 'update-data']
        let result: IResult = { error: false, message: '', data: null }
        const { address, city, country, postalCode, state, utilityDoc, action } = data;
    
        if(!city){
            result.error = true;
            result.message = 'city is required'
        }else if(action && !arrayIncludes(allowed, action)){
            result.error = true;
            result.message = `invalid action value. choose from ${allowed.join(', ')}`
        }else if(!state){
            result.error = true;
            result.message = 'state is required'
        }else if(!address){
            result.error = true;
            result.message = 'address is required'
        }else if(!postalCode){
            result.error = true;
            result.message = 'postal code is required'
        }else if(!utilityDoc){
            result.error = true;
            result.message = 'utility document is required'
        }else if(!isBase64(utilityDoc)){
            result.error = true;
            result.message = 'utility document is required to be a base64 string'
        }else {
            result.error = false;
            result.message = ''
        }
    
        return result;
    
    }

    /**
     * @name createKYCData
     * @param user 
     */
    public async createKYCData(user: IUserDoc): Promise<void> {

        const exist = await Kyc.findOne({ user: user._id });

        if(!exist){

            const kyc = await Kyc.create({
                firstName: user.firstName,
                lastName: user.lastName,
                middleName: '',
                user: user._id
            });
    
            user.kyc = kyc._id;
            await user.save();

        }

        

    }

    /**
     * @name matchDateOfBirth
     * @param kyc 
     * @returns 
     */
    public async matchDateOfBirth(kyc: IKycDoc): Promise<boolean>{

        let result: boolean = false;
        const bvnData = kyc.bvnData;
        let splitDob: Array<string> = [];
        let splitBvnDob: Array<string> = [];

        // splt platform dob
        if(strIncludesEs6(kyc.dob, '/')){
            splitDob = kyc.dob.split('/');
        }else if(strIncludesEs6(kyc.dob, '-')){
            splitDob = kyc.dob.split('-');
        }

        // split api dob
        if(strIncludesEs6(bvnData.dob, '/')){
            splitBvnDob = bvnData.dob.split('/');
        }else if(strIncludesEs6(bvnData.dob, '-')){
            splitBvnDob = bvnData.dob.split('-');
        }

        await console.log(splitDob)
        await console.log(splitBvnDob);

        // match the data
        if(splitDob[0] === splitBvnDob[0] && splitDob[1] === splitBvnDob[1] && splitDob[2] === splitBvnDob[2]){
            result = true;
        }
        return result;

    }

    /**
     * @name matchBVNData
     * @param kyc 
     * @returns 
     */
    public async matchBVNData(kyc: IKycDoc): Promise<boolean>{

        let result: boolean = false;
        const bvnData = kyc.bvnData;

        const isFirstName = kyc.firstName.trim().toLowerCase() === bvnData.firstName.toLowerCase();
        const isLastName = kyc.lastName.trim().toLowerCase() === bvnData.lastName.toLowerCase();
        const isGender = kyc.gender.trim().toLowerCase() === bvnData.gender.toLowerCase();
        const isDateOfBirth = await this.matchDateOfBirth(kyc);

        if(isFirstName && isLastName && isGender && isDateOfBirth){
            result = true;
        }

        return result;

    }

    /**
     * @name matchNINData
     * @param kyc 
     * @returns 
     */
    public async matchNINData(kyc: IKycDoc): Promise<boolean>{

        let result: boolean = false;
        let gender: string = '';
        const ninData = kyc.ninData;
        
        if(ninData.gender.toLowerCase() === 'm'){
            gender = 'male'
        }else if(ninData.gender.toLowerCase() === 'f'){
            gender = 'female'
        }else{
            gender = ninData.gender.toLowerCase();
        }

        const isFirstName = kyc.firstName.trim().toLowerCase() === ninData.firstName.toLowerCase();
        const isLastName = kyc.lastName.trim().toLowerCase() === ninData.lastName.toLowerCase();
        const isGender = kyc.gender.trim().toLowerCase() === gender.toLowerCase();

        if(isFirstName && isLastName && isGender){
            result = true;
        }

        return result;

    }

}

export default new KYCService();
