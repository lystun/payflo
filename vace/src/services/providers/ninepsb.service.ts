import { ComposePSBHashDTO, PSBAccountType, PSBAirtimeTopupDTO, PSBAmountType, PSBApiResponseDTO, PSBAuthDTO, PSBBillCategoriesDTO, PSBBillerInputDTO, PSBDataTopupDTO, PSBDisableAccountDTO, PSBEnableAccountDTO, PSBFundAccountDTO, PSBGenerateAccountDTO, PSBLedgerBalanceDTO, PSBMapAPIResponseDTO, PSBPayBillDTO, PSBRequestDTO, PSBSubCategoriesDTO, PSBTopUpDTO, PSBValidateInputDTO, PSBVerifyFundingDTO, PSBVerifyNubanDTO } from '../../dtos/providers/ninepsb.dto';
import { IResult } from '../../utils/types.util'
import Axios from 'axios'
import SystemService from '../system.service';
import { dateToday, isArray, isObject } from '@btffamily/vacepay';

class NinebankService {

    public config: any;
    private bankBaseUrl: string;
    private ftBaseUrl: string;
    private vasBaseUrl: string;

    private publicKey: string;
    private privateKey: string;
    private vasUsername: string;
    private vasPassword: string;
    private username: string;
    private password: string;

    public bankCode: string
    public bankAccount: string

    constructor () {

        if(!process.env.NINEPSB_VA_BASE_URL || !process.env.NINEPSB_FT_BASE_URL || !process.env.NINEPSB_VAS_BASE_URL || !process.env.NINEPSB_VAS_AUTH_URL){
            throw new Error('NINEPSB base urls are not defined')
        }else if(!process.env.NINEPSB_PUBLIC_KEY || !process.env.NINEPSB_SECRET_KEY){
            throw new Error('NINEPSB major API Keys are not defined')
        }else if(!process.env.NINEPSB_VAS_USERNAME || !process.env.NINEPSB_VAS_PASSWORD || !process.env.NINEPSB_USERNAME || !process.env.NINEPSB_PASSWORD){
            throw new Error('NINEPSB credentials are not defined')
        }else if(!process.env.NINEPSB_COLLECTION_ACCOUNT_NUMBER || !process.env.NINEPSB_BANK_CODE){
            throw new Error('NINEPSB bank credentials are not defined')
        }

        this.config = {
            headers: {
                Authorization: '',
                'Content-Type': 'application/json'
            }
        };

        this.bankBaseUrl = process.env.NINEPSB_VA_BASE_URL;
        this.ftBaseUrl = process.env.NINEPSB_FT_BASE_URL;
        this.vasBaseUrl = process.env.NINEPSB_VAS_BASE_URL;
        this.publicKey = process.env.NINEPSB_PUBLIC_KEY
        this.privateKey = process.env.NINEPSB_SECRET_KEY
        this.vasUsername = process.env.NINEPSB_VAS_USERNAME
        this.vasPassword = process.env.NINEPSB_VAS_PASSWORD
        this.username = process.env.NINEPSB_USERNAME
        this.password = process.env.NINEPSB_PASSWORD
        this.bankCode = process.env.NINEPSB_BANK_CODE;
        this.bankAccount = process.env.NINEPSB_COLLECTION_ACCOUNT_NUMBER;

    }

    /**
     * @name getAuthToken
     * @param {PSBAuthDTO} data - see PSBAuthDTO
     * @returns {IResult} see IResult
     */
    public async getAuthToken(data: PSBAuthDTO): Promise<IResult> {
        
        let url: string = '';
        let payload: PSBRequestDTO = {}
        let result: IResult = { error: false, message: '', code: 200, data: null }

        const { credentials, type } = data;

        if(type === 'virtual-account'){
            url = `${this.bankBaseUrl}/merchant/virtualaccount/authenticate`;
            payload = {
                publickey: credentials.public,
                privatekey: credentials.private
            }
        }else if(type === 'funds-transfer'){
            url = `${this.ftBaseUrl}/merchant/authenticate`;
            payload = {
                publickey: credentials.public,
                privatekey: credentials.private
            }
        }else if(type === 'vas-api'){
            url = `${process.env.NINEPSB_VAS_AUTH_URL}/authenticate`;  
            payload = {
                username: credentials.username,
                password: credentials.password
            }
        }

        await Axios.post(`${url}`, {...payload}, this.config)
        .then(async (resp) => {
            result = await this.mapAPIResponse({ type: 'success', payload: resp });
        }).catch(async (err) => {
            result = await this.mapAPIResponse({ type: 'error', payload: err });
        })


        return result;

    }

    /**
     * @name mapAPIResponse
     * @param data 
     * @returns 
     */
    private async mapAPIResponse(data: PSBMapAPIResponseDTO): Promise<IResult>{

        const { type, payload, token } = data;
        let result: IResult = { error: false, message: '', code: 200, data: null }
        let mappedData: any = {};

        if(type === 'success'){

            if(payload.data){

                if(payload.data.data){

                    if(isArray(payload.data.data)){
                        mappedData = payload.data.data;
                    }else if(isObject(payload.data.data)){
                        mappedData = { ...payload.data.data }
                    }

                    if( payload.data.responseCode ){
                        mappedData.responseCode = payload.data.responseCode;
                    }else if( payload.data.code ){
                        mappedData.code = payload.data.code;
                    }

                    result.data = mappedData;

                }else{
                    result.data = payload.data;
                }

            }else{
                result.data = payload;
            }

            if(result.data.code && result.data.code.toString() !== '00' && result.data.code.toString() !== '200'){

                result.error = true;
                result.message = result.data.message;
                
                if(token){
                    result.data.token = token;
                }

            }else if (result.data.responseCode && result.data.responseCode.toString() !== '00' && result.data.responseCode.toString() !== '200'){

                result.error = true;
                result.message = result.data.message;
                
                if(token){
                    result.data.token = token;
                }

            }

        }

        if(type === 'error'){

            let message = payload.response.data.message ? payload.response.data.message : payload.response.data.error ? payload.response.data.error : '';

            result.error = true;
            result.message = `Error: ${message}`;
            result.data = data;
            result.code = 500;

            if(token){
                result.data.token = token;
            }

        }

        return result;

    }
    
    /**
     * @name decodeAmountType
     * @param type 
     * @returns 
     */
    private decodeAmountType(type: 'any' | 'exact' | 'higher-exact' | 'lower-exact'): string {

        let result: string = '';

        if(type === 'any'){
            result = PSBAmountType.ANY
        }else if(type === 'exact'){
            result = PSBAmountType.EXACT
        }else if(type === 'higher-exact'){
            result = PSBAmountType.HIGHEROREXACT
        }else if(type === 'lower-exact'){
            result = PSBAmountType.LOWEROREXACT
        }

        return result;

    }

    /**
     * @name decodeAccountType
     * @param type 
     * @returns 
     */
    private decodeAccountType(type: 'static' | 'dynamic'): string {

        let result: string = '';

        if(type === 'static'){
            result = PSBAccountType.STATIC
        }else if(type === 'dynamic'){
            result = PSBAccountType.DYNAMIC
        }

        return result;

    }

    /**
     * @name generateAccount
     * @param data 
     * @returns 
     */
    public async generateAccount(data: PSBGenerateAccountDTO): Promise<IResult>{

        let payload: PSBRequestDTO = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }

        const { accountType, amount, amountType, country, customer, reference, currency, description } = data;

        const auth = await this.getAuthToken({
            type: 'virtual-account',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // define headers config
            const token: PSBApiResponseDTO = auth.data;
            this.config = {
                headers: {
                    Authorization: `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                }
            };

            // map ninepsb request
            payload = {
                transaction: {
                    reference: reference
                },
                order: {
                    amount: amount,
                    amounttype: this.decodeAmountType(amountType),
                    currency: currency ? currency : 'NGN',
                    country: country ? country : 'NGA',
                    description: description ? description : 'account generated for Vacepay customer'
                },
                customer: {
                    account: {
                        name: `${customer.firstName} ${customer.lastName}`,
                        type: this.decodeAccountType(accountType)
                    }
                }
            }

            if(accountType === 'dynamic' && payload.customer && payload.customer.account){

                payload.customer.account.expiry = {
                    hours: 1,
                    date: dateToday(Date.now()).ISO
                }

            }
    
            // call API
            await Axios.post(`${this.bankBaseUrl}/merchant/virtualaccount/create`, { ...payload }, this.config)
            .then(async (resp) => {
    
                result = await this.mapAPIResponse({ type: 'success', payload: resp });
    
            }).catch(async (err) => {

                result = await this.mapAPIResponse({ type: 'error', payload: err });

            })

        }


        return result;

    }

    /**
     * @name deactivateAccount
     * @param data 
     * @returns 
     */
    public async deactivateAccount(data: PSBDisableAccountDTO): Promise<IResult>{

        let payload: PSBRequestDTO = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }

        const { reference, accountNo } = data;

        const auth = await this.getAuthToken({
            type: 'virtual-account',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // define headers config
            const token: PSBApiResponseDTO = auth.data;
            this.config = {
                headers: {
                    Authorization: `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                }
            };

            // map ninepsb request
            payload = {
                transaction: {
                    reference: reference
                },
                customer: {
                    account: {
                        number: accountNo
                    }
                }
            }
    
            // call API
            await Axios.post(`${this.bankBaseUrl}/merchant/virtualaccount/deactivate`, {...payload}, this.config)
            .then(async (resp) => {
    
                result = await this.mapAPIResponse({ type: 'success', payload: resp });
    
            }).catch(async (err) => {

                result = await this.mapAPIResponse({ type: 'error', payload: err });

            })

        }


        return result;

    }

    /**
     * @name activateAccount
     * @param data 
     * @returns 
     */
    public async activateAccount(data: PSBEnableAccountDTO): Promise<IResult>{

        let payload: PSBRequestDTO = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }

        const { reference, accountNo } = data;

        const auth = await this.getAuthToken({
            type: 'virtual-account',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // define headers config
            const token: PSBApiResponseDTO = auth.data;
            this.config = {
                headers: {
                    Authorization: `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                }
            };

            // map ninepsb request
            payload = {
                transaction: {
                    reference: reference
                },
                customer: {
                    account: {
                        number: accountNo
                    }
                }
            }
    
            // call API
            await Axios.post(`${this.bankBaseUrl}/merchant/virtualaccount/reactivate`, {...payload}, this.config)
            .then(async (resp) => {
    
                result = await this.mapAPIResponse({ type: 'success', payload: resp });
    
            }).catch(async (err) => {

                result = await this.mapAPIResponse({ type: 'error', payload: err });

            })

        }


        return result;

    }

    /**
     * @name verifyFundAccount
     * @param data 
     * @returns 
     */
    public async verifyFundAccount(data: PSBVerifyFundingDTO): Promise<IResult>{

        let payload: PSBRequestDTO = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }

        const { reference, accountNo, amount } = data;

        const auth = await this.getAuthToken({
            type: 'virtual-account',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // define headers config
            const token: PSBApiResponseDTO = auth.data;
            this.config = {
                headers: {
                    Authorization: `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                }
            };

            // map ninepsb request
            payload = {
                reference: reference,
                accountnumber: accountNo
            }

            if(amount){
                payload.amount = amount;
            }
    
            // call API
            await Axios.post(`${this.bankBaseUrl}/merchant/virtualaccount/reactivate`, {...payload}, this.config)
            .then(async (resp) => {
    
                result = await this.mapAPIResponse({ type: 'success', payload: resp });
    
            }).catch(async (err) => {

                result = await this.mapAPIResponse({ type: 'error', payload: err });

            })

        }


        return result;

    }

    /**
     * @name listTransferBanks
     * @returns 
     */
    public async listTransferBanks(): Promise<IResult>{

        let payload: PSBRequestDTO = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }

        const auth = await this.getAuthToken({
            type: 'funds-transfer',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // define headers config
            const token: PSBApiResponseDTO = auth.data;
            this.config = {
                headers: {
                    Authorization: `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                }
            };
    
            // call API
            await Axios.post(`${this.ftBaseUrl}/merchant/transfer/getbanks`, {}, this.config)
            .then(async (resp) => {
    
                result = await this.mapAPIResponse({ type: 'success', payload: resp });
    
            }).catch(async (err) => {

                result = await this.mapAPIResponse({ type: 'error', payload: err });

            })

        }


        return result;

    }

    /**
     * @name getLedgerBalance
     * @description Only works on debit accounts profiled for the client ( i.e. vacepay on PSB9 )
     * @returns 
     */
    public async getLedgerBalance(data: PSBLedgerBalanceDTO): Promise<IResult>{

        let payload: PSBRequestDTO = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { accountNo } = data;

        const auth = await this.getAuthToken({
            type: 'funds-transfer',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // define headers config
            const token: PSBApiResponseDTO = auth.data;
            this.config = {
                headers: {
                    Authorization: `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                }
            };

            payload = {
                account: {
                    accountnumber: accountNo
                }
            }
    
            // call API
            await Axios.post(`${this.ftBaseUrl}/merchant/account/balanceenquiry`, {...payload}, this.config)
            .then(async (resp) => {
    
                result = await this.mapAPIResponse({ type: 'success', payload: resp });
    
            }).catch(async (err) => {

                result = await this.mapAPIResponse({ type: 'error', payload: err });

            })

        }


        return result;

    }

    /**
     * @name verifyNuban
     * @param data 
     * @returns 
     */
    public async verifyNuban(data: PSBVerifyNubanDTO): Promise<IResult>{

        let payload: PSBRequestDTO = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { accountNo, bankCode } = data;

        const auth = await this.getAuthToken({
            type: 'funds-transfer',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // define headers config
            const token: PSBApiResponseDTO = auth.data;
            this.config = {
                headers: {
                    Authorization: `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                }
            };

            payload = {
                customer: {
                    account: {
                        bank: bankCode,
                        number: accountNo
                    }
                }
            }
    
            // call API
            await Axios.post(`${this.ftBaseUrl}/merchant/account/enquiry`, {...payload}, this.config)
            .then(async (resp) => {
    
                result = await this.mapAPIResponse({ type: 'success', payload: resp });
    
            }).catch(async (err) => {

                result = await this.mapAPIResponse({ type: 'error', payload: err });

            })

        }


        return result;

    }

    /**
     * @name composeHash
     * @param data 
     * @returns 
     */
    public async composeHash(data: ComposePSBHashDTO): Promise<string> {

        let result: string = '', combined: string = '';
        const { type, reference, amount, bankCode, senderAcccountNo, recipientAccountNo, fee } = data;

        if(type === 'fund-normal'){
            combined = this.privateKey + senderAcccountNo + recipientAccountNo + bankCode + `${amount.toFixed(2)}` + reference;
        }else if(type === 'fund-with-fee'){
            combined = this.privateKey + senderAcccountNo + recipientAccountNo + bankCode + `${amount.toFixed(2)}` + `${fee?.toFixed(2)}` + reference;
        }else if(type === 'webhook-hash'){
            combined = this.password + senderAcccountNo + bankCode + recipientAccountNo + `${amount.toFixed(2)}`;
        }

        const hash = SystemService.createHashedData({ payload: combined, type: 'sha512' });
        
        if(!hash.error){
            result = hash.data
        }

        return result;

    }

    /**
     * @name fundBankAccount
     * @param data 
     * @returns 
     */
    public async fundBankAccount(data: PSBFundAccountDTO): Promise<IResult>{

        let payload: PSBRequestDTO = {}, url: string = '';
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { amount, recipient, reference, sender, type, country, currency, description } = data;

        const auth = await this.getAuthToken({
            type: 'funds-transfer',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // decode API URI
            if(type === 'fund-normal'){
                url = `${this.ftBaseUrl}/merchant/account/transfer`;
            }else if(type === 'with-fee'){
                url = `${this.ftBaseUrl}/merchant/account/transferwithfee`;
            }

            // get security hash
            let hash = await this.composeHash({
               amount: amount,
               bankCode: recipient.bankCode,
               recipientAccountNo: recipient.accountNo,
               reference: reference,
               senderAcccountNo: sender.accountNo,
               type: 'fund-normal'
            })

            // define headers config
            const token: PSBApiResponseDTO = auth.data;
            this.config = {
                headers: {
                    Authorization: `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                }
            };

            payload = {
                transaction: {
                    reference: reference
                },
                order: {
                    amount: parseFloat(amount.toFixed(2)),
                    currency: currency ? currency : 'NGN',
                    country: country ? country : 'NGA',
                    description: description ? description : ''
                },
                customer: {
                    account: {
                        name: recipient.accountName,
                        bank: recipient.bankCode,
                        number: recipient.accountNo,
                        senderaccountnumber: sender.accountNo,
                        sendername: sender.accountName
                    }
                },
                hash: hash
            }
    
            // call API
            await Axios.post(`${url}`, {...payload}, this.config)
            .then(async (resp) => {
    
                result = await this.mapAPIResponse({ type: 'success', payload: resp });
    
            }).catch(async (err) => {

                result = await this.mapAPIResponse({ type: 'error', payload: err });

            })

        }


        return result;

    }

    /**
     * @name getNetwork
     * @param data 
     * @returns 
     */
    public async getNetwork(data: PSBTopUpDTO): Promise<IResult>{

        let payload: PSBRequestDTO = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { phone } = data;

        const auth = await this.getAuthToken({
            type: 'vas-api',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // define headers config
            const token: PSBApiResponseDTO = auth.data;
            this.config = {
                headers: {
                    Authorization: `Bearer ${token.accessToken}`,
                    'Content-Type': 'application/json'
                }
            };

            payload = {
                phone: phone
            }
    
            // call API
            await Axios.get(`${this.vasBaseUrl}/topup/network?phone=${payload.phone}`, this.config)
            .then(async (resp) => {
    
                result = await this.mapAPIResponse({ type: 'success', payload: resp});
    
            }).catch(async (err) => {

                result = await this.mapAPIResponse({ type: 'error', payload: err});

            })

        }


        return result;

    }

    /**
     * @name getDataPlans
     * @param data 
     * @returns 
     */
    public async getDataPlans(data: PSBTopUpDTO): Promise<IResult>{

        let payload: PSBRequestDTO = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { phone } = data;

        const auth = await this.getAuthToken({
            type: 'vas-api',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // define headers config
            const token: PSBApiResponseDTO = auth.data;

            this.config = {
                headers: {
                    Authorization: `Bearer ${token.accessToken}`,
                    'Content-Type': 'application/json'
                }
            };

            payload = {
                phone: phone
            }
    
            // call API
            await Axios.get(`${this.vasBaseUrl}/topup/dataPlans?phone=${payload.phone}`, this.config)
            .then(async (resp) => {

                result = await this.mapAPIResponse({ type: 'success', payload: resp});

            }).catch(async (err) => {
                
                result = await this.mapAPIResponse({ type: 'error', payload: err});

            })

        }

        return result;

    }

    /**
     * @name getTopupStatus
     * @param data 
     * @returns 
     */
    public async getTopupStatus(data: PSBTopUpDTO): Promise<IResult>{

        let payload: PSBRequestDTO = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { reference } = data;

        const auth = await this.getAuthToken({
            type: 'vas-api',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // define headers config
            const token: PSBApiResponseDTO = auth.data;
            this.config = {
                headers: {
                    Authorization: `Bearer ${token.accessToken}`,
                    'Content-Type': 'application/json'
                }
            };

            payload = {
                transReference: reference
            }
    
            // call API
            await Axios.get(`${this.vasBaseUrl}/topup/status?transReference=${payload.transReference}`, this.config)
            .then(async (resp) => {
    
                result = await this.mapAPIResponse({ type: 'success', payload: resp});
    
            }).catch(async (err) => {

                result = await this.mapAPIResponse({ type: 'error', payload: err});

            })

        }


        return result;

    }

    /**
     * @name airtimeTopup
     * @param data 
     * @returns 
     */
    public async airtimeTopup(data: PSBAirtimeTopupDTO): Promise<IResult>{

        let payload: PSBRequestDTO = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { reference, phone, accountNo, amount, network } = data;

        const auth = await this.getAuthToken({
            type: 'vas-api',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // define headers config
            const token: PSBApiResponseDTO = auth.data;
            this.config = {
                headers: {
                    Authorization: `Bearer ${token.accessToken}`,
                    'Content-Type': 'application/json'
                }
            };

            payload = {
                transactionReference: reference,
                phoneNumber: phone,
                debitAccount: accountNo,
                amount: amount.toString(),
                network: network
            }
    
            // call API
            await Axios.post(`${this.vasBaseUrl}/topup/airtime`, { ...payload }, this.config)
            .then(async (resp) => {
    
                result = await this.mapAPIResponse({ type: 'success', payload: resp});
    
            }).catch(async (err) => {

                result = await this.mapAPIResponse({ type: 'error', payload: err});

            })

        }


        return result;

    }

    /**
     * @name dataTopup
     * @param data 
     * @returns 
     */
    public async dataTopup(data: PSBDataTopupDTO): Promise<IResult>{

        let payload: PSBRequestDTO = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { reference, phone, accountNo, amount, network, productId } = data;

        const auth = await this.getAuthToken({
            type: 'vas-api',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // define headers config
            const token: PSBApiResponseDTO = auth.data;
            this.config = {
                headers: {
                    Authorization: `Bearer ${token.accessToken}`,
                    'Content-Type': 'application/json'
                }
            };

            payload = {
                transactionReference: reference,
                phoneNumber: phone,
                debitAccount: accountNo,
                amount: amount.toString(),
                network: network,
                productId: productId
            }
    
            // call API
            await Axios.post(`${this.vasBaseUrl}/topup/data`, { ...payload }, this.config)
            .then(async (resp) => {
    
                result = await this.mapAPIResponse({ type: 'success', payload: resp});
    
            }).catch(async (err) => {

                result = await this.mapAPIResponse({ type: 'error', payload: err});

            })

        }


        return result;

    }

    /**
     * @name getBillCategories
     * @param data 
     * @returns 
     */
    public async getBillCategories(data: PSBBillCategoriesDTO): Promise<IResult>{

        let payload: PSBRequestDTO = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { } = data;

        const auth = await this.getAuthToken({
            type: 'vas-api',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // define headers config
            const token: PSBApiResponseDTO = auth.data;

            this.config = {
                headers: {
                    Authorization: `Bearer ${token.accessToken}`,
                    'Content-Type': 'application/json'
                }
            };

            payload = {}
    
            // call API
            await Axios.get(`${this.vasBaseUrl}/billspayment/categories`, this.config)
            .then(async (resp) => {
    
                result = await this.mapAPIResponse({ type: 'success', payload: resp});
    
            }).catch(async (err) => {

                result = await this.mapAPIResponse({ type: 'error', payload: err});

            })

        }


        return result;

    }

    /**
     * @name getSubCategories
     * @param data 
     * @returns 
     */
    public async getSubCategories(data: PSBSubCategoriesDTO): Promise<IResult>{

        let payload: PSBRequestDTO = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { categoryId } = data;

        const auth = await this.getAuthToken({
            type: 'vas-api',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // define headers config
            const token: PSBApiResponseDTO = auth.data;
            this.config = {
                headers: {
                    Authorization: `Bearer ${token.accessToken}`,
                    'Content-Type': 'application/json'
                }
            };

            payload = {
                categoryId
            }
    
            // call API
            await Axios.get(`${this.vasBaseUrl}/billspayment/billers/${payload.categoryId}`, this.config)
            .then(async (resp) => {
    
                result = await this.mapAPIResponse({ type: 'success', payload: resp});
    
            }).catch(async (err) => {

                result = await this.mapAPIResponse({ type: 'error', payload: err});

            })

        }


        return result;

    }

    /**
     * @name getBillerInputFields
     * @param data 
     * @returns 
     */
    public async getBillerInputFields(data: PSBBillerInputDTO): Promise<IResult>{

        let payload: PSBRequestDTO = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { billerId } = data;

        const auth = await this.getAuthToken({
            type: 'vas-api',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // define headers config
            const token: PSBApiResponseDTO = auth.data;
            this.config = {
                headers: {
                    Authorization: `Bearer ${token.accessToken}`,
                    'Content-Type': 'application/json'
                }
            };

            payload = {
                billerId
            }
    
            // call API
            await Axios.get(`${this.vasBaseUrl}/billspayment/fields/${payload.billerId}`, this.config)
            .then(async (resp) => {
    
                result = await this.mapAPIResponse({ type: 'success', payload: resp});
    
            }).catch(async (err) => {

                result = await this.mapAPIResponse({ type: 'error', payload: err});

            })

        }


        return result;

    }

    /**
     * @name validateInputFields
     * @param data 
     * @returns 
     */
    public async validateInputFields(data: PSBValidateInputDTO): Promise<IResult>{

        let payload: PSBRequestDTO = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { amount, billerId, customerId, firstName, itemId, lastName } = data;

        const auth = await this.getAuthToken({
            type: 'vas-api',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // define headers config
            const token: PSBApiResponseDTO = auth.data;
            this.config = {
                headers: {
                    Authorization: `Bearer ${token.accessToken}`,
                    'Content-Type': 'application/json'
                }
            };

            payload = {
                billerId: billerId,
                customerId: customerId,
                itemId: itemId,
                firstname: firstName,
                lastname: lastName,
                amount: amount.toString()
            }
    
            // call API
            await Axios.post(`${this.vasBaseUrl}/billspayment/validate`, {...payload}, this.config)
            .then(async (resp) => {
    
                result = await this.mapAPIResponse({ type: 'success', payload: resp});
    
            }).catch(async (err) => {

                result = await this.mapAPIResponse({ type: 'error', payload: err});

            })

        }


        return result;

    }

    /**
     * @name initiateBillPayment
     * @param data 
     * @returns 
     */
    public async initiateBillPayment(data: PSBPayBillDTO): Promise<IResult>{

        let payload: PSBRequestDTO = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { amount, billerId, customerId, accountNo, metadata, name, phoneNumber, reference, itemId } = data;

        const auth = await this.getAuthToken({
            type: 'vas-api',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // define headers config
            const token: PSBApiResponseDTO = auth.data;
            this.config = {
                headers: {
                    Authorization: `Bearer ${token.accessToken}`,
                    'Content-Type': 'application/json'
                }
            };

            payload = {
                billerId: billerId,
                customerId: customerId,
                itemId: itemId,
                customerName: name,
                customerPhone: phoneNumber,
                otherField: metadata,
                debitAccount: accountNo,
                transactionReference: reference,
                amount: amount.toString()
            }
    
            // call API
            await Axios.post(`${this.vasBaseUrl}/billspayment/pay`, {...payload}, this.config)
            .then(async (resp) => {
    
                result = await this.mapAPIResponse({ type: 'success', payload: resp});
    
            }).catch(async (err) => {

                result = await this.mapAPIResponse({ type: 'error', payload: err});

            })

        }


        return result;

    }

    /**
     * @name getBillPaymentStatus
     * @param reference 
     * @returns 
     */
    public async getBillPaymentStatus(reference: string): Promise<IResult>{

        let payload: PSBRequestDTO = {};
        let result: IResult = { error: false, message: '', code: 200, data: null }

        const auth = await this.getAuthToken({
            type: 'vas-api',
            credentials: {
                private: this.privateKey,
                public: this.publicKey,
                username: this.vasUsername,
                password: this.vasPassword
            }
        });

        if(auth.error){
            result = auth;
        }else{

            // define headers config
            const token: PSBApiResponseDTO = auth.data;
            this.config = {
                headers: {
                    Authorization: `Bearer ${token.accessToken}`,
                    'Content-Type': 'application/json'
                }
            };

            payload = {
                transReference: reference
            }
    
            // call API
            await Axios.get(`${this.vasBaseUrl}/billspayment/status?transReference=${payload.transReference}`, this.config)
            .then(async (resp) => {
    
                result = await this.mapAPIResponse({ type: 'success', payload: resp});
    
            }).catch(async (err) => {

                result = await this.mapAPIResponse({ type: 'error', payload: err});

            })

        }


        return result;

    }

}

export default new NinebankService();