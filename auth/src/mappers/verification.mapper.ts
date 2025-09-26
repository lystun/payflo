import { MappedVerificationDTO } from "../dtos/user.dto";
import { IUserDoc, IVerificationDoc } from "../utils/types.util";

class VerificationMapper {

    constructor(){}

    public async mapVerificationData(data: IVerificationDoc): Promise<MappedVerificationDTO>{

        let result: MappedVerificationDTO = {
            _id: data._id,
            id: data.id,
            address: data.address,
            basic: data.basic,
            bvn: data.bvn,
            nin: data.nin,
            ID: data.ID,
            face: data.face,
            kyb: data.kyb,
            kyc: data.kyc,
            sms: data.sms,
            email: data.email,
            biometric: data.biometric,
            bvnLimit: data.bvnLimit,
            ninLimit: data.ninLimit,
            security: data.security,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        }

        return result;

    }

}

export default new VerificationMapper()