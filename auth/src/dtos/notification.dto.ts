import { ObjectId } from "mongoose";
import { IUserDoc, SMSDriver } from "../utils/types.util";

export interface NewNotificationDTO {
    user: IUserDoc,
    title?: string,
    message: string,
}

export interface AFTSMSDTO{
    numbers: string,
    message: string,
    enqueue: boolean,
    senderID?: string
}

export interface SendSMSDTO{
    user: IUserDoc,
    driver: SMSDriver,
    senderID?: string,
    numbers?: string,
    message: string
}