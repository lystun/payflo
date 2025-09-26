import crypto from 'crypto';
import mongoose, { ObjectId, Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { asyncHandler, strIncludesEs6, arrayIncludes, isString, dateToday, Random, checkDateFormat, leadingNum, charLen, isBase64, notDefined, isDefined } from '@btffamily/vacepay'
import { generate } from '../utils/random.util';
import { seedData } from '../config/seeds/seeder.seed';
import { uploadBase64File } from '../utils/google.util'
import VerificationService from '../services/verification.service'
import KYCService from '../services/kyc.service';
import { IBasicKyc, IAddressKyc, IVerificationDoc, IKycDoc, IKYBDoc, IKYBOwner, ISearchQuery, ISystemOverview, IResult, IUserDoc } from '../utils/types.util'
import StorageService from '../services/storage.service'
import UserService from '../services/user.service'

import dayjs from 'dayjs';
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import User from '../models/User.model'
import Role from '../models/Role.model'
import Verification from '../models/Verification.model'

import nats from '../events/nats';
import UserCreated from '../events/publishers/user-created'
import Kyc from '../models/Kyc.model';
import EmailService from '../services/email.service';
import { BusinessType, IDType, OnboardType, ProviderType, SaveActionType, TierLimits, TierLimitsConfig, UserType } from '../utils/enums.util';
import AuditService from '../services/audit.service';
import { VerificationType } from '../utils/enums.util';
import SystemService from '../services/system.service';
import Country from '../models/Country.model';
import KYBService from '../services/kyb.service';
import { advanced, search } from '../utils/result.util';
import Kyb from '../models/Kyb.model';
import { FilterUserDTO, PublishUserDTO } from '../dtos/user.dto';
import Notification from '../models/Notification.model';
import NotificationService from '../services/notification.service';
import BankService from '../services/bank.service';
import { UpdateAddressKYCDTO, UpdateBankKYBDTO, UpdateBasicKYBDTO, UpdateBasicKYCDTO, UpdateCompanyKYBDTO, UpdateIDKYCDTO, UpdateLegalDetailsDTO, UpdateOwnerKYBDTO, UpdateSecurityDTO, VerifyCACNumberDTO } from '../dtos/compliance.dto';
import { uploadCertificateJob, uploadFaceIDJob, uploadIDImageJob, uploadKYBIDJob, uploadKYBNINPhotoJob, uploadKYBUtitlityJob, uploadKYCNINPhotoJob, uploadUtilityDocJob } from '../queues/jobs/compliance.job';
import QoreidService from '../services/providers/qoreid.service';
import DohjahService from '../services/providers/dojah.service';
import UserRepository from '../repositories/user.repository';
import ENV from '../utils/env.util';
import DojahService from '../services/providers/dojah.service';
import { DojahAPIResponseDTO } from '../dtos/dojah.dto';
import ComplianceService from '../services/compliance.service';

/**
 * @name getKYCList
 * @description Get reources from database
 * @route GET /identity/v1/compliance/kyc-list
 */
export const getKYCList = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let list: Array<IKycDoc> = [];

    const pop = [
        {
            path: 'user', populate: [
                { path: 'verification' }
            ]
        },
        { path: 'country' }
    ]

    const result = await advanced(Kyc, pop, '', req, null, null, null, 'absolute');

    if (result.data.length > 0) {

        result.data.forEach((x) => {
            if (x.user && x.user.businessType === BusinessType.ENTREPRENEUR) {
                list.push(x)
            }
        })

        result.data = list;

    }

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: result.data,
        message: `successful`,
        status: 200
    });

})

/**
 * @name getKYBList
 * @description Get reources from database
 * @route GET /identity/v1/compliance/kyb-list
 */
export const getKYBList = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let list: Array<IKYBDoc> = [];

    const pop = [
        {
            path: 'user', populate: [
                { path: 'verification' }
            ]
        },
        { path: 'country' }
    ]

    const result = await advanced(Kyb, pop, '', req, null, null, null, 'absolute');

    if (result.data.length > 0) {

        result.data.forEach((x) => {
            if (x.user && x.user.businessType === BusinessType.CORPORATE) {
                list.push(x)
            }
        })

        result.data = list;

    }

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: result.data,
        message: `successful`,
        status: 200
    });

})

// @desc    Get user kyc
// @route   GET /v1/compliance/kyc/:id
// @access  Private // superadmin // user
export const getUserKyc = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const user = await User.findOne({ _id: req.params.id }).populate([
        {
            path: 'kyc', populate: [
                { path: 'country' },
                { path: 'user' }
            ]
        },
        { path: 'verification' }
    ]);

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: { verification: user.verification, kyc: user.kyc },
        message: `Successful`,
        status: 200
    });

})

// @desc        Get user kyb
// @route       PUT /identity/v1/compliance/kyb/:id
// @access      Private
export const getUserKyb = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const user = await User.findOne({ _id: req.params.id }).populate([
        {
            path: 'kyb', populate: [
                { path: 'user' }
            ]
        },
        { path: 'verification' }
    ]);

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }


    res.status(200).json({
        error: false,
        errors: [],
        data: { verification: user.verification, kyb: user.kyb },
        message: `Successful`,
        status: 200
    });

})

/**
 * @name updateBasicKyc
 * @description update resource in database
 * @route PUT /identity/v1/compliance/kyc/update-basic/:id
 * @access Public | superadmin
 * 
 * @returns {Response} client response
 */
export const updateBasicKyc = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { firstName, lastName, middleName, dob, gender, phoneCode, phoneNumber, action } = req.body as UpdateBasicKYCDTO;

    const validate = await KYCService.validateBasicKyc(req.body);

    if (validate.error === true) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]));
    }

    const user = await User.findOne({ _id: req.params.id }).populate([
        { path: 'verification' },
        { path: 'kyc' }
    ]);

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }

    const verification: IVerificationDoc = user.verification;
    const kyc: IKycDoc = user.kyc;

    if (isDefined(action) && action === SaveActionType.UPDATE && verification.kyc === VerificationType.APPROVED) {
        return next(new ErrorResponse('Error', 403, ['basic kyc details is already approved']))
    }

    const today = dateToday(Date.now())
    const _d = dateToday(dob);

    if (_d.year > today.year) {
        return next(new ErrorResponse('Error', 404, ['date of birth canot be a date in the future']))
    }

    kyc.firstName = firstName;
    kyc.lastName = lastName;
    kyc.middleName = middleName;
    kyc.phoneCode = phoneCode ? phoneCode : user.phoneCode;
    kyc.phoneNumber = phoneNumber ? phoneNumber : user.phoneNumber;
    kyc.dob = dob;
    kyc.gender = gender;
    await kyc.save();

    const cExists = await Country.findOne({ phoneCode: phoneCode });

    if (cExists) {
        kyc.phoneCode = phoneCode;
        kyc.country = cExists._id;
        await kyc.save();
    } else {

        const countries = await SystemService.readCountries();
        const _ctx = countries.find((x) => x.phoneCode === phoneCode);

        if (_ctx) {

            // create a new country
            const country = await Country.create({
                name: _ctx.name,
                code2: _ctx.code2,
                code3: _ctx.code3,
                states: _ctx.states,
                capital: _ctx.capital,
                region: _ctx.region,
                subRegion: _ctx.subRegion,
                flag: _ctx.flag,
                phoneCode: _ctx.phoneCode,
                currencyCode: _ctx.currencyCode,
                currencyImage: _ctx.currencyImage
            });

            kyc.phoneCode = phoneCode;
            kyc.country = country._id;
            await kyc.save();

        }


    }

    if (notDefined(action) || action === SaveActionType.SAVE) {

        verification.basic = VerificationType.APPROVED;
        await verification.save();

        // update user
        user.firstName = firstName;
        user.lastName = lastName;
        user.onboard.step = user.onboard.step + 1;
        user.onboard.stage = OnboardType.BASIC;
        user.onboard.kycStage = OnboardType.BASIC;

        user.tier = TierLimits.TIER1.toString();
        user.dailyTransaction.limit = TierLimitsConfig[TierLimits.TIER1].limit;
        user.dailyTransaction.label = TierLimitsConfig[TierLimits.TIER1].label;
        await user.save();

    }

    //LOG: add new audit log
    await AuditService.createAudit({
        user: user._id,
        action: 'updateBasicKyc',
        description: `updated userbasic kyc`,
        controller: 'User',
        type: 'success',
        entity: 'User',
        changes: req.body
    });

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            kyc,
            verification
        },
        message: 'successful',
        status: 200
    })


});

/**
 * @name updateAddressKyc
 * @description update resource in database
 * @route PUT /identity/v1/compliance/kyc/update-address/:id
 * @access Public | superadmin
 * 
 * @returns {Response} client response
 */
export const updateAddressKyc = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { country, city, state, address, postalCode, utilityDoc, action } = req.body as UpdateAddressKYCDTO;

    const validate = await KYCService.validateAddressKyc(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]));
    }

    const user = await User.findOne({ _id: req.params.id }).populate([
        { path: 'verification' },
        { path: 'kyc' }
    ]);

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }

    const verification: IVerificationDoc = user.verification;
    const kyc: IKycDoc = user.kyc;

    if (verification.basic !== VerificationType.APPROVED) {
        return next(new ErrorResponse('Error', 403, ['basic verification is pending']))
    }

    if (isDefined(action) && action === SaveActionType.UPDATE && verification.kyc === VerificationType.APPROVED) {
        return next(new ErrorResponse('Error', 403, ['basic kyc details is already approved']))
    }

    kyc.address = address;
    kyc.city = city;
    kyc.state = state;
    kyc.postalCode = postalCode;
    await kyc.save();

    // upload utilitydoc
    uploadUtilityDocJob(kyc, utilityDoc);

    if (notDefined(action) || action === SaveActionType.SAVE) {

        verification.address = VerificationType.APPROVED;
        await verification.save();

        // update user
        user.onboard.step = user.onboard.step + 1;
        user.onboard.stage = OnboardType.ADDRESS;
        user.onboard.kycStage = OnboardType.ADDRESS;
        await user.save();


    }


    //LOG: add new audit log
    await AuditService.createAudit({
        user: user._id,
        action: 'updateAddressKyc',
        description: 'updated user address kyc',
        controller: 'User',
        type: 'success',
        entity: 'User',
        changes: req.body
    });


    res.status(200).json({
        error: false,
        errors: [],
        data: {
            kyc,
            verification
        },
        message: 'successful',
        status: 200
    })


});

/**
 * @name updateBVNKyc
 * @description update resource in database
 * @route PUT /identity/v1/compliance/kyc/update-bvn/:id
 * @access Public | superadmin
 * 
 * @returns {Response} client response
 */
export const updateBVNKyc = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let bvnNumber: string = '';
    let response: IResult = { error: false, message: '', code: 200, data: null }
    const { bvn, action } = req.body;

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: true });
    const authUser: IUserDoc = loggedIn.data.user;

    if (!bvn) {
        return next(new ErrorResponse('Error', 400, ['bvn number is required']))
    }

    if (!isString(bvn)) {
        return next(new ErrorResponse('Error', 400, ['bvn number is required to be a string']))
    }

    if (charLen(bvn) < 11 || charLen(bvn) > 11) {
        return next(new ErrorResponse('Error', 400, ['bvn cannot be less than or greater than 11 digits']))
    }

    if (action && !arrayIncludes(['save-new', 'update-data'], action)) {
        return next(new ErrorResponse('Error', 400, [`invalid action value. choose from save-new, update-data`]))
    }

    const user = await UserRepository.findById(req.params.id, true);

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }

    const verification: IVerificationDoc = user.verification;
    let kyc: IKycDoc = user.kyc;

    if (verification.address !== VerificationType.APPROVED) {
        return next(new ErrorResponse('Error', 403, ['address verification is pending']))
    }

    if (authUser.userType === UserType.BUSINESS && verification.bvnLimit >= 1) {
        return next(new ErrorResponse('Error', 403, ['bvn verification limit exeeded. please contact support']))
    }

    if (isDefined(action) && action === SaveActionType.UPDATE && verification.kyc === VerificationType.APPROVED) {
        return next(new ErrorResponse('Error', 403, ['BVN kyc details is already approved']))
    }

    // set bvn
    if (ENV.isProduction()) {
        bvnNumber = bvn;
    } else {

        if (bvn === DojahService.defaultBVN) {
            bvnNumber = bvn;
        } else {
            bvnNumber = DojahService.defaultBVN;
        }

    }

    // call DojahAPI to validate BVN
    response = await DojahService.validateBVN({
        bvn: bvnNumber
    });

    // increate bvn limit
    verification.bvnLimit = verification.bvnLimit + 1;
    await verification.save();

    if (response.error) {
        return next(new ErrorResponse('Error', 403, [`${response.message}`]));
    }

    const dojah: DojahAPIResponseDTO = response.data;

    kyc.bvnData = {
        firstName: dojah.entity.first_name,
        lastName: dojah.entity.last_name,
        middleName: dojah.entity.middle_name,
        phoneNumber: dojah.entity.phone_number1,
        dob: dojah.entity.date_of_birth,
        gender: dojah.entity.gender.toLowerCase(),
        customer: dojah.entity.customer
    }
    kyc.bvn = bvnNumber;
    await kyc.save();

    const isMatched = await KYCService.matchBVNData(kyc);

    if (ENV.isProduction() && !isMatched) {
        return next(new ErrorResponse('Error', 403, [`BVN mismatch. Please contact support to try again`]))
    }

    if (notDefined(action) || action === SaveActionType.SAVE) {

        // update verification
        verification.bvn = VerificationType.APPROVED;
        await verification.save();

        // update user
        user.onboard.step = user.onboard.step + 1;
        user.onboard.stage = OnboardType.BVN;
        user.onboard.kycStage = OnboardType.BVN;

        user.tier = TierLimits.TIER2.toString();
        user.dailyTransaction.limit = TierLimitsConfig[TierLimits.TIER2].limit;
        user.dailyTransaction.label = TierLimitsConfig[TierLimits.TIER2].label;
        await user.save();

    }


    //LOG: add new audit log
    await AuditService.createAudit({
        user: user._id,
        action: 'updateBVNKyc',
        description: 'updated user bvn kyc',
        controller: 'User',
        type: 'success',
        entity: 'User',
        changes: req.body
    });

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            kyc,
            verification
        },
        message: 'successful',
        status: 200
    })


});

/**
 * @name updateNINKyc
 * @description update resource in database
 * @route PUT /identity/v1/compliance/kyc/update-nin/:id
 * @access Public | superadmin
 * 
 * @returns {Response} client response
 */
export const updateNINKyc = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let ninNumber: string = '';
    let response: IResult = { error: false, message: '', code: 200, data: null }
    const { nin, action } = req.body;

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: true });
    const authUser: IUserDoc = loggedIn.data.user;

    if (!nin) {
        return next(new ErrorResponse('Error', 400, ['nin number is required']))
    }

    if (!isString(nin)) {
        return next(new ErrorResponse('Error', 400, ['nin number is required to be a string']))
    }

    if (charLen(nin) < 11 || charLen(nin) > 11) {
        return next(new ErrorResponse('Error', 400, ['nin cannot be less than or greater than 11 digits']))
    }

    if (action && !arrayIncludes(['save-new', 'update-data'], action)) {
        return next(new ErrorResponse('Error', 400, [`invalid action value. choose from save-new, update-data`]))
    }

    const user = await UserRepository.findById(req.params.id, true);

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }

    const verification: IVerificationDoc = user.verification;
    let kyc: IKycDoc = user.kyc;

    if (verification.bvn !== VerificationType.APPROVED) {
        return next(new ErrorResponse('Error', 403, ['bvn verification is pending']))
    }

    if (authUser.userType === UserType.BUSINESS && verification.ninLimit >= 1) {
        return next(new ErrorResponse('Error', 403, ['nin verification limit exeeded. please contact support']))
    }

    if (isDefined(action) && action === SaveActionType.UPDATE && verification.kyc === VerificationType.APPROVED) {
        return next(new ErrorResponse('Error', 403, ['NIN kyc details is already approved']))
    }

    // set bvn
    if (ENV.isProduction()) {
        ninNumber = nin;
    } else {

        if (nin === DojahService.defaultNIN) {
            ninNumber = nin;
        } else {
            ninNumber = DojahService.defaultNIN;
        }

    }

    // call DojahAPI to validate NIN
    response = await DojahService.validateNIN({
        nin: ninNumber
    });

    // update nin limi
    verification.ninLimit = verification.ninLimit + 1;
    await verification.save();

    if (response.error) {
        return next(new ErrorResponse('Error', 403, [`${response.message}`]));
    }

    const dojah: DojahAPIResponseDTO = response.data;

    kyc.ninData = {
        firstName: dojah.entity.first_name,
        lastName: dojah.entity.last_name,
        middleName: dojah.entity.middle_name,
        phoneNumber: dojah.entity.phone_number,
        gender: dojah.entity.gender.toLowerCase(),
        customer: dojah.entity.customer,
        photo: ''
    }
    kyc.nin = ninNumber;
    await kyc.save();

    const isMatched = await KYCService.matchNINData(kyc);

    if (ENV.isProduction() && !isMatched) {
        return next(new ErrorResponse('Error', 403, [`NIN mismatch. Please contact support`]))
    }

    if (notDefined(action) || action === SaveActionType.SAVE) {

        uploadKYCNINPhotoJob(kyc, dojah.entity.photo)

        // update verification
        verification.nin = VerificationType.APPROVED;
        verification.face = VerificationType.APPROVED;
        await verification.save();

        // update user
        user.altPhone = user.phoneNumber;
        user.phoneNumber = kyc.ninData.phoneNumber; // update phone with NIN phone data
        user.onboard.step = user.onboard.step + 1;
        user.onboard.stage = OnboardType.NIN;
        user.onboard.kycStage = OnboardType.NIN;
        user.tier = TierLimits.TIER2.toString();
        user.dailyTransaction.limit = TierLimitsConfig[TierLimits.TIER2].limit;
        user.dailyTransaction.label = TierLimitsConfig[TierLimits.TIER2].label;
        await user.save();

    }


    //LOG: add new audit log
    await AuditService.createAudit({
        user: user._id,
        action: 'updateNINKyc',
        description: 'updated user nin kyc',
        controller: 'User',
        type: 'success',
        entity: 'User',
        changes: req.body
    });

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            kyc,
            verification
        },
        message: 'successful',
        status: 200
    })


});

/**
 * @name updateNINKyc
 * @description update resource in database
 * @route PUT /identity/v1/compliance/kyc/update-id/:id
 * @access Public | superadmin
 * 
 * @returns {Response} client response
 */
export const updateIDKyc = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { type, front, back, action } = req.body as UpdateIDKYCDTO;

    const validate = await KYCService.validateIDKyc(req.body);

    if (validate.error === true) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]));
    }

    const user = await User.findOne({ _id: req.params.id }).populate([
        { path: 'verification' },
        { path: 'kyc' }
    ]);

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }

    const verification: IVerificationDoc = user.verification;
    const kyc: IKycDoc = user.kyc;

    if (verification.nin !== VerificationType.APPROVED) {
        return next(new ErrorResponse('Error', 404, ['nin verification is pending']))
    }

    if (isDefined(action) && action === SaveActionType.UPDATE && verification.kyc === VerificationType.APPROVED) {
        return next(new ErrorResponse('Error', 403, ['ID details is already approved']))
    }

    if (type === IDType.PASSPORT) {
        uploadIDImageJob({ type, front, kyc, user });
    }

    // ID is either card, nin-slip or license
    if (type !== IDType.PASSPORT) {
        uploadIDImageJob({ type, front, back, kyc, user });
    }

    if (notDefined(action) || action === SaveActionType.SAVE) {

        verification.ID = VerificationType.APPROVED;
        await verification.save();

        // update user
        user.onboard.step = user.onboard.step + 1;
        user.onboard.stage = OnboardType.IDCARD;
        user.onboard.kycStage = OnboardType.IDCARD;
        user.tier = TierLimits.TIER2.toString();
        user.dailyTransaction.limit = TierLimitsConfig[TierLimits.TIER2].limit;
        user.dailyTransaction.label = TierLimitsConfig[TierLimits.TIER2].label;
        await user.save();

    }


    await AuditService.createAudit({
        user: user._id,
        action: 'updateIDKyc',
        description: 'Updated user ID KYC',
        controller: 'User',
        type: 'success',
        entity: 'User',
        changes: req.body
    });

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            kyc,
            verification
        },
        message: 'successful',
        status: 200
    })


});

/**
 * @name updateFaceKyc
 * @description update resource in database
 * @route PUT /identity/v1/compliance/kyc/update-face/:id
 * @access Public | superadmin
 * 
 * @returns {Response} client response
 */
export const updateFaceKyc = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { image, action } = req.body;

    if (!image) {
        return next(new ErrorResponse('Error', 400, [`face image data is required`]));
    }

    if (!isBase64(image)) {
        return next(new ErrorResponse(`Eror!`, 400, ['face image should be a base64 string']));
    }

    if (action && !arrayIncludes(['save-new', 'update-data'], action)) {
        return next(new ErrorResponse('Error', 400, [`invalid action value. choose from save-new, update-data`]))
    }

    const user = await User.findOne({ _id: req.params.id }).populate([
        { path: 'verification' },
        { path: 'kyc' }
    ]);

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }

    const verification: IVerificationDoc = user.verification
    const kyc: IKycDoc = user.kyc

    if (verification.ID !== VerificationType.APPROVED) {
        return next(new ErrorResponse('Error', 404, ['ID kyc verification is pending']))
    }

    if (isDefined(action) && action === SaveActionType.UPDATE && verification.kyc === VerificationType.APPROVED) {
        return next(new ErrorResponse('Error', 403, ['faceid kyc details is already approved']))
    }

    uploadFaceIDJob(kyc, image);

    if (notDefined(action) || action === SaveActionType.SAVE) {

        verification.face = VerificationType.APPROVED;
        await verification.save();

        // update user
        user.onboard.step = user.onboard.step + 1;
        user.onboard.stage = OnboardType.FACEID;
        user.onboard.kycStage = OnboardType.FACEID;
        user.tier = TierLimits.TIER2.toString();
        user.dailyTransaction.limit = TierLimitsConfig[TierLimits.TIER2].limit;
        user.dailyTransaction.label = TierLimitsConfig[TierLimits.TIER2].label;
        await user.save();

    }

    //LOG: add new audit log
    await AuditService.createAudit({
        user: user._id,
        action: 'updateFaceKyc',
        description: 'updated user faceid kyc',
        controller: 'User',
        type: 'success',
        entity: 'User',
        changes: req.body
    });

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            kyc,
            verification
        },
        message: 'successful',
        status: 200
    })


});

/**
 * @name updateBasicKYB
 * @description update resource in database
 * @route PUT /identity/v1/compliance/kyb/update-basic/:id
 * @access Public | superadmin
 * 
 * @returns {Response} client response
 */
export const updateBasicKYB = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { address, category, city, industry, phoneCode, postalCode, profile, staffStrength, state, action } = req.body as UpdateBasicKYBDTO;

    const validate = await KYBService.validateBasicKYB(req.body);

    if (validate.error === true) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]));
    }

    const user = await User.findOne({ _id: req.params.id }).populate([
        { path: 'verification' },
        { path: 'kyb' }
    ]);

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }

    if (user.userType !== UserType.BUSINESS) {
        return next(new ErrorResponse('Error', 403, ['user is not a business']))
    }

    if (user.businessType !== BusinessType.CORPORATE) {
        return next(new ErrorResponse('Error', 403, ['business is not a corporate business']))
    }

    const verification: IVerificationDoc = user.verification;
    const kyb: IKYBDoc = user.kyb;

    if (isDefined(action) && action === SaveActionType.UPDATE && verification.kyb === VerificationType.APPROVED) {
        return next(new ErrorResponse('Error', 403, ['basic kyb details is already approved']))
    }

    kyb.profile = profile;
    kyb.category = category;
    kyb.industry = industry;
    kyb.city = city;
    kyb.state = state;
    kyb.postalCode = postalCode;
    kyb.staffStrength = staffStrength;
    kyb.address = address;

    const cExists = await Country.findOne({ phoneCode: phoneCode });

    if (cExists) {
        kyb.phoneCode = phoneCode;
        kyb.country = cExists._id;
        await kyb.save();
    } else {

        const countries = await SystemService.readCountries();
        const _ctx = countries.find((x) => x.phoneCode === phoneCode);

        if (_ctx) {

            // create a new country
            const country = await Country.create({
                name: _ctx.name,
                code2: _ctx.code2,
                code3: _ctx.code3,
                states: _ctx.states,
                capital: _ctx.capital,
                region: _ctx.region,
                subRegion: _ctx.subRegion,
                flag: _ctx.flag,
                phoneCode: _ctx.phoneCode,
                currencyCode: _ctx.currencyCode,
                currencyImage: _ctx.currencyImage
            });

            kyb.phoneCode = phoneCode;
            kyb.country = country._id;
            await kyb.save();

        }


    }

    if (notDefined(action) || action === SaveActionType.SAVE) {

        verification.kyb = VerificationType.PENDING;
        await verification.save();

        user.onboard.step = user.onboard.step + 1;
        user.onboard.kybStage = OnboardType.BASIC;
        user.tier = TierLimits.TIER1.toString();
        user.dailyTransaction.limit = TierLimitsConfig[TierLimits.TIER1].limit;
        user.dailyTransaction.label = TierLimitsConfig[TierLimits.TIER1].label;
        await user.save();

    }


    //LOG: add new audit log
    await AuditService.createAudit({
        user: user._id,
        action: 'updateBasicKYB',
        description: 'updated user basic KYB details',
        controller: 'User',
        type: 'success',
        entity: 'User',
        changes: req.body
    });

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            kyb,
            verification
        },
        message: 'successful',
        status: 200
    })


});

/**
 * @name updateCompanyKYB
 * @description update resource in database
 * @route PUT /identity/v1/compliance/kyb/update-company/:id
 * @access Public | superadmin
 * 
 * @returns {Response} client response
 */
export const updateCompanyKYB = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { cacNumber, certificate, handles, name, officialEmail, tinNumber, type, websiteUrl, category, action } = req.body as UpdateCompanyKYBDTO;

    const validate = await KYBService.validateCompanyKYB(req.body);

    if (validate.error === true) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]));
    }

    const user = await User.findOne({ _id: req.params.id }).populate([
        { path: 'verification' },
        { path: 'kyb' }
    ]);

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }

    if (user.userType !== UserType.BUSINESS) {
        return next(new ErrorResponse('Error', 403, ['user is not a business']))
    }

    if (user.businessType !== BusinessType.CORPORATE) {
        return next(new ErrorResponse('Error', 403, ['business is not a corporate business']))
    }

    if (user.onboard.step <= 1 && user.onboard.kybStage !== OnboardType.BASIC) {
        return next(new ErrorResponse('Error', 403, ['basic kyb verification is pending']))
    }

    const verification: IVerificationDoc = user.verification;
    const kyb: IKYBDoc = user.kyb;

    if (isDefined(action) && action === SaveActionType.UPDATE && verification.kyb === VerificationType.APPROVED) {
        return next(new ErrorResponse('Error', 403, ['company kyb details is already approved']))
    }

    kyb.regCategory = category;
    kyb.regType = type;
    kyb.cacNumber = cacNumber;
    kyb.tinNumber = tinNumber;
    kyb.officialEmail = officialEmail;
    kyb.cacNumber = cacNumber;
    kyb.websiteUrl = websiteUrl;
    kyb.businessName = name ? name : kyb.businessName;
    await kyb.save();

    await KYBService.updateSocials(kyb, [
        { name: 'facebook', username: handles.facebook, url: handles.facebook },
        { name: 'instagram', username: handles.instagram, url: handles.instagram },
        { name: 'twitter', username: handles.twitter, url: handles.twitter },
        { name: 'threads', username: handles.threads, url: handles.threads },
        { name: 'linkedin', username: handles.linkedin, url: handles.linkedin }
    ]);

    // upload certificate
    if (certificate && isBase64(certificate)) {
        uploadCertificateJob(kyb, certificate);
    }

    if (notDefined(action) || action === SaveActionType.SAVE) {

        verification.kyb = VerificationType.PENDING;
        await verification.save();

        user.onboard.step = user.onboard.step + 1;
        user.onboard.kybStage = OnboardType.COMPANY;
        user.tier = TierLimits.TIER2.toString();
        user.dailyTransaction.limit = TierLimitsConfig[TierLimits.TIER2].limit;
        user.dailyTransaction.label = TierLimitsConfig[TierLimits.TIER2].label;
        await user.save();

    }

    //LOG: add new audit log
    await AuditService.createAudit({
        user: user._id,
        action: 'updateCompanyKYB',
        description: 'updated user company KYB details',
        controller: 'User',
        type: 'success',
        entity: 'User',
        changes: req.body
    });

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            kyb,
            verification
        },
        message: 'successful',
        status: 200
    })


});

/**
 * @name updateOwnerKYB
 * @description update resource in database
 * @route PUT /identity/v1/compliance/kyb/update-owner/:id
 * @access Public | superadmin
 * 
 * @returns {Response} client response
 */
export const updateOwnerKYB = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let bvnNumber: string = '', ninNumber: string = '';
    let response: IResult = { error: false, message: '', code: 200, data: null }
    const { address, bvn, dob, idCard, name, nationality, nin, utilityDoc, action } = req.body as UpdateOwnerKYBDTO;

    const validate = await KYBService.validateOwnerKYB(req.body);

    if (validate.error === true) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]));
    }

    const user = await User.findOne({ _id: req.params.id }).populate([
        { path: 'verification' },
        { path: 'kyb' }
    ]);

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }

    if (user.userType !== UserType.BUSINESS) {
        return next(new ErrorResponse('Error', 403, ['user is not a business']))
    }

    if (user.businessType !== BusinessType.CORPORATE) {
        return next(new ErrorResponse('Error', 403, ['business is not a corporate business']))
    }

    if (user.onboard.step <= 2 && user.onboard.kybStage !== OnboardType.COMPANY) {
        return next(new ErrorResponse('Error', 403, ['company details kyb verification is pending']))
    }

    const verification: IVerificationDoc = user.verification;
    const kyb: IKYBDoc = user.kyb;

    if (isDefined(action) && action === SaveActionType.UPDATE && verification.kyb === VerificationType.APPROVED) {
        return next(new ErrorResponse('Error', 403, ['owner kyb details is already approved']))
    }

    // set bvn
    if (ENV.isProduction()) {
        bvnNumber = bvn;
        ninNumber = nin;
    } else {
        bvnNumber = DojahService.defaultBVN;
        ninNumber = DojahService.defaultNIN;
    }

    kyb.owner.bvn = bvnNumber;
    kyb.owner.nin = ninNumber;
    kyb.nin = ninNumber;
    kyb.bvn = bvnNumber;
    kyb.owner.nationality = nationality;
    kyb.owner.address = address;
    kyb.owner.dob = dob;
    kyb.owner.name = name;

    const split = name.split(' ');
    kyb.owner.firstName = split[0];
    kyb.owner.lastName = split[1] ? split[1] : '';
    kyb.owner.middleName = split[2] ? split[2] : '';
    await kyb.save();

    // call DojahAPI to validate BVN
    response = await DojahService.validateBVN({
        bvn: bvnNumber
    });

    // increate bvn limit
    verification.bvnLimit = verification.bvnLimit + 1;
    await verification.save();

    if (response.error) {
        return next(new ErrorResponse('Error', 403, [`${response.message}`]));
    }

    const dojahBVN: DojahAPIResponseDTO = response.data;

    kyb.bvnData = {
        firstName: dojahBVN.entity.first_name,
        lastName: dojahBVN.entity.last_name,
        middleName: dojahBVN.entity.middle_name,
        phoneNumber: dojahBVN.entity.phone_number1,
        dob: dojahBVN.entity.date_of_birth,
        gender: dojahBVN.entity.gender.toLowerCase(),
        customer: dojahBVN.entity.customer
    }
    await kyb.save();

    const isBvnMatched = await KYBService.matchBVNData(kyb);

    if (ENV.isProduction() && !isBvnMatched) {
        return next(new ErrorResponse('Error', 403, [`BVN mismatch. Please contact support`]))
    }

    // call DojahAPI to validate NIN
    response = await DojahService.validateNIN({
        nin: ninNumber
    });

    // increate bvn limit
    verification.ninLimit = verification.ninLimit + 1;
    await verification.save();

    if (response.error) {
        return next(new ErrorResponse('Error', 403, [`${response.message}`]));
    }

    const dojahNIN: DojahAPIResponseDTO = response.data;

    kyb.ninData = {
        firstName: dojahNIN.entity.first_name,
        lastName: dojahNIN.entity.last_name,
        middleName: dojahNIN.entity.middle_name,
        phoneNumber: dojahNIN.entity.phone_number,
        gender: dojahNIN.entity.gender.toLowerCase(),
        customer: dojahNIN.entity.customer,
        photo: ''
    }
    await kyb.save();

    const isMatched = await KYBService.matchNINData(kyb);

    if (ENV.isProduction() && !isMatched) {
        return next(new ErrorResponse('Error', 403, [`NIN mismatch. Please contact support`]))
    }

    // upload owner id card
    uploadKYBIDJob(kyb, idCard);

    // upload owner proof of address
    uploadKYBUtitlityJob(kyb, utilityDoc);


    if (notDefined(action) || action === SaveActionType.SAVE) {

        uploadKYBNINPhotoJob(kyb, dojahNIN.entity.photo);

        verification.kyb = VerificationType.PENDING;
        await verification.save();

        user.altPhone = user.phoneNumber;
        user.phoneNumber = kyb.ninData.phoneNumber; // update phone with nin data
        user.onboard.step = user.onboard.step + 1;
        user.onboard.kybStage = OnboardType.OWNER;
        user.tier = TierLimits.TIER2.toString();
        user.dailyTransaction.limit = TierLimitsConfig[TierLimits.TIER2].limit;
        user.dailyTransaction.label = TierLimitsConfig[TierLimits.TIER2].label;
        await user.save();

    }

    //LOG: add new audit log
    await AuditService.createAudit({
        user: user._id,
        action: 'updateOwnerKYB',
        description: 'updated owner KYB details',
        controller: 'User',
        type: 'success',
        entity: 'User',
        changes: req.body
    });

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            kyb,
            verification
        },
        message: 'successful',
        status: 200
    })


});

/**
 * @name updateBankKYB
 * @description update resource in database
 * @route PUT /identity/v1/compliance/kyb/update-bank/:id
 * @access Public | superadmin
 * 
 * @returns {Response} client response
 */
export const updateBankKYB = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { accountName, accountNo, bankCode, action } = req.body as UpdateBankKYBDTO;

    const validate = await KYBService.validateBankKYB(req.body);

    if (validate.error === true) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]));
    }

    const user = await User.findOne({ _id: req.params.id }).populate([
        { path: 'verification' },
        { path: 'kyb' }
    ]);

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }

    if (user.userType !== UserType.BUSINESS) {
        return next(new ErrorResponse('Error', 403, ['user is not a business']))
    }

    if (user.businessType !== BusinessType.CORPORATE) {
        return next(new ErrorResponse('Error', 403, ['business is not a corporate business']))
    }

    if (user.onboard.step <= 3 && user.onboard.kybStage !== OnboardType.OWNER) {
        return next(new ErrorResponse('Error', 403, ['owner kyb verification is pending']))
    }

    const verification: IVerificationDoc = user.verification;
    const kyb: IKYBDoc = user.kyb;

    if (isDefined(action) && action === SaveActionType.UPDATE && verification.kyb === VerificationType.APPROVED) {
        return next(new ErrorResponse('Error', 403, ['settlement bank details is already approved']))
    }

    const _bank = await BankService.getBank(bankCode, ProviderType.BANI);

    if (_bank) {

        kyb.bank = {
            bankName: _bank.legalName,
            bankCode: _bank.platformCode,
            accountNo: accountNo,
            accountName: accountName
        }

        await kyb.save();

    }

    if (notDefined(action) || action === SaveActionType.SAVE) {

        verification.kyb = VerificationType.PENDING;
        await verification.save();

        user.onboard.step = user.onboard.step + 1;
        user.onboard.kybStage = OnboardType.BANK;
        user.tier = TierLimits.TIER2.toString();
        user.dailyTransaction.limit = TierLimitsConfig[TierLimits.TIER2].limit;
        user.dailyTransaction.label = TierLimitsConfig[TierLimits.TIER2].label;
        await user.save();

    }


    //LOG: add new audit log
    await AuditService.createAudit({
        user: user._id,
        action: 'updateBankKYB',
        description: 'updated company bank KYB details',
        controller: 'User',
        type: 'success',
        entity: 'User',
        changes: req.body
    });

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            kyb,
            verification
        },
        message: 'successful',
        status: 200
    })


});

/**
 * @name updateSecurity
 * @description disable resource on user account
 * @route PUT /identity/v1/users/kyc/update-security/:id
 * @access Private | superadmin
 * 
 * @returns {Response} client response
 */
export const updateSecurity = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { label, pin, type, answer } = req.body as UpdateSecurityDTO;

    const validate = await ComplianceService.validateUpdateSecurity(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]));
    }

    const user = await UserRepository.findById(req.params.id, true);

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }

    const verification: IVerificationDoc = user.verification;
    const kyb: IKYBDoc = user.kyb;
    const kyc: IKycDoc = user.kyc;

    if (type === 'pin') {

        if (user.onboard.stage === OnboardType.PIN) {
            return next(new ErrorResponse('Error', 403, ['transaction pin is already created']))
        }

        if (user.userType === UserType.BUSINESS) {

            if (user.businessType === BusinessType.ENTREPRENEUR) {

                if (user.onboard.kycStage !== OnboardType.FACEID && verification.face !== VerificationType.APPROVED) {
                    return next(new ErrorResponse('Error', 403, ['Face id verification is pending']))
                }

                // encrypt user PIN
                await UserService.encryptUserPIN(user, pin);

                verification.kyc = VerificationType.SUBMITTED;
                await verification.save();

                user.onboard.step = user.onboard.step + 1;
                user.onboard.stage = OnboardType.PIN;
                user.onboard.kycStage = OnboardType.PIN;
                await user.save();
            }

            if (user.businessType === BusinessType.CORPORATE) {

                if (user.onboard.step <= 4 && user.onboard.kybStage !== OnboardType.BANK) {
                    return next(new ErrorResponse('Error', 403, ['KYB bank update is pending']))
                }

                // encrypt pin
                await UserService.encryptUserPIN(user, pin);

                verification.kyb = VerificationType.SUBMITTED;
                await verification.save()

                user.onboard.step = user.onboard.step + 1;
                user.onboard.kybStage = OnboardType.PIN;
                await user.save();

            }

        }

    }

    if (type === 'question') {

        if (user.onboard.stage !== OnboardType.PIN) {
            return next(new ErrorResponse('Error', 403, ['user transaction pin creation is pending']))
        }

        const questions = await SystemService.readQuestions();
        const exist = questions.find((x) => x.label === label);

        if (exist) {

            verification.security = {
                label: exist.label,
                question: exist.question,
                answer: answer,
                isSubmitted: true
            }
            verification.kyc = VerificationType.APPROVED;
            await verification.save();

        } else {

            // TODO: re-implement fail-safe for this
            verification.security = {
                label: questions[0].label,
                question: questions[0].question,
                answer: answer,
                isSubmitted: false
            }
            verification.kyc = VerificationType.APPROVED;
            await verification.save();

        }

        //update user onboard details
        user.onboard.step = user.onboard.step + 1;
        user.onboard.stage = OnboardType.QUESTION;
        await user.save();

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            kyc: kyc,
            kyb: kyb,
            verification
        },
        message: `successful`,
        status: 200
    });

})

/**
 * @name updateCompliance
 * @description disable resource on user account
 * @route PUT /identity/v1/users/kyc/update-compliance/:id
 * @access Private | superadmin
 * 
 * @returns {Response} client response
 */
export const updateCompliance = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const allowed = ['basic', 'ID', 'face', 'address', 'bvn', 'nin', 'kyc', 'kyb'];
    const allowedStatus = ['pending', 'submitted', 'approved', 'declined'];

    const { target, status } = req.body;

    if (!target) {
        return next(new ErrorResponse('Error', 400, ['target verification is required']))
    }

    if (!arrayIncludes(allowed, target.toString())) {
        return next(new ErrorResponse('Error', 400, ['target value is invalid']))
    }

    if (!status) {
        return next(new ErrorResponse('Error', 400, ['status is required']))
    }

    if (!arrayIncludes(allowedStatus, status.toString())) {
        return next(new ErrorResponse('Error', 400, ['status value is invalid']))
    }

    const user = await User.findOne({ _id: req.params.id }).populate([
        { path: 'kyb' },
        { path: 'kyc' },
        { path: 'verification' }
    ]);

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }

    const verification: IVerificationDoc = user.verification;

    if (user.isBusiness) {

        if (user.businessType === BusinessType.ENTREPRENEUR && user.onboard.kycStage !== OnboardType.PIN) {
            return next(new ErrorResponse('Error', 404, ['transaction pin creation is pending']))
        }

        if (user.businessType === BusinessType.CORPORATE && user.onboard.kybStage !== OnboardType.PIN) {
            return next(new ErrorResponse('Error', 404, ['transaction pin creation is pending']))
        }

    }

    let type = target !== 'kyb' ? 'kyc' : target;

    // update verification
    await VerificationService.updateVerification({ target, status, type, id: verification._id });

    // update user tier and transaction limits
    if (user.isBusiness && user.businessType === BusinessType.ENTREPRENEUR) {

        if (target === 'kyb') {
            return next(new ErrorResponse("Error", 403, ['cannot update kyb compliance for an entrepreneur']))
        }

        if (target === 'kyc' && status === VerificationType.APPROVED) {

            user.tier = TierLimits.TIER3.toString();
            user.dailyTransaction.limit = TierLimitsConfig[TierLimits.TIER3].limit;
            user.dailyTransaction.label = TierLimitsConfig[TierLimits.TIER3].label;
            await user.save();

        }

        // send update email
        await EmailService.sendKYCUpdateEmail({
            driver: 'zepto',
            user: user,
            template: 'kyc',
            options: {
                buttonText: 'Login',
                status: status,
                subject: 'Compliance Updated'
            }
        })

    }

    if (user.isBusiness && user.businessType === BusinessType.CORPORATE) {

        if (target === 'kyc') {
            return next(new ErrorResponse("Error", 403, ['cannot update kyc compliance for a corporate business']))
        }

        if (target === 'kyb' && status === VerificationType.APPROVED) {

            user.tier = TierLimits.TIER3.toString();
            user.dailyTransaction.limit = TierLimitsConfig[TierLimits.TIER3].limit;
            user.dailyTransaction.label = TierLimitsConfig[TierLimits.TIER3].label;
            await user.save();
        }

        // send update email
        await EmailService.sendKYBUpdateEmail({
            driver: 'zepto',
            user: user,
            template: 'kyb',
            options: {
                buttonText: 'Login',
                status: status,
                subject: 'Compliance Updated'
            }
        })

    }

    // pull user and all details
    const natsUser = await UserRepository.findByEmailSelectPin(user.email, true);

    // communicate with other services
    if (natsUser && natsUser.isBusiness && natsUser.businessType === BusinessType.ENTREPRENEUR) {
        await SystemService.syncNatsData({ user: natsUser, verification: natsUser.verification, kyb: natsUser.kyb, kyc: natsUser.kyc }, 'kyc.updated', 'type.compliance')
    }

    if (natsUser && natsUser.isBusiness && natsUser.businessType === BusinessType.CORPORATE) {
        await SystemService.syncNatsData({ user: natsUser, verification: natsUser.verification, kyb: natsUser.kyb, kyc: natsUser.kyc }, 'kyb.updated', 'type.compliance')
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: null,
        message: 'successful',
        status: 200
    })


})

/**
 * @name verifyCACNumber
 * @description verify CAC number
 * @route POST /identity/v1/compliance/verify-cac/:id
 */
export const verifyCACNumber = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { cacNumber, companyName } = req.body as VerifyCACNumberDTO;

    if (!cacNumber) {
        return next(new ErrorResponse('Error', 400, ['cac registration number is required']))
    }

    if (!companyName) {
        return next(new ErrorResponse('Error', 400, ['company name is required']))
    }

    const user = await User.findOne({ _id: req.params.id }).populate([
        { path: 'verification' },
        { path: 'kyb' },
        { path: 'kyc' }
    ]);

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }

    if (user.isBusiness && user.businessType === BusinessType.CORPORATE) {

        const kyb: IKYBDoc = user.kyb;

        const response = await DohjahService.validateCACNumber({
            rcNumber: cacNumber,
            companyName: companyName
        });

        if (response.error) {
            return next(new ErrorResponse('Error', 500, [`${response.message}`], response.data))
        }

        const dojah: DojahAPIResponseDTO = response.data;

        kyb.cacData = {
            address: dojah.entity.address,
            rcNumber: dojah.entity.rc_number,
            companyName: dojah.entity.company_name,
            regDate: dojah.entity.date_of_registration
        }
        await kyb.save();

        // communicate with loan service
        await SystemService.syncNatsData({ user: user, kyb: kyb, kyc: user.kyc }, 'user.updated', 'type.update');

    }


    res.status(200).json({
        error: false,
        errors: [],
        data: {},
        message: 'successful',
        status: 200
    })

})

/**
 * @name checkQoreIDWebhook
 * @description process qoreid webhook
 * @route POST /identity/v1/compliance/webhooks/qoreid
 */
export const checkQoreIDWebhook = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let result: IResult = { error: false, message: '', code: 200, data: null }
    const signature = req.headers['x-verifyme-signature'];
    const payload = req.body;

    const validate = await QoreidService.validateWebhook({ payload, signature });

    // process webhook
    await ComplianceService.processQoreIdWebhook({
        signature,
        payload
    });

    result.error = false;
    result.code = 200;
    result.message = 'payload validation successful';
    result.data = {
        payload: payload,
        signature: {
            validation: validate
        }
    };

    res.status(result.code!).json({
        error: result.error,
        errors: [],
        data: result.data,
        message: 'successful',
        status: result.code!
    })

})

/**
 * @name checkDojahWebhook
 * @description process qoreid webhook
 * @route POST /identity/v1/compliance/webhooks/dojah
 */
export const checkDojahWebhook = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let result: IResult = { error: false, message: '', code: 200, data: null }
    const signature = req.headers['x-dojah-signature'];
    const payload = req.body;

    const validate = await DohjahService.validateWebhook({ payload, signature });

    if (validate) {

        result.error = false;
        result.code = 200;
        result.message = 'payload validation successful';
        result.data = payload;

    } else {

        result.error = true;
        result.code = 403;
        result.message = 'validation was not successful';
        result.data = payload;

    }

    await console.log(result.data);

    res.status(result.code!).json({
        error: result.error,
        errors: [],
        data: result.data,
        message: 'successful',
        status: result.code!
    })

});

/**
 * @name updateKYBSettings
 * @description Update KYB settings
 * @route PUT /identity/v1/compliance/kyb/update-settings/:id
 */
export const updateKYBSettings = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { autocomplete } = req.body;

    const user = await User.findOne({ _id: req.params.id }).populate([
        { path: 'kyb' }
    ]);

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }

    const kyb: IKYBDoc = user.kyb;

    if (isDefined(autocomplete, true)) {
        kyb.autoComplete = autocomplete;
    }

    await kyb.save();


    res.status(200).json({
        error: false,
        errors: [],
        data: kyb,
        message: 'successful',
        status: 200
    })

})

/**
 * @name updateLegalDetails
 * @description update resource in database
 * @route PUT /identity/v1/compliance/update-legals/:id
 * @access Public | superadmin
 * 
 * @returns {Response} client response
 */
export const updateLegalDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let bvnNumber: string = '', ninNumber: string = '', resultData: any = {};
    let response: IResult = { error: false, message: '', code: 200, data: null }
    const { type, bvn, nin, update } = req.body as UpdateLegalDetailsDTO;

    const validate = await KYBService.validateUpdateLegalDetails(req.body);

    if (validate.error === true) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]));
    }

    let isUpdate = update !== undefined ? update : false;

    const user = await User.findOne({ _id: req.params.id }).populate([
        { path: 'verification' },
        { path: 'kyb' },
        { path: 'kyc' }
    ]);

    if (!user) {
        return next(new ErrorResponse('Error', 404, ['user does not exist']))
    }

    if (user.userType !== UserType.BUSINESS) {
        return next(new ErrorResponse('Error', 403, ['user is not a business']))
    }

    const kyc: IKycDoc = user.kyc;
    const kyb: IKYBDoc = user.kyb;
    const verification: IVerificationDoc = user.verification

    // set bvn
    if (ENV.isProduction()) {
        bvnNumber = bvn;
        ninNumber = nin;
    } else {
        bvnNumber = DojahService.defaultBVN;
        ninNumber = DojahService.defaultNIN;
    }

    if (type === 'legal') {

        // call DojahAPI to validate BVN
        response = await DojahService.validateBVN({
            bvn: bvnNumber
        });

        // increate bvn limit
        verification.bvnLimit = verification.bvnLimit + 1;
        await verification.save();

        if (response.error === false) {

            const dojahBVN: DojahAPIResponseDTO = response.data;

            if (user.businessType === BusinessType.CORPORATE) {

                kyb.bvnData = {
                    firstName: dojahBVN.entity.first_name,
                    lastName: dojahBVN.entity.last_name,
                    middleName: dojahBVN.entity.middle_name,
                    phoneNumber: dojahBVN.entity.phone_number1,
                    dob: dojahBVN.entity.date_of_birth,
                    gender: dojahBVN.entity.gender.toLowerCase(),
                    customer: dojahBVN.entity.customer
                }

                if (isUpdate === true) {

                    const isBvnMatched = await KYBService.matchBVNData(kyb);

                    if (ENV.isProduction() && !isBvnMatched) {
                        return next(new ErrorResponse('Error', 403, [`BVN mismatch. Please contact support`]))
                    }

                    await kyb.save();

                }


            }

            if (user.businessType === BusinessType.ENTREPRENEUR) {

                kyc.bvnData = {
                    firstName: dojahBVN.entity.first_name,
                    lastName: dojahBVN.entity.last_name,
                    middleName: dojahBVN.entity.middle_name,
                    phoneNumber: dojahBVN.entity.phone_number1,
                    dob: dojahBVN.entity.date_of_birth,
                    gender: dojahBVN.entity.gender.toLowerCase(),
                    customer: dojahBVN.entity.customer
                }

                if (isUpdate === true) {

                    const isBvnMatched = await KYCService.matchBVNData(kyc);

                    if (ENV.isProduction() && !isBvnMatched) {
                        return next(new ErrorResponse('Error', 403, [`BVN mismatch. Please contact support`]))
                    }

                    await kyc.save();

                }

            }

        }

        if (response.error === true) {
            resultData = {
                bvnData: response.data
            }
        }

        // call DojahAPI to validate NIN
        response = await DojahService.validateNIN({
            nin: ninNumber
        });

        // increate bvn limit
        verification.ninLimit = verification.ninLimit + 1;
        await verification.save();

        if (response.error === false) {

            const dojahNIN: DojahAPIResponseDTO = response.data;

            if (user.businessType === BusinessType.CORPORATE) {

                kyb.ninData = {
                    firstName: dojahNIN.entity.first_name,
                    lastName: dojahNIN.entity.last_name,
                    middleName: dojahNIN.entity.middle_name,
                    phoneNumber: dojahNIN.entity.phone_number,
                    gender: dojahNIN.entity.gender.toLowerCase(),
                    customer: dojahNIN.entity.customer,
                    photo: ''
                }

                if (isUpdate === true) {

                    const isNinMatched = await KYBService.matchNINData(kyb);

                    if (ENV.isProduction() && !isNinMatched) {
                        return next(new ErrorResponse('Error', 403, [`NIN mismatch. Please contact support`]))
                    }

                    await kyb.save();

                    uploadKYBNINPhotoJob(kyb, dojahNIN.entity.photo);

                }

            }

            if (user.businessType === BusinessType.ENTREPRENEUR) {


                kyc.ninData = {
                    firstName: dojahNIN.entity.first_name,
                    lastName: dojahNIN.entity.last_name,
                    middleName: dojahNIN.entity.middle_name,
                    phoneNumber: dojahNIN.entity.phone_number,
                    gender: dojahNIN.entity.gender.toLowerCase(),
                    customer: dojahNIN.entity.customer,
                    photo: ''
                }

                if (isUpdate === true) {

                    const isNinMatched = await KYCService.matchNINData(kyc);

                    if (ENV.isProduction() && !isNinMatched) {
                        return next(new ErrorResponse('Error', 403, [`NIN mismatch. Please contact support`]))
                    }

                    await kyc.save();

                    uploadKYCNINPhotoJob(kyc, dojahNIN.entity.photo);

                }


            }

        }

        if (response.error === true) {
            resultData = {
                ninData: response.data
            }
        }

    }

    if (type === 'bvn') {

        // call DojahAPI to validate BVN
        response = await DojahService.validateBVN({
            bvn: bvnNumber
        });

        // increate bvn limit
        verification.bvnLimit = verification.bvnLimit + 1;
        await verification.save();

        if (response.error === false) {

            const dojahBVN: DojahAPIResponseDTO = response.data;

            if (user.businessType === BusinessType.CORPORATE) {

                kyb.bvnData = {
                    firstName: dojahBVN.entity.first_name,
                    lastName: dojahBVN.entity.last_name,
                    middleName: dojahBVN.entity.middle_name,
                    phoneNumber: dojahBVN.entity.phone_number1,
                    dob: dojahBVN.entity.date_of_birth,
                    gender: dojahBVN.entity.gender.toLowerCase(),
                    customer: dojahBVN.entity.customer
                }


                if (isUpdate === true) {

                    const isBvnMatched = await KYBService.matchBVNData(kyb);

                    if (ENV.isProduction() && !isBvnMatched) {
                        return next(new ErrorResponse('Error', 403, [`BVN mismatch. Please contact support`]))
                    }

                    await kyb.save();

                }


            }

            if (user.businessType === BusinessType.ENTREPRENEUR) {

                kyc.bvnData = {
                    firstName: dojahBVN.entity.first_name,
                    lastName: dojahBVN.entity.last_name,
                    middleName: dojahBVN.entity.middle_name,
                    phoneNumber: dojahBVN.entity.phone_number1,
                    dob: dojahBVN.entity.date_of_birth,
                    gender: dojahBVN.entity.gender.toLowerCase(),
                    customer: dojahBVN.entity.customer
                }

                if (isUpdate === true) {

                    const isBvnMatched = await KYCService.matchBVNData(kyc);

                    if (ENV.isProduction() && !isBvnMatched) {
                        return next(new ErrorResponse('Error', 403, [`BVN mismatch. Please contact support`]))
                    }

                    await kyc.save();

                }

            }

        }

        if (response.error === true) {
            resultData = response.data
        }

    }

    if (type === 'nin') {

        // call DojahAPI to validate NIN
        response = await DojahService.validateNIN({
            nin: ninNumber
        });

        // increate bvn limit
        verification.ninLimit = verification.ninLimit + 1;
        await verification.save();

        if (response.error === false) {

            const dojahNIN: DojahAPIResponseDTO = response.data;

            if (user.businessType === BusinessType.CORPORATE) {

                kyb.ninData = {
                    firstName: dojahNIN.entity.first_name,
                    lastName: dojahNIN.entity.last_name,
                    middleName: dojahNIN.entity.middle_name,
                    phoneNumber: dojahNIN.entity.phone_number,
                    gender: dojahNIN.entity.gender.toLowerCase(),
                    customer: dojahNIN.entity.customer,
                    photo: ''
                }

                if (isUpdate === true) {

                    const isNinMatched = await KYBService.matchNINData(kyb);

                    if (ENV.isProduction() && !isNinMatched) {
                        return next(new ErrorResponse('Error', 403, [`NIN mismatch. Please contact support`]))
                    }

                    await kyb.save();

                    uploadKYCNINPhotoJob(kyc, dojahNIN.entity.photo);

                }

            }

            if (user.businessType === BusinessType.ENTREPRENEUR) {


                kyc.ninData = {
                    firstName: dojahNIN.entity.first_name,
                    lastName: dojahNIN.entity.last_name,
                    middleName: dojahNIN.entity.middle_name,
                    phoneNumber: dojahNIN.entity.phone_number,
                    gender: dojahNIN.entity.gender.toLowerCase(),
                    customer: dojahNIN.entity.customer,
                    photo: ''
                }

                if (isUpdate === true) {

                    const isNinMatched = await KYCService.matchNINData(kyc);

                    if (ENV.isProduction() && !isNinMatched) {
                        return next(new ErrorResponse('Error', 403, [`NIN mismatch. Please contact support`]))
                    }

                    await kyc.save();

                    uploadKYCNINPhotoJob(kyc, dojahNIN.entity.photo);

                }


            }

        }

        if (response.error === true) {
            resultData = response.data
        }

    }

    if (user.businessType === BusinessType.CORPORATE) {
        resultData = {
            bvnData: kyb.bvnData,
            ninData: kyb.ninData
        }
    }

    if (user.businessType === BusinessType.ENTREPRENEUR) {
        resultData = {
            bvnData: kyc.bvnData,
            ninData: kyc.ninData
        }
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: resultData,
        message: 'successful',
        status: 200
    })


});
