import { SyncAction, SyncType, dateToday } from '@btffamily/vacepay';
import { Model } from 'mongoose';
import { generate } from '../utils/random.util';
import { ICountry, IResult } from '../utils/types.util'
import crypto from 'crypto'
import fs from 'fs';
import nats from '../events/nats'
import NotificationCreated from '../events/publishers/notification-created'
import AuditCreated from '../events/publishers/audit-created'
import appRootPath from 'app-root-path';

import dayjs from 'dayjs'
import customParse from 'dayjs/plugin/customParseFormat'
import weekParse from 'dayjs/plugin/weekOfYear'
dayjs.extend(customParse);
dayjs.extend(weekParse);


interface IMonthsSplit {
    start: number,
    end: number,
    dates: Array<number>
}

interface IDatesSplit {
    label: string,
    start:string,
    end:string,
    dates: Array<string>
}

class SystemService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name isBase64
     * @param data 
     * @returns 
     */
    public isBase64(data: string): boolean{
        let result: boolean = false;

        const mime = data.split(';base64')[0].split(':')[1];

        if(mime && mime !== ''){
            result = true;
        }

        return result;
    }

    /**
     * @name getBase64Mime
     * @param data 
     * @returns 
     */
    public getBase64Mime(data: string): string{
        let result: string = '';

        if(this.isBase64(data)){
            result = data.split(';base64')[0].split(':')[1];
        }

        return result;
    }

    /**
     * @name readCountries
     */
    public async readCountries(): Promise<Array<ICountry>> {

        const fileUrl = `${appRootPath.path}/src/_data/countries.json`;

        // read in the JSON file
        const countries: Array<ICountry> = JSON.parse(
            fs.readFileSync(fileUrl, 'utf-8')
        );

        return countries;

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
     * @name unlinkFile
     * @description delete the temp folder/file created while processing data
     * @param type 
     * @param path 
     * 
     * @returns {void} void
     */
    public async unlinkFile(type: string, path: string): Promise<void>{

        if(type === 'file' && fs.existsSync(path)){
            fs.rmSync(path);
        }

        if(type === 'folder' && fs.existsSync(path)){
            fs.rmSync(path, { recursive: true, force: true });
        }

    }

     /**
     * 
     * @param path 
     */
     public async delTempFolder(path:string): Promise<void>{
        
        const split = path.split('tmp');
        const folder = `${split[0]}tmp`
        await this.unlinkFile('folder', folder);

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
     * @name getWeeksInMonth
     * @param year 
     * @param month 
     * @returns 
     */
    public getWeeksInMonth(year: number, month: number): Array<IMonthsSplit> {

        let weeks: Array<Array<number>> = [];
        let dwc: number = 0;
    
        const fd = new Date(year, month, 1); // first date
        const ld = new Date(year, month + 1, 0); // last date
        const nod = ld.getDate(); // number of days
    
        dwc = fd.getDate(); // init counter ( this always gives 1)
    
        for(let i = 1; i <= nod; i++){
    
            // NB: {i} is the date here

            if(weeks.length === 0){
                weeks.push([])
            }
    
            if(weeks[weeks.length - 1].length < 7){
                weeks[weeks.length - 1].push(i)
            }else{
                weeks.push([])
                weeks[weeks.length - 1].push(i)
            }
    
            dwc = (dwc + 1) % 7;
    
        }
    
        const rs: Array<IMonthsSplit> = weeks.map((w) => ({
            start: w[0],
            end: w[w.length - 1],
            dates: w
        }))
    
        return rs;
    }

    /**
     * @name getWeeksDates
     * @param year 
     * @param month 
     * @param data 
     * @returns 
     */
    public getWeeksDates(year: number, month: number, data: Array<IMonthsSplit>): Array<IDatesSplit>{

        let result: Array<IDatesSplit> = []

        if(data.length > 0){

            for(let i = 0; i < data.length; i++){

                const week = data[i];

                result.push({
                    label: `Week ${i+1}`,
                    start: dateToday(`${year}-${month}-${week.start}`).ISO,
                    end: dateToday(`${year}-${month}-${week.end}`).ISO,
                    dates: []
                })

                week.dates.forEach((dt) => {
                    let p = dateToday(`${year}-${month}-${dt}`);
                    result[i].dates.push(p.ISO)
                })

            }

        }

        return result;

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

    }

}

export default new SystemService();