import { ObjectId } from "mongoose";
import { IKYBDoc, IKYBOwner, IKYBSocial, IKycDoc, IUserDoc, IVerificationDoc } from "../utils/types.util";
import { QoreWebhookDataDTO } from "./qoreid.dto";

export interface UpdateBasicKYCDTO {
    action?: string,
    firstName: string, 
    lastName: string, 
    middleName: string, 
    dob: string, 
    gender: string, 
    phoneCode: string,
    phoneNumber: string
}

export interface UpdateAddressKYCDTO {
    action?: string,
    country: string, 
    city: string, 
    state: string, 
    address: string, 
    postalCode: string, 
    utilityDoc: string
}

export interface UpdateIDKYCDTO {
    action?: string,
    type: string, 
    front: string, 
    back: string
}

export interface UploadIDDTO {
    type: string, 
    front: string, 
    back?: string,
    kyc: IKycDoc,
    user: IUserDoc
}

export interface UpdateBasicKYBDTO {
    profile: string, 
    staffStrength: string, 
    category: string, 
    industry: string, 
    phoneCode: string, 
    state: string,
    city: string,
    postalCode: string,
    address: string,
    action?: string
}

export interface UpdateCompanyKYBDTO {
    action?: string
    type: string,
    category: string, 
    name: string, 
    officialEmail: string,
    cacNumber: string,
    certificate: string,
    tinNumber: string,
    websiteUrl: string,
    handles: {
        facebook?: string,
        twitter?: string
        threads?: string
        linkedin?: string,
        instagram?: string
    }
}

export interface UpdateOwnerKYBDTO {
    action?: string
    name: string,
    dob: string,
    nationality: string,
    idCard: string,
    utilityDoc: string,
    address: string
    bvn: string,
    nin: string
}

export interface UpdateBankKYBDTO {
    action?: string
    accountNo: string,
    accountName: string,
    bankCode: string
}

export interface UpdateSecurityDTO{
    type: string,
    pin: string,
    label: string,
    answer: string
}

export interface IBasicKYBDTO {
    businessName: string, 
    profile: string, 
    staffStrength: string, 
    category: string, 
    industry: string, 
    address: string, 
    city: string, 
    state: string, 
    postalCode?: string, 
    facebook?: string, 
    instagram?: string, 
    twitter?: string, 
    linkedin?: string
}

export interface IKYBRegDTO {
    owner: IKYBOwner,
    registrationType?: string;
    registrationCategory: string;
    registrationNo: string,
    tinNumber?: string,
    certificate: string
}

export interface IKYBBankDTO {
    bankCode: string,
    accountNo: string;
    accountName: string
}

export interface IKYBSocialDTO extends IKYBSocial{}

export interface UpdateComplianceDTO {
    target: any,
    status: string,
    id: ObjectId,
    type: any
}

export interface VerifyAllComplianceDTO{
    verification: IVerificationDoc, 
    target: 'kyc' | 'kyb'
}

export interface ProcessQoreWebhookDTO {
    signature: any,
    payload: QoreWebhookDataDTO
}

export interface VerifyCACNumberDTO {
    cacNumber: string,
    companyName: string,
    loanRef: string
}

export interface AutoCompleteKYBDTO{
    kyb: IKYBDoc,
    verification: IVerificationDoc,
    user: IUserDoc
}

export interface UpdateLegalDetailsDTO {
    type: 'bvn' | 'nin' | 'legal',
    bvn: string,
    nin: string,
    update: boolean
}