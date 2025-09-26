import { IBasicKYBDTO, IKYBBankDTO, IKYBRegDTO, IKYBSocialDTO, UpdateBankKYBDTO, UpdateBasicKYBDTO, UpdateCompanyKYBDTO, UpdateLegalDetailsDTO, UpdateOwnerKYBDTO } from '../dtos/compliance.dto';
import Kyb from '../models/Kyb.model';
import Kyc from '../models/Kyc.model';
import { IResult, IBasicKyc, IAddressKyc, IIDKYC, IUserDoc, IKYBDoc, IKYBSocial } from '../utils/types.util'
import { arrayIncludes, charLen, checkDateFormat, isBase64, isString, notDefined, strIncludesEs6 } from '@btffamily/vacepay';
import SystemService from './system.service';
import { SaveActionType } from '../utils/enums.util';

class KYBService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name validateBasicKYB
     * @param data 
     * @returns 
     */
    public async validateBasicKYB(data: UpdateBasicKYBDTO): Promise<IResult> {

        const allowed = ['save-new', 'update-data']
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { address, category, city, industry, phoneCode, postalCode, profile, staffStrength, state, action } = data;

        if (!profile) {
            result.error = true;
            result.message = 'business profile is required'
        } else if (action && !arrayIncludes(allowed, action)) {
            result.error = true;
            result.message = `invalid action value. choose from ${allowed.join(', ')}`
        } else if (!staffStrength) {
            result.error = true;
            result.message = 'staff strength is required'
        } else if (!category) {
            result.error = true;
            result.message = 'business category is required'
        } else if (!industry) {
            result.error = true;
            result.message = 'business industry is required'
        } else if (!address) {
            result.error = true;
            result.message = 'official address is required'
        } else if (!city) {
            result.error = true;
            result.message = 'city is required'
        } else if (!state) {
            result.error = true;
            result.message = 'state is required'
        } else if (!phoneCode) {
            result.error = true;
            result.message = 'country phone code is required'
        } else if (!postalCode) {
            result.error = true;
            result.message = 'postal code is required'
        } else {
            result.error = false;
            result.message = ''
        }

        return result;

    }

    /**
     * @name validateUpdateLegalDetails
     * @param data 
     * @returns 
     */
    public async validateUpdateLegalDetails(data: UpdateLegalDetailsDTO): Promise<IResult> {

        const allowed = ['bvn', 'nin', 'legal']
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { bvn, nin, type, update } = data;

        if (!type) {
            result.error = true;
            result.message = 'update type is required'
        } else if (type && !arrayIncludes(allowed, type)) {
            result.error = true;
            result.message = `invalid update type. choose from ${allowed.join(', ')}`
        } else if (type === 'bvn' && !bvn) {
            result.error = true;
            result.message = 'bvn number is required'
        } else if (type === 'bvn' && bvn && charLen(bvn) !== 11) {
            result.error = true;
            result.message = 'bvn number is required to be 11 digits'
        } else if (type === 'nin' && !nin) {
            result.error = true;
            result.message = 'nin number is required'
        } else if (type === 'nin' && nin && charLen(nin) !== 11) {
            result.error = true;
            result.message = 'nin number is required to be 11 digits'
        } else if (type === 'legal' && !nin) {
            result.error = true;
            result.message = 'nin number is required'
        } else if (type === 'legal' && nin && charLen(nin) !== 11) {
            result.error = true;
            result.message = 'nin number is required to be 11 digits'
        } else if (type === 'legal' && !bvn) {
            result.error = true;
            result.message = 'bvn number is required'
        } else if (type === 'legal' && bvn && charLen(bvn) !== 11) {
            result.error = true;
            result.message = 'bvn number is required to be 11 digits'
        } else {
            result.error = false;
            result.message = ''
        }

        return result;

    }


    /**
     * @name validateRegKYB
     * @param data 
     * @returns 
     */
    public async validateCompanyKYB(data: UpdateCompanyKYBDTO): Promise<IResult> {

        const allowedTypes = ['starter', 'registered']
        const allowedCatgeories = ['business-name', 'limited-liability', 'privately-held', 'ngo-organization', 'plc-organization']
        const allowed = ['save-new', 'update-data']
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { cacNumber, certificate, handles, officialEmail, tinNumber, type, websiteUrl, category, action } = data;

        if (!category) {
            result.error = true;
            result.message = 'registration category is required'
        } else if (action && !arrayIncludes(allowed, action)) {
            result.error = true;
            result.message = `invalid action value. choose from ${allowed.join(', ')}`
        } else if (!arrayIncludes(allowedCatgeories, category)) {
            result.error = true;
            result.message = `invalid registration category. choose from ${allowedCatgeories.join(', ')}`
        } else if (!type) {
            result.error = true;
            result.message = 'registration type is required'
        } else if (!arrayIncludes(allowedTypes, type)) {
            result.error = true;
            result.message = `invalid registration type. choose from ${allowedTypes.join(', ')}`
        } else if ((notDefined(action) || action === SaveActionType.SAVE) && !certificate) {
            result.error = true;
            result.message = 'company certificate is required'
        } else if ((notDefined(action) || action === SaveActionType.SAVE) && !isBase64(certificate)) {
            result.error = true;
            result.message = 'company certificate is required to be a base64 string'
        } else if (!cacNumber) {
            result.error = true;
            result.message = 'company registration number is required'
        } else if (!officialEmail) {
            result.error = true;
            result.message = 'company official email is required'
        } else if (!tinNumber) {
            result.error = true;
            result.message = 'company tin number is required'
        } else if (!websiteUrl) {
            result.error = true;
            result.message = 'company website url is required'
        } else {
            result.error = false;
            result.message = ''
        }

        return result;

    }

    /**
     * @name validateOwnerKYB
     * @param data 
     * @returns 
     */
    public async validateOwnerKYB(data: UpdateOwnerKYBDTO): Promise<IResult> {

        const allowed = ['save-new', 'update-data']
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { address, bvn, dob, idCard, name, nationality, nin, utilityDoc, action } = data;

        if (!name) {
            result.error = true;
            result.message = 'owner full name is required'
        } else if (action && !arrayIncludes(allowed, action)) {
            result.error = true;
            result.message = `invalid action value. choose from ${allowed.join(', ')}`
        } else if (!dob) {
            result.error = true;
            result.message = 'owner date of birth is required'
        } else if (!checkDateFormat(dob)) {
            result.error = true;
            result.message = 'date of birth should be in YYYY-MM-DD or YYYY/MM/DD format'
        } else if (!nationality) {
            result.error = true;
            result.message = 'owner nationality is required'
        } else if (!bvn) {
            result.error = true;
            result.message = 'owner BVN is required'
        } else if (charLen(bvn) < 11 || charLen(bvn) > 11) {
            result.error = true;
            result.message = 'owner BVN cannot be less/greater than 11 digits'
        } else if (!nin) {
            result.error = true;
            result.message = 'owner NIN is required'
        } else if (charLen(nin) < 11 || charLen(nin) > 11) {
            result.error = true;
            result.message = 'owner BVN cannot be less/greater than 11 digits'
        } else if (!address) {
            result.error = true;
            result.message = 'owner address is required'
        } else if (!idCard) {
            result.error = true;
            result.message = 'owner id card is required'
        } else if (!isBase64(idCard)) {
            result.error = true;
            result.message = 'owner id card is required to be a base64 string'
        } else if (!utilityDoc) {
            result.error = true;
            result.message = 'owner proof of address is required'
        } else if (!isBase64(utilityDoc)) {
            result.error = true;
            result.message = 'owner proof of address is required to be a base64 string'
        } else {
            result.error = false;
            result.message = ''
        }

        return result;

    }

    /**
     * @name validateBankKYB
     * @param data 
     * @returns 
     */
    public async validateBankKYB(data: UpdateBankKYBDTO): Promise<IResult> {

        const allowed = ['save-new', 'update-data']
        let result: IResult = { error: false, message: '', data: null }

        if (!data.bankCode) {
            result.error = true;
            result.message = 'bank code is required'
        } else if (data.action && !arrayIncludes(allowed, data.action)) {
            result.error = true;
            result.message = `invalid action value. choose from ${allowed.join(', ')}`
        } else if (!data.accountNo) {
            result.error = true;
            result.message = 'account number is required'
        } else if (!data.accountName) {
            result.error = true;
            result.message = 'account name is required'
        } else {
            result.error = false;
            result.message = ''
        }

        return result;

    }

    /**
     * @name updateSocials
     * @param KYB 
     * @param list 
     */
    public async updateSocials(KYB: IKYBDoc, list: Array<IKYBSocialDTO>): Promise<void> {

        let socials = KYB.socials;

        for (let i = 0; i < list.length; i++) {

            let data: IKYBSocialDTO = list[i];

            const handle = socials.find((x) => x.name.toLowerCase() === data.name.toLowerCase());
            const handleIndex = socials.findIndex((x) => x.name.toLowerCase() === data.name.toLowerCase());

            if (handle && handleIndex >= 0) {
                handle.url = data.url ? data.url : handle.url;
                handle.username = data.username ? data.username : handle.username;
                handle.description = data.description ? data.description : handle.description;

                socials.splice(handleIndex, 1, handle);
                KYB.socials = socials;

            } else {

                const handle: IKYBSocial = {
                    name: data.name,
                    url: data.url,
                    username: data.username,
                    description: data.description
                }

                KYB.socials.push(handle);
            }

        }

        await KYB.save();

    }

    /**
     * @name initializeKYBData
     * @param user 
     */
    public async initializeKYBData(user: IUserDoc, type: string): Promise<void> {

        const exist = await Kyb.findOne({ user: user._id });

        if (!exist) {

            const kyb = await Kyb.create({
                user: user._id,
                socials: [
                    { name: 'facebook', username: 'business' },
                    { name: 'twitter', username: 'business' },
                    { name: 'instagram', username: 'business' },
                    { name: 'threads', username: 'business' },
                    { name: 'linkedin', username: 'business' }
                ]
            });

            user.kyb = kyb._id;
            user.businessType = type;
            await user.save();

        }



    }

    /**
     * @name matchDateOfBirth
     * @param kyb 
     * @returns 
     */
    public async matchDateOfBirth(kyb: IKYBDoc): Promise<boolean> {

        let result: boolean = false;
        const bvnData = kyb.bvnData;
        let splitDob: Array<string> = [];
        let splitBvnDob: Array<string> = [];

        // splt platform dob
        if (strIncludesEs6(kyb.owner.dob, '/')) {
            splitDob = kyb.owner.dob.split('/');
        } else if (strIncludesEs6(kyb.owner.dob, '-')) {
            splitDob = kyb.owner.dob.split('-');
        }

        // split api dob
        if (strIncludesEs6(bvnData.dob, '/')) {
            splitBvnDob = bvnData.dob.split('/');
        } else if (strIncludesEs6(bvnData.dob, '-')) {
            splitBvnDob = bvnData.dob.split('-');
        }

        await console.log(splitDob)
        await console.log(splitBvnDob);

        // match the data
        if (splitDob[0] === splitBvnDob[0] && splitDob[1] === splitBvnDob[1] && splitDob[2] === splitBvnDob[2]) {
            result = true;
        }
        return result;

    }

    /**
     * @name matchBVNData
     * @param kyc 
     * @returns 
     */
    public async matchBVNData(kyb: IKYBDoc): Promise<boolean> {

        let result: boolean = false;
        const bvnData = kyb.bvnData;
        const isDateOfBirth = await this.matchDateOfBirth(kyb);

        if (isDateOfBirth) {
            result = true;
        }

        return result;

    }

    /**
     * @name matchNINData
     * @param kyc 
     * @returns 
     */
    public async matchNINData(kyb: IKYBDoc): Promise<boolean> {

        let result: boolean = true;
        let gender: string = '';
        const ninData = kyb.ninData;

        if (ninData.gender.toLowerCase() === 'm') {
            gender = 'male'
        } else if (ninData.gender.toLowerCase() === 'f') {
            gender = 'female'
        } else {
            gender = ninData.gender.toLowerCase();
        }

        return result;

    }

}

export default new KYBService();
