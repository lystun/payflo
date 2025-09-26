import { Stan } from 'node-nats-streaming';
import { Listener, STGSubjects, Subjects, Random, SyncAction, SyncType, DEVSubjects, capitalize } from '@btffamily/vacepay';
import QueueGroupName from '../groupName';
import nats from '../nats'
import User from '../../models/User.model';
import ENV from '../../utils/env.util';
import { UserType, VerificationType } from '../../utils/enums.util';
import BusinessService from '../../services/business.service';
import WalletService from '../../services/wallet.service';
import ProviderService from '../../services/provider.service';

class UserCreatedListener extends Listener {

    subject = ENV.isProduction() ? Subjects.UserCreated : ENV.isStaging() ? STGSubjects.UserCreated : DEVSubjects.UserCreated;
    queueGroupName = QueueGroupName.Auth + `.${process.env.NATS_LISTEN_ID}.${Random.randomCode(3, true)}`;

    constructor(client: Stan) {
        super(client)
    }

    async onMessage(data: any, msg: any) {

        // get the message data
        const { user, userType, phoneCode } = data;
        const action: SyncAction = data.action;
        const type: SyncType = data.type;

        msg.ack(); // acknowlege NAts message

        //find user
        const _user = await User.findOne({ email: user.email });

        if (!_user) {

            if (action === 'user.created') {

                const newUser = await User.create({
                    firstName: user.firstName,
                    lastName: user.lastName,
                    _id: user._id,
                    id: user._id,
                    userId: user._id,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    phoneCode: user.phoneCode,
                    userType: userType,
                    businessType: user.businessType,
                    roles: user.roles,
                    permissions: user.permissions,
                    savedPassword: user.savedPassword
                });

                // process API keys
                newUser.apiKey = {
                    domain: user.apiKey.domain,
                    secret: user.apiKey.secret,
                    token: user.apiKey.token,
                    public: user.apiKey.public,
                    publicToken: user.apiKey.publicToken,
                    isActive: user.apiKey.isActive,
                    updatedAt: user.apiKey.updatedAt
                }
                newUser.keys.push({
                    domain: user.apiKey.domain,
                    secret: user.apiKey.secret,
                    token: user.apiKey.token,
                    public: user.apiKey.public,
                    publicToken: user.apiKey.publicToken,
                    isActive: user.apiKey.isActive,
                    updatedAt: user.apiKey.updatedAt
                });

                if (userType === UserType.SUPER || userType === UserType.ADMIN) {
                    await newUser.save();
                }

                if (userType === UserType.BUSINESS) {

                    newUser.businessType = user.businessType;
                    await newUser.save();

                    // create business data for user
                    const business = await BusinessService.createBusiness(newUser, {
                        type: user.businessType,
                        name: user.businessName,
                        tier: user.tier,
                        limit: {
                            label: user.dailyTransaction.label,
                            value: user.dailyTransaction.limit
                        }
                    });

                    // create wallet data for user
                    await WalletService.createWallet({ business, currency: 'NGN' });

                    // create settings data for user
                    await BusinessService.createSettingData({ business, user: newUser });


                    //TODO: remove this block

                    // AUTO VERIFY BLOCK

                    if (user.email === 'inosuft@gmail.com' || user.email === 'tohbyy@gmail.com') {

                        newUser.firstName = capitalize(user.email.split('@')[0]);
                        newUser.lastName = `Vace${capitalize(user.email.split('@')[0])}`;
                        newUser.middleName = capitalize(user.email.split('@')[0]);
                        newUser.avatar = '';
                        newUser.phoneCode = user.phoneCode;
                        newUser.phoneNumber = user.phoneNumber;
                        newUser.security = {
                            question: 'What is your name',
                            answer: capitalize(user.email.split('@')[0]),
                            isSubmitted: true,
                            label: 'What is your name'
                        }
                        newUser.bvnData = {
                            firstName: 'OLUWATOBI',
                            lastName: 'AGBELEYE',
                            middleName: 'EMMANUEL',
                            phoneNumber: '08137031202',
                            customer: 'OLUWATOBI AGBELEYE',
                            dob: '1992-01-12',
                            gender: 'male'
                        }
                        newUser.ninData = {
                            firstName: "OLUWATOBI",
                            middleName: "EMMANUEL",
                            lastName: "AGBELEYE",
                            phoneNumber: "08137031202",
                            gender: "male",
                            customer: "",
                            photo: ""
                        }

                        newUser.identity = {
                            basic: VerificationType.APPROVED,
                            ID: VerificationType.APPROVED,
                            face: VerificationType.APPROVED,
                            bvn: VerificationType.APPROVED,
                            address: VerificationType.APPROVED,
                            kyb: VerificationType.APPROVED,
                            kyc: VerificationType.APPROVED,
                            bvnLimit: 0,
                            ninLimit: 0
                        };

                        if (user.savedPassword) {
                            newUser.savedPassword = user.savedPassword;
                            await newUser.save();
                        }

                        await newUser.save();

                        business.onboard = {
                            step: user.onboard.step,
                            stage: user.onboard.kycStage
                        }
                        business.name = `${newUser.firstName} ${newUser.lastName}`;
                        business.displayName = `${newUser.firstName} ${newUser.lastName}`;
                        business.tier = user.tier ? user.tier : business.tier;
                        business.legal.bvnNumber = "22277845427";
                        business.legal.ninNumber = "70818813448";
                        business.dailyTransaction = {
                            limit: user.dailyTransaction.limit,
                            label: user.dailyTransaction.label
                        }
                        business.location = {
                            address: "Ile-Iwe Ogbomoso",
                            city: "Ogbomoso",
                            state: "OYO",
                            postalCode: "20001",
                            country: {
                                id: "676d3612ad25453b27041988",
                                code2: 'NG',
                                name: 'Nigeria',
                                phoneCode: '+234'
                            }
                        }
                        await business.save();

                        // generate virtual account
                        const providerName = await ProviderService.configProviderName('bank')

                        // update business transaction pin
                        business.transactionPin = user.transactionPin;
                        await business.save();

                        await BusinessService.createBankAccount(business._id, providerName);

                    }

                    // END AUTO VERIFY BLOCK

                }

            }

        }

    }


}

export default UserCreatedListener;