import Axios from 'axios';
import { Client } from 'africastalking-ts'
import { AFTSMSDTO } from '../dtos/notification.dto';

const credentials = { apiKey: process.env.AFT_API_KEY || '', username: process.env.AFT_USERNAME || '' };
const client = new Client(credentials);  // define the client 

export const sendSMS = async (data: AFTSMSDTO): Promise<any> => {

    let result: any = null;

    try {

        const smsData = {
            to: data.numbers, // a string of comma separated numbers with countrycodes
            message: data.message,
            from: data.senderID ? data.senderID : process.env.AFT_SENDER_ID,
            enqueue: data.enqueue
        }
    
        result = await client.sendSms(smsData)
        
    } catch (err) {
        result = err;
    }

    return result;

    // status codes

    // 100: Processed
    // 101: Sent
    // 102: Queued
    // 401: RiskHold
    // 402: InvalidSenderId
    // 403: InvalidPhoneNumber
    // 404: UnsupportedNumberType
    // 405: InsufficientBalance
    // 406: UserInBlacklist
    // 407: CouldNotRoute
    // 500: InternalServerError
    // 501: GatewayError
    // 502: RejectedByGateway
   

}
