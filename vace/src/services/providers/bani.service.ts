import crypto from 'crypto'
import { IResult } from "../../utils/types.util";
import { BaniPaymentBanksDTO, BaniRequestDTO, BaniVerifyStatusDTO, BankTransferWithBaniDTO, BuyAirtimeWithBaniDTO, BuyDataWithBaniDTO, CreateBaniCustomerDTO, GenerateBaniAccountDTO, ListBaniMobileDataDTO, MapBaniResponseDTO, PayBillsDTO, PayBillsWithBaniDTO, ValidateBaniBillDTO, ValidateBillerWithBaniDTO, VerifyBaniNubanDTO, VerifyBaniWebookDTO } from '../../dtos/providers/bani.dto';
import Axios, { AxiosRequestConfig } from 'axios'
import { BuyAirtimeDTO } from '../../dtos/wallet.dto';

class BaniService {

    public config: any;
    private tribeAccountRef: string;
    private publicKey: string;
    private merchantPrivateKey: string;
    private accessToken: string;
    private baniBaseUrl: string;

    constructor () {

        if(!process.env.BANI_TRIBE_REF || !process.env.BANI_PUBLIC_KEY || !process.env.BANI_PRIVATE_KEY || !process.env.BANI_ACCESS_TOKEN || !process.env.BANI_BASE_URL){
            throw new Error('BANI API Keys are not defined')
        }

        this.tribeAccountRef = process.env.BANI_TRIBE_REF;
        this.publicKey = process.env.BANI_PUBLIC_KEY;
        this.merchantPrivateKey = process.env.BANI_PRIVATE_KEY;
        this.accessToken = process.env.BANI_ACCESS_TOKEN;
        this.baniBaseUrl = process.env.BANI_BASE_URL;
    }

    /**
     * @name mapAPIResponse
     * @param data 
     * @returns 
     */
    private mapAPIResponse(data: MapBaniResponseDTO): IResult{

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

            if(payload.response && payload.response !== undefined){
                message = payload.response.data && payload.response.data.message ? payload.response.data.message : payload.response.data.error ? payload.response.data.error : '';
            }else{
                message = payload;
            }

            result.error = true;
            result.message = `Error: ${message}`;
            result.data = payload.response.data ? payload.response.data : {};
            result.code = 500;

            console.log('ERROR');
            console.log(result);

        }

        return result;

    }

    /**
     * @name getMoniSignature
     * @returns 
     */
    public async getMoniSignature(): Promise<string> {

        const hmac = crypto.createHmac('sha256', this.merchantPrivateKey);

        //passing the data to be hashed
        const digest_msg = this.tribeAccountRef + this.publicKey;
        const data = hmac.update(digest_msg);

        //Creating the hmac in the required format
        const moni_signature = data.digest('hex');

        return moni_signature;

    }

    /**
     * @name createHeaders
     * @returns 
     */
    private async createHeaders(): Promise<any> {

        let signature = await this.getMoniSignature()

        return {
            'Content-Type': 'application/json',
            'moni-signature': signature,
            Authorization: 'Bearer ' + this.accessToken,
        };
    
    }

    /**
     * @name getPaymentBanks
     * @param {BaniPaymentBanksDTO} data - see BaniPaymentBanksDTO
     * @returns {IResult} - see IResult
     */
    public async getPaymentBanks(data: BaniPaymentBanksDTO): Promise<IResult>{

        const { countryCode } = data;

        let result: IResult = { error: false, message: '', code: 200, data: null }
        
        const config: AxiosRequestConfig = {
            method: 'get',
            url:  `${this.baniBaseUrl}/partner/list_payment_banks/${countryCode}`,
            data: {},
            headers: await this.createHeaders(),
        };

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
     * @name createCustomer
     * @param {CreateBaniCustomerDTO} data - see CreateBaniCustomerDTO
     * @returns {IResult} - see IResult
     */
    public async createCustomer(data: CreateBaniCustomerDTO): Promise<IResult>{

        const { firstName, lastName, phoneNumber, email, address, state, city, note } = data;

        let result: IResult = { error: false, message: '', code: 200, data: null }

        let build: BaniRequestDTO = {
            customer_first_name: firstName,
            customer_last_name: lastName,
            customer_phone: `+${phoneNumber}`,
            customer_email: email,
            customer_address: address,
            customer_state: state,
            customer_city: city,
            customer_note: note ? note : 'Bani<>Vacepay Customer'
        };

        const config: AxiosRequestConfig = {
            method: 'post',
            url: `${this.baniBaseUrl}/comhub/add_my_customer/`,
            data: { ...build },
            headers: await this.createHeaders(), // Assign the headers to the request config
        };

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
     * @name generateAccount
     * @param { GenerateBaniAccountDTO } data - see GenerateBaniAccountDTO
     * @returns {IResult} see IResult
     */
    public async generateAccount(data: GenerateBaniAccountDTO): Promise<IResult>{

        const { step, currency, countryCode, reference, accountType, customerRef, nameOnly, amount, accountName, bvnNumber, bankName } = data;

        let result: IResult = { error: false, message: '', code: 200, data: null }

        let build: BaniRequestDTO = {
            pay_va_step: step,
            country_code: countryCode,
            pay_currency: currency,
            holder_account_type: accountType,
            holder_legal_number: bvnNumber,
            customer_ref: customerRef,
            pay_ext_ref: reference,
            pay_amount: amount,
            customer_name_only: nameOnly,
            alternate_name: nameOnly === false ? accountName : '',
        }

        if(bankName){
            build.bank_name = bankName;
        }

        const config: AxiosRequestConfig = {
            method: 'post',
            url:  `${this.baniBaseUrl}/partner/collection/bank_transfer/`,
            data: { ...build },
            headers: await this.createHeaders(), // Assign the headers to the request config
        };

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
     * @name payoutToBankNGN
     * @param data 
     * @returns 
     */
    public async payoutToBankNGN(data: BankTransferWithBaniDTO): Promise<IResult>{

        const { amount, receiverType, accountName, accountNo, bankCode, currency, reference, narration } = data;
        let result: IResult = { error: false, message: '', code: 200, data: null }

        let build: BaniRequestDTO = {
            payout_step: 'direct',
            receiver_currency: 'NGN',
            receiver_amount: amount.toString(),
            transfer_method: 'bank',
            transfer_receiver_type: receiverType,
            receiver_account_num: accountNo,
            receiver_country_code: 'NG',
            receiver_account_name: accountName,
            receiver_sort_code: bankCode,
            sender_amount: amount.toString(),
            sender_currency: currency,
            transfer_ext_ref: reference,
            transfer_note: `transfer to ${accountNo}`
        }

        const config: AxiosRequestConfig = {
            method: 'post',
            url:  `${this.baniBaseUrl}/partner/payout/initiate_transfer/`,
            data: { ...build },
            headers: await this.createHeaders(), // Assign the headers to the request config
        };

        await console.log('PAYOUT-PAYLOAD')
        await console.log(build)

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
     * @name verifyWebhookSignature
     * @param { VerifyBaniWebookDTO } data - see VerifyBaniWebookDTO
     * @returns {boolean} boolean
     */
    public async verifyWebhookSignature(data: VerifyBaniWebookDTO): Promise<boolean>{

        let result: boolean = false;
        const { baniHook, body } = data;

        const signature = Buffer.from(baniHook, 'utf-8');

        //Calculate HMAC
        const hmac = crypto.createHmac("sha256", this.merchantPrivateKey);
        const digest = Buffer.from(hmac.update(body).digest("hex"), "utf8");

        if(signature.length !== digest.length || !crypto.timingSafeEqual(digest, signature)){
            result = false;
        }else{
            result = true;
        }

        return result;

    }

    /**
     * @name verifyPaymentStatus
     * @param data 
     * @returns 
     */
    public async verifyPaymentStatus(data: BaniVerifyStatusDTO): Promise<IResult>{

        const { reference, providerRef } = data;
        let result: IResult = { error: false, message: '', code: 200, data: null }

        let build: BaniRequestDTO = {}
        if(reference){
            build.pay_ext_ref = reference;
        }else if(providerRef){
            build.pay_ref = providerRef;
        }

        const config: AxiosRequestConfig = {
            method: 'post',
            url:  `${this.baniBaseUrl}/partner/collection/pay_status_check/`,
            data: { ...build },
            headers: await this.createHeaders(), // Assign the headers to the request config
        };

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
     * @name listPayoutBanks
     * @param countryCode 
     * @returns 
     */
    public async listPayoutBanks(countryCode: string = 'NG'): Promise<IResult>{

        let result: IResult = { error: false, message: '', code: 200, data: null }

        let build: BaniRequestDTO = {
            country_code: countryCode
        }

        const config: AxiosRequestConfig = {
            method: 'get',
            url:  `${this.baniBaseUrl}/partner/list_banks/${build.country_code}/`,
            data: {},
            headers: await this.createHeaders(), // Assign the headers to the request config
        };

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
     * 
     * @param countryCode 
     * @returns 
     */
    public async listCollectionBanks(countryCode: string = 'NG'): Promise<IResult>{

        let result: IResult = { error: false, message: '', code: 200, data: null }

        let build: BaniRequestDTO = {
            country_code: countryCode
        }

        const config: AxiosRequestConfig = {
            method: 'get',
            url:  `${this.baniBaseUrl}/partner/list_payment_banks/${build.country_code}/`,
            data: {},
            headers: await this.createHeaders(), // Assign the headers to the request config
        };

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
     * @name listPermanentAccounts
     * @param ref 
     * @returns 
     */
    public async listPermanentAccounts(ref: string): Promise<IResult>{

        let result: IResult = { error: false, message: '', code: 200, data: null }

        let build: BaniRequestDTO = {
            customer_ref: ref
        }

        const config: AxiosRequestConfig = {
            method: 'post',
            url:  `${this.baniBaseUrl}/partner/collection/customer_perm_account_number/`,
            data: { ...build },
            headers: await this.createHeaders(), // Assign the headers to the request config
        };

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
     * @name verifyNubanAccount
     * @param ref 
     * @returns 
     */
    public async verifyNubanAccount(data: VerifyBaniNubanDTO): Promise<IResult>{

        const { listCode, bankCode, accountNo, countryCode } = data;
        let result: IResult = { error: false, message: '', code: 200, data: null }

        let build: BaniRequestDTO = {
            list_code: listCode,
            bank_code: bankCode,
            account_number: accountNo,
            country_code: countryCode
        }

        const config: AxiosRequestConfig = {
            method: 'post',
            url:  `${this.baniBaseUrl}/partner/payout/verify_bank_account/`,
            data: { ...build },
            headers: await this.createHeaders(), // Assign the headers to the request config
        };

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
     * @name buyAirtimme
     * @param ref 
     * @returns 
     */
    public async buyAirtime(data: BuyAirtimeWithBaniDTO): Promise<IResult>{

        const { phoneNumber, amount, network, reference, narration } = data;
        let result: IResult = { error: false, message: '', code: 200, data: null }

        let build: BaniRequestDTO = {
            customer_phone_number: phoneNumber,
            amount,
            network,
            transaction_ext_ref: reference,
            narration
        };

        const config: AxiosRequestConfig = {
            method: 'post',
            url:  `${this.baniBaseUrl}/partner/vas/buy_airtime`,
            data: { ...build },
            headers: await this.createHeaders(), // Assign the headers to the request config
        };

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
     * @name listMobileDataPlans
     * @param countryCode 
     * @returns 
     */
    public async listMobileDataPlans(data: ListBaniMobileDataDTO): Promise<IResult>{

        let result: IResult = { error: false, message: '', code: 200, data: null }

        let build: BaniRequestDTO = {
            country_code: data.countryCode,
            phone_network_name: data.network
        }

        const config: AxiosRequestConfig = {
            method: 'post',
            url:  `${this.baniBaseUrl}/partner/vas/list_mobile_data_plan/`,
            data: { ...build },
            headers: await this.createHeaders(), // Assign the headers to the request config
        };

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
     * @name listBillerCategory
     * @param countryCode 
     * @returns 
     */
     public async listBillerCategory(countryCode: string = 'NG'): Promise<IResult>{

        let result: IResult = { error: false, message: '', code: 200, data: null }

        let build: BaniRequestDTO = {
            country_code: countryCode,
        }

        const config: AxiosRequestConfig = {
            method: 'get',
            url:  `${this.baniBaseUrl}/partner/vas/biller_category/${build.country_code}`,
            data: {},
            headers: await this.createHeaders(), // Assign the headers to the request config
        };

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
     * @name listBillerSubCategory
     * @param countryCode 
     * @returns 
     */
     public async listBillerSubCategory(billerCategoryId: number): Promise<IResult>{

        let result: IResult = { error: false, message: '', code: 200, data: null }

        let build: BaniRequestDTO = {
            biller_category_id: billerCategoryId,
        }

        const config: AxiosRequestConfig = {
            method: 'get',
            url:  `${this.baniBaseUrl}/partner/vas/biller_sub_category/${build.biller_category_id}`,
            data: {},
            headers: await this.createHeaders(), // Assign the headers to the request config
        };

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
     * @name validateBiller
     * @param data 
     * @returns 
     */
    public async validateBiller(data: ValidateBillerWithBaniDTO): Promise<IResult>{

        let result: IResult = { error: false, message: '', code: 200, data: null }

        let build: BaniRequestDTO = {
            biller_item_id: data.itemId,
            biller_currency:'NGN',
            biller_item_amount:data.amount,
            biller_customer_item: data.customerItem,

        }

        const config: AxiosRequestConfig = {
            method: 'post',
            url:  `${this.baniBaseUrl}/partner/vas/validate_biller/`,
            data: {...build},
            headers: await this.createHeaders(), // Assign the headers to the request config
        };

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
     * @name validateBillTransaction
     * @param data 
     * @returns 
     */
    public async validateBillTransaction(data: ValidateBaniBillDTO): Promise<IResult>{

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { reference, vaceRef } = data;

        let build: BaniRequestDTO = {
            transaction_ext_ref: vaceRef,
        }
        if(reference){
            build.transaction_ref = reference
        }

        const config: AxiosRequestConfig = {
            method: 'post',
            url:  `${this.baniBaseUrl}/partner/vas/verify_vas_pay/`,
            data: {...build},
            headers: await this.createHeaders(), // Assign the headers to the request config
        };

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
     * @name findBillerBySubCategory
     * @param null 
     * @returns 
     */
    public async findBillerBySubCategory(subCategoryName: string, countryCode: string = 'NG'): Promise<IResult>{

        let result: IResult = { error: false, message: '', code: 200, data: null }
       
        let build: BaniRequestDTO = {
            biller_sub_category_name: subCategoryName,
            country_code:countryCode
        }
       
        const config: AxiosRequestConfig = {
            method: 'post',
            url:  `${this.baniBaseUrl}/partner/vas/find_by_biller_sub_name/`,
            data: {...build},
            headers: await this.createHeaders(), // Assign the headers to the request config
        };

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
     * @name buyData
     * @param data 
     * @returns 
     */
    public async buyData(data: BuyDataWithBaniDTO): Promise<IResult>{

        const { phoneNumber, amount, reference, narration, dataId } = data;
        let result: IResult = { error: false, message: '', code: 200, data: null }

        let build: BaniRequestDTO = {
            customer_phone_number: phoneNumber,
            amount,
            transaction_ext_ref: reference,
            data_id: dataId,
        };

        const config: AxiosRequestConfig = {
            method: 'post',
            url:  `${this.baniBaseUrl}/partner/vas/buy_mobile_data/`,
            data: { ...build },
            headers: await this.createHeaders(), // Assign the headers to the request config
        };

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
     * @name payBill
     * @param data 
     * @returns 
     */
    public async payBill(data: PayBillsWithBaniDTO): Promise<IResult>{

        const { phoneNumber, amount, customerItem, customerName, billerCode, itemId, reference } = data;
        let result: IResult = { error: false, message: '', code: 200, data: null }

        let build: BaniRequestDTO = {
            biller_customer_item: customerItem,
            biller_item_amount: amount,
            biller_item_id: itemId,
            customer_biller_code: billerCode,
            customer_biller_name: customerName,
            customer_phone_number:phoneNumber,
            transaction_ext_ref: reference
        };

        const config: AxiosRequestConfig = {
            method: 'post',
            url:  `${this.baniBaseUrl}/partner/vas/buy_biller/`,
            data: { ...build },
            headers: await this.createHeaders(), // Assign the headers to the request config
        };

        await Axios(config)
        .then((resp) => {
            result = this.mapAPIResponse({ type: 'success', payload: resp });
        })
        .catch((err) => {
            
            result = this.mapAPIResponse({ type: 'error', payload: err });

        });

        return result;
    }


}

export default new BaniService();