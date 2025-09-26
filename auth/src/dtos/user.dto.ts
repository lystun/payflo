import { ObjectId } from "mongoose"
import { IQuestion, IUserDoc, IUserPermission } from "../utils/types.util"

export interface CreateVerificationDTO {
    sms?: boolean,
    email?: boolean
}

export interface AddUserDTO {
    firstName: string, 
    lastName: string, 
    email: string,
    userType: string, 
    phoneNumber: string,
    phoneCode: string,
    permissions: Array<UserPermissionDTO>
    callback: string,
    invite: boolean
}

export interface UserPermissionDTO{
    entity: string,
    type: 'add' | 'remove' | 'update';
    actions: Array<{
        type: 'add' | 'remove' | 'update',
        label: string
    }>
}

export interface UpdatePermissionsDTO {
    user: IUserDoc, 
    permissions: Array<UserPermissionDTO>
}

export interface UpdatePermissionsRequestDTO {
    userId: any, 
    permissions: Array<UserPermissionDTO>
}

export interface UpdatePermActionsDTO{
    currActions: Array<string>, 
    actions: Array<{
        type: 'add' | 'remove' | 'update',
        label: string
    }>
}

export interface CreateUserDTO {
    firstName?: string,
    lastName?: string,
    email: string,
    password: string,
    permissions?: Array<UserPermissionDTO>,
    phoneNumber: string,
    phoneCode: string,
    userType: string,
    businessType?: string,
    businessName?: string,
    passwordType?: string
}

export interface MatchEncryptedPasswordDTO {
    user: IUserDoc,
    hash: string
}

export interface FilterUserDTO {
    userType?: string,
    active?: boolean,
    activated?: boolean,
    onboard?: boolean,
    businessType?: string,
}

export interface GetNotifySocketDTO {
    userId: string
}

export interface MatchEncryptedPasswordDTO {
    user: IUserDoc,
    hash: string
}

export interface IUserOverviewDTO {
    total: number,
    active: number,
    inactive: number,
    corporates: number,
    entrepreneurs: number,
    locked: number
}

export interface PublishUserDTO {
    type: string,
    email: string
}

export interface DecodeAPIKeyDTO {
    apikey: string,
    type: 'secret' | 'public'
}

export interface UpdateUserPINDTO {
    question: {
        label: string,
        answer: string
    },
    currentPin: string,
    newPin: string,
    code?: string
}

export interface UpdateUserPasswordDTO {
    question: {
        label: string,
        answer: string
    },
    currentPassword: string,
    newPassword: string,
    code?: string
}

export interface MappedVerificationDTO {

    basic: string;
    bvn: string;
    nin: string;
    ID: string;
    face: string;
    address: string;
    kyb: string;
    kyc: string,
    sms: boolean;
    biometric: boolean;
    email: boolean;
    bvnLimit: number
    ninLimit: number
    security: IQuestion

    createdAt: string;
    updatedAt: string;
    _id: ObjectId;
    id: ObjectId;


}

export interface MappedLoggedInUserDTO {

    email: string,
    roles: Array<{
        name: string,
        _id: string,
        id: string
    }>,
    phoneNumber: string,
    phoneCode: string
    isSuper: boolean,
    isActivated: boolean,
    isAdmin: boolean,
    isBusiness: boolean,
    isTeam: boolean,
    isWriter: boolean,
    isUser: boolean,
    isActive: boolean,
    passwordType: string,
    passwordHash: string,
    login: {
        last: string,
        method: string
    },
    onboard: {
        step: number,
        stage: string,
        kycStage: string,
        kybStage: string
    }
    country: {
        name: string,
        code: string,
        phoneCode: string,
        flag: string
    },
    userType: string,
    businessType: string,
    verification: MappedVerificationDTO | null,
    createdAt: string;
    updatedAt: string;
    _id: ObjectId;
    id: ObjectId;
}