import { timingSafeEqual, createHmac } from 'crypto'
import { objectToArray } from "@btffamily/vacepay";
import { DojahLookupBVNDTO, DojahLookupCACDTO, DojahLookupNINDTO, DojahRequestDTO, DojahSubscribeToWebhookDTO, DojahValidateWebhookDTO, MapDojahResponseDTO } from "../../dtos/dojah.dto";
import { IResult } from "../../utils/types.util";
import Axios, { AxiosRequestConfig } from 'axios'

class DojahService {

    private appId: string;
    private publicKey: string;
    private privateKey: string;
    private apiUrl: string;
    private headers: any;

    public defaultBVN: string;
    public defaultNIN: string;

    constructor() {

        if (!process.env.DOJAH_APP_ID || !process.env.DOJAH_PUBLIC_KEY || !process.env.DOJAH_PRIVATE_KEY || !process.env.DOJAH_API_URL) {
            throw new Error('Dojah API Keys are not defined')
        }

        this.appId = process.env.DOJAH_APP_ID;
        this.publicKey = process.env.DOJAH_PUBLIC_KEY;
        this.privateKey = process.env.DOJAH_PRIVATE_KEY;
        this.apiUrl = process.env.DOJAH_API_URL;
        this.defaultBVN = process.env.DEFAULT_BVN_NUMBER || '22222222222';
        this.defaultNIN = process.env.DEFAULT_NIN_NUMBER || '70123456789';

        this.headers = {
            Authorization: `${this.privateKey}`,
            AppId: `${this.appId}`,
            'Content-Type': 'application/json'
        }
        

    }

    /**
     * @name mapAPIResponse
     * @param data 
     * @returns 
     */
    private mapAPIResponse(data: MapDojahResponseDTO): IResult{

        const { type, payload } = data;
        let result: IResult = { error: false, message: '', code: 200, data: null }

        if(type === 'success'){

            if(payload.data){
    
                if(payload.data.data){
                    result.data = payload.data.data
                }else{
                    result.data = payload.data;
                }

            }else{
                result.data = payload;
            }

        }

        if(type === 'error'){

            let message: string = '';

            if(payload.response.data){
                message = payload.response.data.message ? payload.response.data.message : payload.response.data.error ? payload.response.data.error : payload.response.data;
            }else{
                message = payload.response;
            }

            result.error = true;
            result.message = `Error: ${message}`;
            result.data = data;
            result.code = 500;

        }

        return result;

    }

    /**
     * @name validateBVN
     * @param data 
     * @returns 
     */
    public async validateBVN(data: DojahLookupBVNDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null }
        let query: string = '';
        const { bvn, dob, firstName, lastName } = data;

        let build: DojahRequestDTO = {
            bvn: bvn,
            dob: dob ? dob : '',
            first_name: firstName ? firstName : '',
            last_name: lastName ? lastName : ''
        }

        // build query using entries
        const entries = objectToArray(build);
        entries.forEach((entry, index) => {

            if (index === 0) {
                query = `${entry.key}=${entry.value}`;
            } else {
                query = query + `&${entry.key}=${entry.value}`;
            }

        });

        const config: AxiosRequestConfig = {
            method: 'GET',
            url: `${this.apiUrl}/kyc/bvn/full?${query}`,
            headers: this.headers
        }

        await Axios(config)
            .then((resp) => {
                result = this.mapAPIResponse({ type: 'success', payload: resp });
            })
            .catch((err) => {
                result = this.mapAPIResponse({ type: 'error', payload: err });
            });


        return result;

    }

    /**
     * @name validateNIN
     * @param data 
     * @returns 
     */
    public async validateNIN(data: DojahLookupNINDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null }
        let query: string = '';
        const { nin, dob, firstName, lastName } = data;

        let build: DojahRequestDTO = {
            nin: nin,
            dob: dob ? dob : '',
            first_name: firstName ? firstName : '',
            last_name: lastName ? lastName : ''
        }

        // build query using entries
        const entries = objectToArray(build);
        entries.forEach((entry, index) => {

            if (index === 0) {
                query = `${entry.key}=${entry.value}`;
            } else {
                query = query + `&${entry.key}=${entry.value}`;
            }

        });

        const config: AxiosRequestConfig = {
            method: 'GET',
            url: `${this.apiUrl}/kyc/nin?${query}`,
            headers: this.headers
        }

        await Axios(config)
            .then((resp) => {
                result = this.mapAPIResponse({ type: 'success', payload: resp });
            })
            .catch((err) => {
                result = this.mapAPIResponse({ type: 'error', payload: err });
            });
            

        return result;

    }

    /**
     * @name validateCACNumber
     * @param data 
     * @returns 
     */
    public async validateCACNumber(data: DojahLookupCACDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null }
        let query: string = '';
        const { rcNumber, companyName } = data;

        let build: DojahRequestDTO = {
            rc_number: rcNumber,
            company_name: companyName
        }

        // build query using entries
        const entries = objectToArray(build);
        entries.forEach((entry, index) => {

            if (index === 0) {
                query = `${entry.key}=${entry.value}`;
            } else {
                query = query + `&${entry.key}=${entry.value}`;
            }

        });

        const config: AxiosRequestConfig = {
            method: 'GET',
            url: `${this.apiUrl}/kyc/cac?${query}`,
            headers: this.headers
        }

        await Axios(config)
            .then((resp) => {
                result = this.mapAPIResponse({ type: 'success', payload: resp });
            })
            .catch((err) => {
                result = this.mapAPIResponse({ type: 'error', payload: err });
            });
            

        return result;

    }

    /**
     * @name subscribeToWebhook
     * @param data 
     * @returns 
     */
    public async subscribeToWebhook(data: DojahSubscribeToWebhookDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null }
        let query: string = '';
        const { webhookUrl, service  } = data;

        let build: DojahRequestDTO = {
            webhook: webhookUrl,
            service: service
        }

        const config: AxiosRequestConfig = {
            method: 'POST',
            url: `${this.apiUrl}/webhook/subscribe`,
            headers: this.headers,
            data: build
        }

        await Axios(config)
            .then((resp) => {
                result = this.mapAPIResponse({ type: 'success', payload: resp });
            })
            .catch((err) => {
                result = this.mapAPIResponse({ type: 'error', payload: err });
            });
            

        return result;

    }



    /**
     * @name validateWebhook
     * @param data 
     * @returns 
     */
    public async validateWebhook(data: DojahValidateWebhookDTO): Promise<boolean> {

        let result: boolean = false;
        const { payload,signature } = data
        
        let hash = createHmac('sha256', this.privateKey).update(JSON.stringify(payload)).digest('hex');
        result = hash === signature;

        return result;

    }



}

export default new DojahService()