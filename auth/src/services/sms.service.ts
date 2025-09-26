import { AFTSMSDTO, SendSMSDTO } from '../dtos/notification.dto';
import { sendSMS } from '../utils/aft-sms.util';
import { IResult } from '../utils/types.util'
import UserService from './user.service';

class SMSService {

    constructor () {}

    /**
     * @name sendSMSwithAFT
     * @param data 
     * @returns 
     */
    public async sendSMSwithAFT(data: AFTSMSDTO): Promise<IResult>{

        let result: IResult = { error: false, message: '', code: 200, data: null }

        const send = await sendSMS(data);
        
        if(send.SMSMessageData){
            result.error = true;
            result.data = send;
        }else{
            result.error = true;
            result.message = `could not send SMS to ${data.numbers}`;
            result.data = send;
        }

        return result;

    }

    /**
     * @name sendNotificationSMS
     * @param data 
     */
    public async sendNotificationSMS(data: SendSMSDTO): Promise<void>{

        const { user, driver, message, numbers, senderID } = data;

        if(driver === 'africas-talking'){

            let phone = UserService.checkPhoneCode(user.phoneCode, user.phoneNumber);

            const result = await this.sendSMSwithAFT({ 
                numbers: phone,
                enqueue: true,
                message: message
            });

            if(result.error){
                //TODO: Log SMS failed Audit
            }

        }

    }

}

export default new SMSService();