import { Stan } from 'node-nats-streaming';
import { Listener, STGSubjects, Subjects, Random, SyncAction, SyncType, DEVSubjects } from '@btffamily/vacepay';
import QueueGroupName from '../groupName';

import nats from '../nats'
import User from '../../models/User.model';
import { UserType, VerificationType } from '../../utils/enums.util';
import ENV from '../../utils/env.util';
import Business from '../../models/Business.model';
import BusinessService from '../../services/business.service';
import { IBusinessDoc } from '../../utils/types.util';
import ProviderService from '../../services/provider.service';
class ComplianceUpdatedListener extends Listener {

    subject = ENV.isProduction() ? Subjects.ComplianceUpdated : ENV.isStaging() ? STGSubjects.ComplianceUpdated : DEVSubjects.ComplianceUpdated;
    queueGroupName = QueueGroupName.Auth + `.${process.env.NATS_LISTEN_ID}.${Random.randomCode(3, true)}`;

    constructor(client: Stan){
        super(client)
    }

    async onMessage(data: any, msg: any){

        // get the message data
        const { user, verification, kyb, kyc } = data;
        const action: SyncAction = data.action;
        const type: SyncType = data.type;

        msg.ack(); // acknowlege NAts message

        //find user
        const _user = await User.findOne({ email: user.email }).populate([
            { path: 'business' }
        ]);

        if (_user) {

            const business = await Business.findOne({ user: _user._id }).select('+transactionPin');

            if(action === 'kyc.updated' && type === 'type.compliance' && business){

                _user.firstName = kyc.firstName ? kyc.firstName : _user.firstName;
                _user.lastName = kyc.lastName ? kyc.lastName : _user.lastName;
                _user.middleName = kyc.middleName ? kyc.middleName : _user.middleName;
                _user.avatar = kyc.faceId ? kyc.faceId : _user.avatar;
                _user.phoneCode = user.phoneCode;
                _user.phoneNumber = user.phoneNumber;
                _user.security = verification.security;
                _user.bvnData = kyc.bvnData
                _user.ninData = kyc.ninData;

                _user.identity = {
                    basic: verification.basic,
                    ID: verification.ID,
                    face: verification.face,
                    bvn: verification.bvn,
                    address: verification.address,
                    kyb: verification.kyb,
                    kyc: verification.kyc,
                    bvnLimit: verification.bvnLimit,
                    ninLimit: verification.ninLimit
                };

                if (user.savedPassword) {
                    _user.savedPassword = user.savedPassword;
                    await _user.save();
                }

                await _user.save();

                business.onboard = {
                    step: user.onboard.step,
                    stage: user.onboard.kycStage
                }
                business.name = `${_user.firstName} ${_user.lastName}`;
                business.displayName = `${_user.firstName} ${_user.lastName}`;
                business.tier = user.tier ? user.tier : business.tier;
                business.legal.bvnNumber = kyc.bvn ? kyc.bvn : business.legal.bvnNumber;
                business.legal.ninNumber = kyc.bvn ? kyc.nin : business.legal.ninNumber;
                business.dailyTransaction = {
                    limit: user.dailyTransaction.limit,
                    label: user.dailyTransaction.label
                }
                business.location = {
                    address: kyc.address ? kyc.address: business.location.address,
                    city: kyc.city ? kyc.city: business.location.city,
                    state: kyc.state ? kyc.state: business.location.state,
                    postalCode: kyc.postalCode ? kyc.postalCode: business.location.postalCode,
                    country: {
                        id: kyc.country,
                        code2: 'NG',
                        name: 'Nigeria',
                        phoneCode: '+234'
                    }
                }
                await business.save();

                // create vacepay account [using bani] details for user
                if(verification.kyc === VerificationType.APPROVED){

                    const providerName = await ProviderService.configProviderName('bank')

                    // update business transaction pin
                    business.transactionPin = user.transactionPin;
                    await business.save();

                    await BusinessService.createBankAccount(business._id, providerName);

                }

            }

            if(action === 'kyb.updated' && type === 'type.compliance' && business){

                _user.firstName = kyb.owner.firstName;
                _user.lastName = kyb.owner.lastName;
                _user.security = verification.security;
                _user.phoneCode = user.phoneCode;
                _user.phoneNumber = user.phoneNumber;
                _user.bvnData = kyb.bvnData
                _user.ninData = kyb.ninData;

                _user.identity = {
                    basic: verification.basic,
                    ID: verification.ID,
                    face: verification.face,
                    bvn: verification.bvn,
                    address: verification.address,
                    kyb: verification.kyb,
                    kyc: verification.kyc,
                    bvnLimit: verification.bvnLimit,
                    ninLimit: verification.ninLimit
                };

                if (user.savedPassword) {
                    _user.savedPassword = user.savedPassword;
                    await _user.save();
                }

                await _user.save();

                business.onboard = {
                    step: user.onboard.step,
                    stage: user.onboard.kybStage
                }
                business.name = kyb.businessName ? kyb.businessName : user.businessName;
                business.displayName = kyb.businessName ? kyb.businessName : `${_user.firstName} ${_user.lastName}`;
                business.profile = kyb.profile ? kyb.profile : business.profile;
                business.staffStrength = kyb.staffStrength ? kyb.staffStrength : business.staffStrength;
                business.category = kyb.category ? kyb.category : business.category;
                business.industry = kyb.industry ? kyb.industry : business.industry;
                business.legal.bvnNumber = kyb.owner && kyb.owner.bvn ? kyb.owner.bvn : kyb.bvn;
                business.legal.ninNumber = kyb.owner && kyb.owner.nin ? kyb.owner.nin : kyb.nin;
                business.officialEmail = kyb.officialEmail ? kyb.officialEmail : business.officialEmail;
                business.location = {
                    address: kyb.address ? kyb.address: business.location.address,
                    city: kyb.city ? kyb.city: business.location.city,
                    state: kyb.state ? kyb.state: business.location.state,
                    postalCode: kyb.postalCode ? kyb.postalCode: business.location.postalCode,
                    country: {
                        id: kyc.country,
                        code2: 'NG',
                        name: 'Nigeria',
                        phoneCode: '+234'
                    }
                }
                business.owner = kyb.owner;

                // update tier and limits
                business.tier = user.tier;
                business.dailyTransaction = {
                    limit: user.dailyTransaction.limit,
                    label: user.dailyTransaction.label
                }
                await business.save();

                if(kyb.socials){
                    await BusinessService.updateSocials(business, kyb.socials);
                }

                if(kyb.bank){

                    // get bank provider
                    const provider = await ProviderService.getProviderFromList('bank');
                    if(provider){
                        await BusinessService.updateKYBBank(business, provider, kyb.bank);
                    }

                }

                // create vacepay account [using provider] details for user
                if(verification.kyb === VerificationType.APPROVED){

                    // get bank provider name
                    const providerName = await ProviderService.configProviderName('bank');

                    // update business transaction pin
                    business.transactionPin = user.transactionPin;
                    await business.save();

                    // create bank account details
                    await BusinessService.createBankAccount(business._id, providerName);

                }
                
            }
            
        } 

    }   


}

export default ComplianceUpdatedListener;