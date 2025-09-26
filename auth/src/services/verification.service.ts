import { ObjectId } from 'mongoose'
import Verification from '../models/Verification.model'

import { IResult, IUserDoc } from '../utils/types.util'
import { CreateVerificationDTO } from '../dtos/user.dto';
import { UpdateComplianceDTO, VerifyAllComplianceDTO } from '../dtos/compliance.dto';
import { VerificationType } from '../utils/enums.util';

class VerificationService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * 
     * @param user 
     * @param options 
     */
    public async createVerificationData(user: IUserDoc, options?: CreateVerificationDTO): Promise<void> {

        const verif = await Verification.create({
            basic: 'pending',
            ID: 'pending',
            address: 'pending',
            face: 'pending',
            sms: options ? options.sms : false,
            email: options ? options.email : false,
            user: user._id,
            kyc: 'pending',
            kyb: 'pending'
        });

        user.verification = verif._id;
        await user.save();

    }

    /**
     * 
     * @param target 
     * @param status 
     * @param id 
     */
    public async updateVerification(data: UpdateComplianceDTO): Promise<void> {

        const { target, status, id, type } = data;

        const _verify = await Verification.findOne({ _id: id });

        if (type === 'kyc' && _verify) {

            if (target === 'basic') {
                _verify.basic = status;
                await _verify.save();
            } else if (target === 'ID') {
                _verify.ID = status;
                await _verify.save();
            } else if (target === 'face') {
                _verify.face = status;
                await _verify.save();
            } else if (target === 'address') {
                _verify.address = status;
                await _verify.save();
            } else if (target === 'bvn') {
                _verify.bvn = status;
                await _verify.save();
            } else if (target === 'nin') {
                _verify.nin = status;
                await _verify.save();
            } else if (target === 'kyc') {
                _verify.kyc = status;
                await _verify.save();
            }

        }

        if (type === 'kyb' && _verify) {

            _verify.kyb = status;
            await _verify.save()

        }

    }

    /**
     * @name verifyAll
     * @param user 
     * @param target 
     */
    public async verifyAll(data: VerifyAllComplianceDTO): Promise<void> {

        const { target, verification } = data;

        const _verify = await Verification.findOne({ _id: verification._id });

        if (target === 'kyc' && _verify) {

            _verify.basic = VerificationType.APPROVED;
            _verify.ID = VerificationType.APPROVED;
            _verify.face = VerificationType.APPROVED;
            _verify.address = VerificationType.APPROVED;
            _verify.bvn = VerificationType.APPROVED;
            _verify.nin = VerificationType.APPROVED;

            _verify.kyc = VerificationType.APPROVED;
            await _verify.save();

        }

        if (target === 'kyb' && _verify) {

            _verify.basic = VerificationType.APPROVED;
            _verify.ID = VerificationType.APPROVED;
            _verify.address = VerificationType.APPROVED;
            _verify.bvn = VerificationType.APPROVED;
            _verify.nin = VerificationType.APPROVED;

            _verify.kyb = VerificationType.APPROVED;
            await _verify.save();

        }

    }

}

export default new VerificationService()