import crypto, { createHash } from 'crypto'
import mongoose, { Model } from 'mongoose';
import { generate } from '../utils/random.util';
import { IBank, ICountry, IResult } from '../utils/types.util'
import fs from 'fs';
import QRCode from 'qrcode'
import nats from '../events/nats'
import NotificationCreated from '../events/publishers/notification-created'
import AuditCreated from '../events/publishers/audit-created'
import UserUpdated from '../events/publishers/user-updated'
import UserDeleted from '../events/publishers/user-deleted'
import { Encryption, SyncAction, SyncType, dateToday, formatISO } from '@btffamily/vacepay';
import appRootPath from 'app-root-path';

import dayjs from 'dayjs'
import customParse from 'dayjs/plugin/customParseFormat'
import weekParse from 'dayjs/plugin/weekOfYear'
import { CreateHashDataDTO, DecryptDataDTO, EncryptDataDTO, GenerateQRCodeDTO } from '../dtos/system.dto';
dayjs.extend(customParse);
dayjs.extend(weekParse);

class SystemService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name formatISO
     * @param ISO 
     * @returns 
     */
    public formatISO(ISO: string): { date: string, time: string } {

        let result = formatISO(ISO);

        return result;

    }

    /**
     * @name stringToObjectId
     * @param value 
     * @returns 
     */
    public stringToObjectId(value: string): mongoose.Types.ObjectId {
        return new mongoose.Types.ObjectId(value);
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
     * @name readBanks
     * @returns 
     */
    public async readBanks(): Promise<Array<IBank>> {

        const fileUrl = `${appRootPath.path}/src/_data/banks.json`;

        // read in the JSON file
        const banks: Array<IBank> = JSON.parse(
            fs.readFileSync(fileUrl, 'utf-8')
        );

        return banks;

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
    public lastDayOfMonth(d: string = ''){

        const today = d ? new Date(d) : new Date();
        const convToday = dateToday(today);
    
        const last = new Date(convToday.year, convToday.month, 1);
        const convLast = dateToday(last);
        
        return { date: last, converted: convLast }
    
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

            if(split.length > 0){

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
     * @name generateQRCode
     * @param data 
     * @returns 
     */
    public async generateQRCode(data: GenerateQRCodeDTO): Promise<IResult>{

        let result: IResult = { error: false, message: '', code: 200, data: null }

        await QRCode.toDataURL( data.qrData )
        .then((resp: string) => {
            result.error = false;
            result.data = resp;
        }).catch((err) => {
            result.error = true;
            result.message = `Error! ${err}`;
        })
        
        return result;

    }

    /**
     * @name createHashedData
     * @param data 
     * @returns 
     */
    public createHashedData(data: CreateHashDataDTO): IResult{

        let stringed: string = '';
        let result: IResult = { error: false, message: '', code: 200, data: null }

        const { payload, type } = data;

        try {

            if(type === 'sha512'){

                if(typeof(payload) === 'object'){
                    stringed = JSON.stringify(payload)
                }else if(typeof(payload) === 'string'){
                    stringed = payload;
                }
    
                const hash = createHash('sha512').update(stringed).digest('hex');
                result.data = hash;
    
            }
            
        } catch (error) {

            result.error = true;
            result.data = error;
            
        }

        return result;

    }

    /**
     * @name encryptData
     * @param data 
     * @returns 
     */
    public async encryptData(data: EncryptDataDTO): Promise<string>{

        let result: string = '';
        const { password, separator } = data;

        const encrypted = Encryption.encryptAESGCM(data, password);

        if(encrypted.error === false){
            result = encrypted.data + separator + encrypted.vector;
        }

        return result;

    }

    /**
     * @name decryptData
     * @param data 
     * @returns 
     */
    public async decryptData(data: DecryptDataDTO): Promise<any>{

        let result: any = null;

        const { password, payload, separator } = data;

        const hashed = payload.split(separator);

        if(hashed.length > 0){

            const cipher = hashed[0];
            const vector = hashed[1];
    
            let decrypted = Encryption.decryptAESGCM(cipher, vector, password);

            if (decrypted.error === false) {
                const parsed = JSON.parse(decrypted.data); // parse decrypted data
                decrypted.data = parsed.payload;
            }

            result = decrypted;

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

        if(action === 'user.updated'){
            await new UserUpdated(nats.client).publish(syncData, true);
        }

        if(action === 'notification.created'){
            await new NotificationCreated(nats.client).publish(syncData, true);
        }

        if(action === 'audit.created'){
            await new AuditCreated(nats.client).publish(syncData, true);
        }

        if(action === 'user.deleted'){
            await new UserDeleted(nats.client).publish(syncData, true);
        }

    }
    

}

export default new SystemService();