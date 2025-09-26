import { Model } from 'mongoose';
import { generate } from '../utils/random.util';
import { IResult } from '../utils/types.util'
import crypto from 'crypto'

import nats from '../events/nats'
import NotificationCreated from '../events/publishers/notification-created'
import AuditCreated from '../events/publishers/audit-created'
import CountryFound from '../events/publishers/country-found'
import LocationSaved from '../events/publishers/location-saved'
import { SyncAction, SyncType, dateToday } from '@btffamily/vacepay';

import dayjs from 'dayjs'
import customParse from 'dayjs/plugin/customParseFormat'
dayjs.extend(customParse);

class SystemService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name generateCode
     * @param size 
     * @param alpha 
     * @returns 
     */
    public async generateCode(size: number, alpha: boolean = false): Promise<string>{

        const code = generate(size, alpha);
        return code.toString();

    }

    /**
     * @name getCodeFromName
     * @param name 
     * @returns 
     */
    public async getCodeFromName(name: string): Promise<string>{

        let result: string = '';

        if(name){

            const split = name.split(' ');

            if(split.length > 1){

                for(let i = 0; i < split.length; i++){
                    result = result + split[i].substring(0,1).toUpperCase();
                }

            }else{
                result = name.substring(0,3).toUpperCase();
            }

        }

        return result;

    }

    /**
     * @name validateBase64
     * @param data 
     * @returns 
     */
    public validateBase64(data: string): boolean{

        const mime = data.split(';base64')[0].split(':')[1];

        return mime && mime !== undefined && mime !== null ? true : false;

    }

    /**
     * @name getLastRecord
     * @param model 
     * @returns 
     */
    public async getLastRecord(model: Model<any>): Promise<any>{

        const data = await model.find().limit(1).sort({ $natural: -1 });
        return data[0];

    }

    /**
     * @name getLastRecords
     * @param model 
     * @param limit 
     * @returns 
     */
    public async getLastRecords(model: Model<any>, limit: number = 1): Promise<Array<any>>{

        const data = await model.find().limit(limit).sort({ $natural: -1 });
        return data;

    }

    /**
     * @name getDaysFromDates
     * @param prev 
     * @param next 
     * @returns 
     */
    public getDaysFromDates(then: string, now: string): number{

        let result: number = 0;

        const thenDate = new Date(then);
        const nowDate = new Date(now);

        const dateThen = dateToday(thenDate);
        const covNow = dateToday(nowDate);
        const dateNow = dayjs(covNow.ISO);

        const diff = dateNow.diff(dateThen.ISO, 'day', true);
        result = Math.floor(diff);

        return result;

    }

    /**
     * @name firstDayOfMonth
     * @param d 
     * @returns 
     */
    public firstDayOfMonth = (d: string = '') => {

        const today = d ? new Date(d) : new Date();
        const convToday = dateToday(today);
    
        const first = new Date(convToday.year, (convToday.month - 1), 1);
        const convFirst = dateToday(first);
        
        return { date: first, converted: convFirst }
    
    }

    /**
     * @name lastDayOfMonth
     * @param d 
     * @returns 
     */
    public lastDayOfMonth = (d: string = '') => {

        const today = d ? new Date(d) : new Date();
        const convToday = dateToday(today);
    
        const last = new Date(convToday.year, convToday.month, 1);
        const convLast = dateToday(last);
        
        return { date: last, converted: convLast }
    
    }

    /**
     * @name ifRecordExists
     * @param model 
     * @param data 
     * @returns 
     */
    public async ifRecordExists(model: Model<any>, data: any): Promise<boolean>{

        const exists = await model.findOne(data);
        return exists && exists._id.toString() !== '' ? true : false;

    }

    /**
     * @name UIID
     * @param batch 
     * @returns 
     */
    public UIID(batch: number = 0): string{

        let result: string = '';

        const uid = crypto.randomUUID();
        const split = uid.split('-')

        if(batch === 0){
            result = uid;
        }else{

            if(batch === 1){
                result = split[0]
            }else if(batch === 2){
                result = `${split[0]}-${split[1]}${split[2]}`;
            }else if(batch === 3){
                result = `${split[0]}-${split[1]}${split[2]}-${split[split.length - 1]}`;
            }else{
                result = uid
            }

        }

        return result;

    }

    /**
     * @name syncNatsData
     * @description Communicate with other services using NATS streaming server
     * @param data 
     * @param action 
     * @param type 
     */
    public async syncNatsData(data: any, action: SyncAction, type: SyncType): Promise<void>{

        // re-assign oject
        let syncData: any = {};
        Object.assign(syncData, data);

        // specify action and type
        syncData.action = action;
        syncData.type = type;

        if(action === 'notification.created'){
            await new NotificationCreated(nats.client).publish(syncData, true);
        }

        if(action === 'audit.created'){
            await new AuditCreated(nats.client).publish(syncData, true);
        }

        if(action === 'country.found'){
            await new CountryFound(nats.client).publish(syncData, true);
        }

        if(action === 'action.update'){
            await new LocationSaved(nats.client).publish(syncData, true);
        }

    }

}

export default new SystemService();