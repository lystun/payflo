import { Stan } from 'node-nats-streaming';
import { Listener, STGSubjects, Subjects, Random, SyncAction, SyncType, DEVSubjects } from '@btffamily/vacepay';
import QueueGroupName from '../groupName';

import nats from '../nats'
import User from '../../models/User.model';
import { UserType } from '../../utils/enums.util';
import ENV from '../../utils/env.util';
class ComplianceUpdatedListener extends Listener {

    subject = ENV.isProduction() ? Subjects.ComplianceUpdated : ENV.isStaging() ? STGSubjects.ComplianceUpdated : DEVSubjects.ComplianceUpdated;
    queueGroupName = QueueGroupName.Auth + `.${process.env.NATS_LISTEN_ID}.${Random.randomCode(3, true)}`;

    constructor(client: Stan){
        super(client)
    }

    async onMessage(data: any, msg: any){

        // get the message data
        const { user, verification, kyc, kyb } = data;
        const action: SyncAction = data.action;
        const type: SyncType = data.type;

        msg.ack(); // acknowlege NAts message

        //find user
        const _user = await User.findOne({ email: user.email });

        if (_user) {

            if(action === 'kyc.updated' && type === 'type.compliance'){

                _user.firstName = kyc.firstName ? kyc.firstName : _user.firstName;
                _user.lastName = kyc.lastName ? kyc.lastName : _user.lastName;
                _user.middleName = kyc.middleName ? kyc.middleName : _user.middleName;
                _user.avatar = kyc.faceId ? kyc.faceId : _user.avatar;

                _user.identity = {
                    basic: verification.basic,
                    ID: verification.ID,
                    face: verification.face,
                    bvn: verification.bvn,
                    address: verification.address,
                    kyb: verification.kyb,
                    kyc: verification.kyc
                };

                await _user.save()

            }

        } 

    }   


}

export default ComplianceUpdatedListener;