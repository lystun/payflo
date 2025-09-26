import Axios from 'axios'
import { IResult, IPayData } from '../../utils/types.util'
import { MapPSKResponseDTO, PaystackResponseDTO } from '../../dtos/providers/paystack.dto';
import { notDefined } from '@btffamily/vacepay';

class Paystack {

    public config: any;
    public build: any;

    /**
     * 
     */
    constructor(){

        if(!process.env.PAYSTACK_SECRET_KEY || !process.env.PAYSTACK_API_URL){
            throw new Error('PAYSTACK_SECRET_KEY and/or PAYSTACK_API_URL is not defined')
        }

        this.config = {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        }

        this.build = {};

    }

    /**
     * @name mapAPIResponse
     * @param data 
     * @returns 
     */
    private mapAPIResponse(data: MapPSKResponseDTO): IResult{

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

            let message = payload.response.data.message ? payload.response.data.message : payload.response.data.error ? payload.response.data.error : '';

            result.error = true;
            result.message = `Error: ${message}`;
            result.data = payload.response.data;
            result.code = 500;

        }

        return result;

    }

    /**
     * 
     * @param {IPayData} query see {IPayData} in types.util
     * @returns 
     */
    public async getTransactions(query: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }

        this.build = `?${query.perPage ? 'perPage=' + query.perPage : ''}&${query.page ? 'page=' + query.page : ''}&${query.customer ? 'customer=' + query.customer : ''}&${query.status ? 'status=' + query.status : ''}`;

        await Axios.get(`${process.env.PAYSTACK_API_URL}/transaction${query ? this.build : ''}`, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        });

        return result;

    }

    /**
     * 
     * @param {IPayData} data see {IPayData} in types.util
     * @returns 
     */
    public async getTransaction(data: Partial<IPayData>): Promise<IResult> {
        
        let result: IResult = { error: false, message: '', data: null }

        await Axios.get(`${process.env.PAYSTACK_API_URL}/transaction/${data.txnId}`, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })

        return result;

    }

    /**
     * 
     * NOTE 
     * Add a custom_fields attribute which has an array of objects
     * if you would like the fields to be added to your transaction 
     * when displayed on the dashboard.
     * txnCharge is for flat rate settlements
     * 
     * @param {IPayData} data 
     * @returns 
     */
    public async initTransaction(data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }

        this.build = {
            email: data.email,
            amount: data.amount || 0 * 100,
            currency: data.currency || 'NGN',
            reference: data.reference,
            callback_url: data.callbackUrl || null,
            plan: data.planCode || null,
            invoice_limit: data.invoiceLimit || null,
            metadata: data.metadata || null,
            subaccount: data.subaccountCode || null,
            transaction_charge: data.txnCharge || null,
            bearer: data.payBearer || null,
            channels: data.channels || null
        }

        await Axios.post(`${process.env.PAYSTACK_API_URL}/transaction/initialize`, {...this.build}, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })

        return result;
        
    }

    /**
     * 
     * @param {IPayData} data 
     * @returns 
     */
    public async verifyTransaction(data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }

        await Axios.get(`${process.env.PAYSTACK_API_URL}/transaction/verify/${data.reference}`, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })

        return result;
        
    }

    /**
     * 
     * @param {IPayData} data 
     * @returns 
     */
    public async createCharge(data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }

        this.build = {
            email: data.email,
            amount: data.amount,
            currency: data.currency ? data.currency : 'NGN',
            reference: data.reference,
            metadata: data.metadata,
            card: data.card,
            authorization_code: data.authCode ? data.authCode : null,
            subaccount: data.subaccountCode || null,
            callback_url: data.callbackUrl || null,
        }

        await Axios.post(`${process.env.PAYSTACK_API_URL}/charge`, {...this.build}, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })

        return result;
        
    }

    /**
     * 
     * @param {IpayData} data 
     * @returns 
     */
    public async chargeAuth(data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }

        this.build = {
            email: data.email,
            amount: data.amount,
            currency: data.currency || 'NGN',
            reference: data.reference,
            callback_url: data.callbackUrl || null,
            plan: data.planCode || null,
            invoice_limit: data.invoiceLimit || null,
            metadata: data.metadata || null,
            subaccount: data.subaccountCode || null,
            authorization_code: data.authCode,
            transaction_charge: data.txnCharge || null, // for flat fee
            bearer: data.payBearer || null,  // who bears the paystack fee
            channels: data.channels || null
        }

        await Axios.post(`${process.env.PAYSTACK_API_URL}/transaction/charge_authorization`, {...this.build}, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })

        return result;
        
    }

    /**
     * @name formatCharge
     * @param status 
     * @param ref 
     * @param charge 
     * @returns 
     */
    public async formatCharge(status: string, ref: string, charge: PaystackResponseDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }

        let resp: Partial<IPayData> = {
            nextStep: '',
            url: '',
            status: '',
            displayText: '',
            reference: '',
            type: '',
            metadata: {},
            statusCode: 200
        }

        if(status === 'open_url'){
            resp.nextStep = 'redirect customer to the url provided';
            resp.url = charge.url;
            resp.status = 'pending';
            resp.reference =  charge.reference;
            resp.type = 'url';
            resp.statusCode = 206;
        }else if(status === 'send_pin'){
            resp.nextStep = 'card pin is required';
            resp.displayText = 'customer card pin is required';
            resp.status = 'pending';
            resp.reference =  charge.reference;
            resp.type = 'pin';
            resp.statusCode = 206
        }else if(status === 'send_otp'){
            resp.nextStep = 'OTP is required';
            resp.displayText = 'enter the otp sent to your phone number and/or email';
            resp.status = 'pending';
            resp.reference =  charge.reference;
            resp.type = 'otp';
            resp.statusCode = 206;
        }else if(status === 'failed'){
            resp.nextStep = 'transaction failed.';
            resp.displayText = 'unable to process transaction. Contact support';
            resp.status = 'failed';
            resp.reference =  charge.reference;
            resp.metadata = charge;
            resp.statusCode = 500;
        }else if(status === 'send_birthday'){
            resp.nextStep = 'customer birthday is required';
            resp.displayText = 'supply customer birtday information';
            resp.status = 'pending';
            resp.reference =  charge.reference;
            resp.type = 'birthday';
            resp.statusCode = 206;
        }else if(status === 'send_phone'){
            resp.nextStep = 'Phone is required';
            resp.displayText = 'supply customer phone number';
            resp.status = 'pending';
            resp.reference =  charge.reference;
            resp.type = 'phone'
            resp.statusCode = 206;
        }else if(status === 'send_address'){
            resp.nextStep = 'Address is required';
            resp.displayText = 'supply customer address';
            resp.status = 'pending';
            resp.reference =  charge.reference;
            resp.type = 'address';
            resp.statusCode = 206;
        }else if(status === 'success' && (charge.gateway_response === 'Successful' || charge.gateway_response === 'Approved')){
    
            resp.nextStep = 'successful';
            resp.displayText = 'transaction successful';
            resp.status = 'success';
            resp.reference =  charge.reference;
            resp.statusCode = 200;
    
        }else if(status === 'timeout'){
            resp.nextStep = 'transaction failed';
            resp.displayText = 'transaction failed, try again.';
            resp.status = 'failed';
            resp.reference =  charge.reference;
            resp.statusCode = 500;
        }else if(status === 'pending'){
            resp.nextStep = 'transaction processing';
            resp.displayText = 'transaction is being processed, check back for status';
            resp.status = 'pending';
            resp.reference =  charge.reference;
            resp.statusCode = 206;
        }

        result.data = resp;
        return result;
        
    }

    /**
     * 
     * @param data 
     * @returns 
     */
    public async verifyNuban(data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }

        const query = `account_number=${data.accountNo}&bank_code=${data.bankCode}`;

        await Axios.get(`${process.env.PAYSTACK_API_URL}/bank/resolve?${query}`, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })

        return result;
        
    }

    /**
     * @name getBankList
     * @param data 
     * @returns 
     */
    public async getBankList(data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }

        let build = {
            perPage: data.perPage ? data.perPage : 9999,
            country: data.country ? data.country : 'nigeria',
            useCursor: data.useCursor ? data.useCursor : false
        }

        const query = `per_page=${build.perPage}&country=${build.country}&use_cursor=${build.useCursor}`;

        await Axios.get(`${process.env.PAYSTACK_API_URL}/bank?${query}`, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })

        return result;
        
    }

    /**
     * 
     * @param data 
     * @returns 
     */
    public async createRecipient(data: Partial<IPayData>): Promise<IResult> {

        // const allowed = ['nuban', 'mobile_money', 'basa'];
        let result: IResult = { error: false, message: '', data: null }

        const query = {
            type: data.transferType ? data.transferType : 'nuban',
            name: data.businessName,
            email: data.email,
            description: data.description,
            account_number: data.accountNo,
            bank_code: data.bankCode,
            currency: data.currency ? data.currency : 'NGN',
            authorization_code: data.authCode ? data.authCode : '',
            metadata: data.metadata ? data.metadata : {}
        }

        await Axios.post(`${process.env.PAYSTACK_API_URL}/transferrecipient`, {...query}, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })

        return result;
        
    }

    /**
     * @name getBalance
     * @returns 
     */
    public async getBalance(): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }

        await Axios.get(`${process.env.PAYSTACK_API_URL}/balance`, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })

        return result;
        
    }

    /**
     * 
     * @param data 
     * @returns 
     */
    public async transfer(data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }

        // source is 'balance' which means your own paystack account balance

        const query = {
            source: data.source ? data.source : 'balance',
            amount: data.amount ? data.amount : 0,
            recipient: data.recipientCode,
            reason: data.reason,
            currency: data.currency ? data.currency : 'NGN'
        }

        await Axios.post(`${process.env.PAYSTACK_API_URL}/transfer`, {...query}, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })

        return result;
        
    }

    /**
     * 
     * @param data 
     * @returns 
     */
    public async finalizeTransfer(data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }

        const query = {
            transfer_code: data.transferCode,
            otp: data.otp
        }

        await Axios.post(`${process.env.PAYSTACK_API_URL}/transfer`, {...query}, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })

        return result;
        
    }

    /**
     * 
     * @param data 
     * @param type 
     * @returns 
     */
    public async submitPay(data: Partial<IPayData>, type: string = 'pin'): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }
        let subm: any = {};

        if(type === 'pin'){
        
            subm.reference = data.reference,
            subm.pin = data.pin,
            subm.url = 'submit_pin'
        }
        
        if(type === 'otp'){
            subm.reference= data.reference,
            subm.otp = data.otp,
            subm.url = 'submit_otp'
        }
        
        if(type === 'phone'){
            subm.reference = data.reference,
            subm.phone = data.phone,
            subm.url = 'submit_phone'
        }
        
        if(type === 'birthday'){
            subm.reference = data.reference,
            subm.birthday = data.birthday, // YYYY-MM-DD
            subm.url = 'submit_birthday'
        }
        
        if(type === 'address'){
            subm.reference = data.reference,
            subm.address = data.address,
            subm.city = data.city,
            subm.state = data.state,
            subm.zip_code = data.zipCode,
            subm.url = 'submit_address'
        }

        await Axios.post(`${process.env.PAYSTACK_API_URL}/charge/${subm.url}`, {...subm}, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })

        return result;
        
    }

    /**
     * 
     * @param data 
     * @returns 
     */
    public async createSubaccount(data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }

        this.build = {
            business_name: data.businessName,
            bank_code: data.bankCode,
            account_number: data.accountNo,
            percentage_charge: data.perCharge
        }

        await Axios.post(`${process.env.PAYSTACK_API_URL}/subaccount`, {...this.build}, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })

        return result;
        
    }

    /**
     * 
     */
    public async verifyBVN(data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }
    
        this.build = {
            bvn: data.bvn,
            account_number: data.accountNo,
            bank_code: data.bankCode
        }
    
        await Axios.post(`${process.env.PAYSTACK_API_URL}/bvn/match`, {...this.build}, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })
    
        return result;
    
    }
    
    /**
     * 
     */
    public async verifyCard(data: Partial<IPayData>): Promise<IResult>{

        let result: IResult = { error: false, message: '', data: null }
    
        await Axios.get(`${process.env.PAYSTACK_API_URL}/decision/bin/${data.cardBin}`, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })
    
        // result.data equals 
        // "bin": "408408",
        // "brand": "visa",
        // "sub_brand": "",
        // "country_code": "NG",
        // "country_name": "Nigeria",
        // "card_type": "DEBIT",
        // "bank": "Test Bank",
        // "linked_bank_id": 24
    
        return result;
    
    }
    
    /**
     * 
     */
    public async createRefund(data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }
    
        this.build = {
            transaction: data.reference,
            amount: data.amount,
            currency: data.currency || 'NGN',
            customer_note: data.customerReason,
            merchant_note: data.merchantReason
        }
    
        await Axios.post(`${process.env.PAYSTACK_API_URL}/refund`, {...this.build}, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })
    
        return result;
    
    }
    
    /**
     * 
     * @param data 
     * @returns 
     */
    public async getRefunds (data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }
    
        this.build = `?${data.reference ? 'reference=' + data.reference : ''}&${data.currency ? 'currency=' + data.currency : ''}`
    
        await Axios.get(`${process.env.PAYSTACK_API_URL}/refund${this.build}`, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })
    
        return result;
    
    }
    
    /**
     * 
     * @param data 
     * @returns 
     */
    public async getRefund (data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }
    
        await Axios.get(`${process.env.PAYSTACK_API_URL}/refund/${data.reference ? data.reference : ''}`, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })
    
        return result;
    
    }
    
    /**
     * 
     * @param data 
     * @returns 
     */
    public async createPlan (data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }
    
        this.build = {
            name: data.planName,
            interval: data.interval, // 'monthly', 'daily', 'weekly', 'monthly', 'quarterly', 'annually'
            amount: data.amount ? data.amount * 100 : 0,
            currency: data.currency || 'NGN',
            description: data.description,
            send_invoices: false,
            send_sms: false,
        }
    
        await Axios.post(`${process.env.PAYSTACK_API_URL}/plan`, {...this.build}, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })
    
        return result;
    
    }
    
    /**
     * 
     * @param data 
     * @returns 
     */
    public async getAllPlans (data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }
    
        this.build = `?${data.perPage ? 'perPage=' + data.perPage : ''}&
        ${data.page ? 'page=' + data.page : ''}&${data.interval ? 'interval=' + data.interval : ''}&
        ${data.amount ? 'amount=' + data.amount * 100 : ''}`
    
        await Axios.get(`${process.env.PAYSTACK_API_URL}/plan${this.build}`, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })
    
        return result;
    
    }
    
    /**
     * 
     * @param data 
     * @returns 
     */
    public async getPlan (data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }
    
        this.build = `${data.planId ? data.planId : data.planCode ? data.planCode : ''}`
    
        await Axios.get(`${process.env.PAYSTACK_API_URL}/plan/${this.build}`, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })
    
        return result;
    
    }
    
    /**
     * 
     * @param data 
     * @returns 
     */
    public async updatePlan (data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }
    
        const param = `${data.planId ? data.planId : data.planCode ? data.planCode : ''}`;
    
        this.build = {
            name: data.planName,
            interval: data.interval, // 'monthly', 'daily', 'weekly', 'monthly', 'quarterly', 'annually'
            currency: data.currency || 'NGN',
            description: data.description,
            send_invoices: false,
            send_sms: false,
        }
    
        await Axios.put(`${process.env.PAYSTACK_API_URL}/plan/${param}`, {...this.build} , this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })
    
        return result;
    
    }
    
    /**
     * 
     * @param data 
     * @returns 
     */
    public async createTxnSubscription (data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }
    
        this.build = {
            email: data.email,
            amount: data.amount ? data.amount * 100 : 0,
            currency: data.currency || 'NGN',
            reference: data.reference,
            callback_url: data.callbackUrl || null,
            plan: data.planCode || null,
            invoice_limit: data.invoiceLimit || null,
            metadata: data.metadata || null,
        }
    
        await Axios.post(`${process.env.PAYSTACK_API_URL}/transaction/initialize`, {...this.build}, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })
    
        return result;
    
    }
    
    /**
     * 
     * @param data 
     * @returns 
     */
    public async createSubscription (data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }
    
        this.build = {
            customer: data.email ? data.email : data.customerCode,
            plan: data.planCode,
            start_date: data.startDate  // has to be ISO date format ://: e.g: 2017-05-16T00:30:13+01:00
        }
    
        await Axios.post(`${process.env.PAYSTACK_API_URL}/subscription`, {...this.build}, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })
    
        return result;
    
    }
    
    /**
     * 
     * @param data 
     * @returns 
     */
    public async getSubscriptions (data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }
    
        this.build = `?${data.perPage ? 'perPage=' + data.perPage : ''}&
        ${data.page ? 'page=' + data.page : ''}&${data.customer ? 'customer=' + data.customerId : ''}&
        ${data.plan ? 'plan=' + data.planId || 0 * 100 : ''}`
    
        await Axios.get(`${process.env.PAYSTACK_API_URL}/subscription${this.build}`, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })
    
        return result;
    
    }
    
    /**
     * 
     * @param data 
     * @returns 
     */
    public async getSubscription (data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }
    
        this.build = `${data.subId ? data.subId : data.subCode ? data.subCode : ''}`
    
        await Axios.get(`${process.env.PAYSTACK_API_URL}/subscription/${this.build}`, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })
    
        return result;
    
    }
    
    /**
     * 
     * @param data 
     * @returns 
     */
    public async enableSubscription (data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }
    
        this.build = {
            code: data.subCode,
            token: data.emailToken
        }
    
        await Axios.post(`${process.env.PAYSTACK_API_URL}/subscription/enable`, {...this.build}, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })
    
        return result;
    
    }
    
    /**
     * 
     * @param data 
     * @returns 
     */
    public async disableSubscription (data: Partial<IPayData>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null }
    
        this.build = {
            code: data.subCode,
            token: data.emailToken
        }
    
        await Axios.post(`${process.env.PAYSTACK_API_URL}/subscription/disable`, {...this.build}, this.config)
        .then((resp) => {
            
            result = this.mapAPIResponse({ type: 'success', payload: resp });

        }).catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        })
    
        return result;
    
    }


}

export default new Paystack();