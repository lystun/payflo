import { AutoCompleteKYBDTO, ProcessQoreWebhookDTO, UpdateSecurityDTO } from '../dtos/compliance.dto';
import User from '../models/User.model';
import { IKycDoc, IResult, IVerificationDoc } from '../utils/types.util'
import { EventEmitter } from 'events'
import SystemService from './system.service';
import { BusinessType, OnboardType, TierLimits, TierLimitsConfig, VerificationType } from '../utils/enums.util';
import { arrayIncludes, charLen } from '@btffamily/vacepay';
import ENV from '../utils/env.util';
import DojahService from './providers/dojah.service';
import { DojahAPIResponseDTO } from '../dtos/dojah.dto';
import UserService from './user.service';
import VerificationService from './verification.service';
import UserRepository from '../repositories/user.repository';

class ComplianceService {

    constructor() {
    }

    /**
     * @name validateUpdateSecurity
     * @param data 
     * @returns 
     */
    public async validateUpdateSecurity(data: UpdateSecurityDTO): Promise<IResult> {

        const allowed = ['pin', 'question'];
        let result: IResult = { error: false, message: '', code: 200, data: null }

        const { label, pin, type, answer } = data;

        if (!type) {
            result.error = true;
            result.message = 'update process type is required'
        } else if (!arrayIncludes(allowed, type)) {
            result.error = true;
            result.message = `invalid update process type. choose from ${allowed.join(', ')}`
        } else if (type === 'pin' && !pin) {
            result.error = true;
            result.message = 'transaction pin is required'
        } else if (type === 'pin' && (charLen(pin.trim()) < 4 || charLen(pin.trim()) > 4)) {
            result.error = true;
            result.message = 'transaction pin cannot be less than or more than 4 digits'
        } else if (type === 'question' && !label) {
            result.error = true;
            result.message = 'question label is required'
        } else if (type === 'question' && !answer) {
            result.error = true;
            result.message = 'security answer is required'
        } else {

            result.error = false;
            result.message = '';

        }

        return result;

    }

    /**
     * @name autoCompleteKYB
     */
    public async autoCompleteKYB(data: AutoCompleteKYBDTO): Promise<void> {

        let bvnNumber: string = ''; let ninNumber: string = '';
        let response: IResult = { error: false, message: '', code: 200, data: null }

        const { kyb, user, verification } = data;

        if ((ENV.isStaging() || ENV.isDev()) && kyb.autoComplete) {

            // capture legal numbers
            bvnNumber = DojahService.defaultBVN;
            ninNumber = DojahService.defaultNIN;

            // call DojahAPI to validate BVN
            response = await DojahService.validateBVN({
                bvn: bvnNumber
            });

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

            // call DojahAPI to validate NIN
            response = await DojahService.validateNIN({
                nin: ninNumber
            });

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

            const split = user.businessName.split(' ');

            kyb.owner.bvn = bvnNumber;
            kyb.owner.nin = ninNumber;
            kyb.owner.firstName = split[0] ? split[0] : user.businessName;
            kyb.owner.lastName = split[1] ? split[1] : 'Business';
            kyb.phoneCode = '+234';
            kyb.nin = ninNumber;
            kyb.bvn = bvnNumber;
            kyb.owner.nationality = 'Nigeria';
            kyb.owner.name = user.businessName;
            await kyb.save();

            verification.bvnLimit = verification.bvnLimit + 1;
            verification.ninLimit = verification.ninLimit + 1;
            await verification.save();

            // create pin for business
            await UserService.encryptUserPIN(user, '1111'); // encrypt and save

            // update verification by target
            await VerificationService.updateVerification({
                target: 'kyb',
                status: VerificationType.APPROVED,
                type: 'kyb',
                id: verification._id
            });

            // update verification and approve all
            await VerificationService.verifyAll({ verification, target: 'kyb' });

            user.onboard.step = 5;
            user.altPhone = user.phoneNumber;
            user.phoneNumber = kyb.ninData.phoneNumber;
            user.onboard.kybStage = OnboardType.PIN;
            user.tier = TierLimits.TIER3.toString();
            user.dailyTransaction.limit = TierLimitsConfig[TierLimits.TIER3].limit;
            user.dailyTransaction.label = TierLimitsConfig[TierLimits.TIER3].label;
            await user.save();

            // pull user and all details
            const natsUser = await UserRepository.findByEmailSelectPin(user.email, true);

            // sync to NATS server
            if (natsUser && natsUser.isBusiness && natsUser.businessType === BusinessType.CORPORATE) {
                await SystemService.syncNatsData({ user: natsUser, verification: natsUser.verification, kyb: natsUser.kyb, kyc: natsUser.kyc }, 'kyb.updated', 'type.compliance')
            }

        }

    }

    /**
     * @name processQoreIdWebhook
     * @param data 
     */
    public async processQoreIdWebhook(data: ProcessQoreWebhookDTO): Promise<void> {

        const { payload, signature } = data;
        const { metadata, customerReference, status } = payload

        const user = await User.findOne({ _id: customerReference }).populate([
            { path: 'kyc' },
            { path: 'verification' }
        ]);

        if (user) {

            const KYC: IKycDoc = user.kyc;
            const verification: IVerificationDoc = user.verification;

            if (metadata.isLive && status.state === 'complete' && status.status === 'verified') {

                // update user
                user.avatar = metadata.imageUrl;
                if (user.onboard.stage === OnboardType.NIN) {
                    user.onboard.step = user.onboard.step + 1;
                    user.onboard.stage = OnboardType.FACEID;
                }
                await user.save();

                // update KYC
                KYC.liveness = {
                    isLive: metadata.isLive,
                    imageUrl: metadata.imageUrl,
                    customerRef: customerReference,
                    externalDatabaseRefID: metadata.externalDatabaseRefID,
                    message: metadata.message,
                    status: status.status
                }
                KYC.avatar = metadata.imageUrl;
                await KYC.save();

                verification.face = VerificationType.APPROVED;
                await verification.save();

                // communicate through NATS
                await SystemService.syncNatsData({ user: user, kyc: KYC }, 'user.updated', 'type.update');

            }

        }


    }

}

export default new ComplianceService();