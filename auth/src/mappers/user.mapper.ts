import { MappedLoggedInUserDTO, MappedVerificationDTO } from "../dtos/user.dto";
import { UserType } from "../utils/enums.util";
import { IUserDoc } from "../utils/types.util";
import VerificationMapper from "./verification.mapper";

class UserMapper {

    constructor(){}

    /**
     * @name mapLoggedInUser
     * @param user 
     * @returns 
     */
    public async mapLoggedInUser(user: IUserDoc): Promise<MappedLoggedInUserDTO>{

        let verification: MappedVerificationDTO | null = null;

        let roles = user.roles.map((x) => {
            return {
                name: x.name,
                id: x.id,
                _id: x._id
            }
        });

        let country = {
            name: user.country && user.country.name ? user.country.name : 'Nigeria',
            code: user.country && user.country.code ? user.country.code : 'NG',
            phoneCode: user.country && user.country.phoneCode ? user.country.phoneCode : '+234',
            flag: user.country && user.country.flag ? user.country.flag : '',
        }

        if(user.userType !== UserType.SUPER && user.userType !== UserType.ADMIN){
            verification = await VerificationMapper.mapVerificationData(user.verification);
        }

        let result: MappedLoggedInUserDTO = {

            _id: user._id,
            id: user.id,
            email: user.email,
            phoneNumber: user.phoneNumber,
            phoneCode: user.phoneCode,
            userType: user.userType,
            businessType: user.businessType,
            passwordType: user.passwordType,
            passwordHash: user.savedPassword,
            login: {
                last: user.login.last,
                method: user.login.method
            },
            onboard: {
                step: user.onboard.step,
                stage: user.onboard.stage,
                kycStage: user.onboard.kycStage,
                kybStage: user.onboard.kybStage
            },
            roles: roles,
            country: country,
            isSuper: user.isSuper,
            isAdmin: user.isAdmin,
            isBusiness: user.isBusiness,
            isWriter: user.isWriter,
            isUser: user.isUser,
            isTeam: user.isTeam,
            isActivated: user.isActivated,
            isActive: user.isActive,
            verification: verification,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt

        }

        return result;

    }

}

export default new UserMapper();