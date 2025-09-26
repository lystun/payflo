import { capitalize, isArray, isObject, isZero, notDefined, strIncludesEs6 } from '@btffamily/vacepay';
import { FormatVASInputValidation, GetVASInputFields, MapVASResponseDTO, VASInputResponseDTO, ValidateBillerDTO, VasResponseDTO } from '../dtos/vas.dto';
import { IResult } from '../utils/types.util'
import { ProviderNameType } from '../utils/enums.util';
import { BaniResponseDTO } from '../dtos/providers/bani.dto';
import { PSBApiResponseDTO, PSBBillInputResponseDTO, PSBCategoryResponseDTO, PSBDataResponseDTO, PSBSubCategoryResponseDTO } from '../dtos/providers/ninepsb.dto';
import NinepsbService from './providers/ninepsb.service';

class VasService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name validateBillerRequest
     * @param data 
     * @returns 
     */
    public async validateBillerRequest(data: ValidateBillerDTO): Promise<IResult>{

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { itemId, customerId, amount } = data;

        if(!itemId){
            result.error = true;
            result.message = 'biller item id is required';
        }else if(!customerId){
            result.error = true;
            result.message = 'customer id is required';
        }else if(notDefined(amount) || isZero(amount)){
            result.error = true;
            result.message = 'amount is required';
        }else{
            result.error = false;
            result.message = '';
        }

        return result;

    }

    /**
     * @name getBillerLabel
     * @param name 
     * @returns 
     */
    public getBillerLabel(name: string): string{

        let result: string = '';

        if(strIncludesEs6(name.toLowerCase(), 'cable')){
            result = 'cable';
        }else if(strIncludesEs6(name.toLowerCase(), 'electricity') || strIncludesEs6(name.toLowerCase(), 'betting')){
            result = 'utility';
        }else if(strIncludesEs6(name.toLowerCase(), 'epin') || strIncludesEs6(name.toLowerCase(), 'education')){
            result = 'utility';
        }else{
            result = 'neutral'
        }

        return result;

    }

    /**
     * @name formatVASInputValidation
     * @param data 
     * @returns 
     */
    public formatVASInputValidation(data: VASInputResponseDTO): FormatVASInputValidation{

        let result: FormatVASInputValidation = { customer: false, amount: false, hasDetails: false, select: false, items: [] };

        const { fields } = data;

        for(let i = 0; i < fields.length; i++){

            let { fieldName, validation, isSelectData, items } = fields[i];

            if(fieldName === 'customerId' && validation === 'Y'){
                result.customer = true;
            }
    
            if(fieldName === 'amount' && validation === 'Y'){
                result.amount = true;
            }
    
            if(fieldName === 'itemId' && validation === 'Y' && isSelectData === 'Y'){
                result.select = true;
                result.hasDetails = true
            }

            if(fieldName === 'itemId' && items && items.length > 0){
                result.items = items.map((x) => {
                    return {
                        name: x.itemName,
                        itemId: x.itemId,
                        amount: x.amount
                    }
                });
            }

        }

        

        return result;

    }

    /**
     * @name mapVASResponse
     * @param data 
     * @returns 
     */
    public mapVASResponse(data: MapVASResponseDTO): any{

        let mappedData: any = [];

        const { providerName, response, type, billerId, customerId, itemId, amount, categoryId, transaction } = data;

        if(providerName === ProviderNameType.BANI){

            if(type === 'data-plans' && isArray(response)){

                let result: Array<Partial<VasResponseDTO>> = [];

                for(let i = 0; i < response.length; i++){

                    let resp: BaniResponseDTO = response[i];

                    let vasResp: Partial<VasResponseDTO> = {
                        dataBundle: {
                            bundle: resp.data_bundle,
                            amount: resp.data_amount,
                            validity: resp.data_validity,
                            currency: resp.data_currency,
                            network: resp.data_network,
                            dataId: resp.data_id
                        },
                        vasCode: resp.vas_code,
                        countryCode: resp.country_code
                    }

                    result.push(vasResp)

                }

                mappedData = result;

            }

            if(type === 'list-billers' && isArray(response)){

                let result: Array<Partial<VasResponseDTO>> = [];

                for(let i = 0; i < response.length; i++){

                    let resp: BaniResponseDTO = response[i];

                    let vasResp: Partial<VasResponseDTO> = {
                        category: {
                            categoryId: resp.biller_category_id,
                            name: resp.biller_category_name,
                            subCategory: '',
                            mainCategory: ''
                        },
                        label: this.getBillerLabel(resp.biller_category_name),
                        countryCode: resp.country_code
                    }

                    result.push(vasResp)

                }

                mappedData = result;

            }

            if(type === 'sub-categories' && isArray(response)){

                let result: Array<Partial<VasResponseDTO>> = [];

                for(let i = 0; i < response.length; i++){

                    let resp: BaniResponseDTO = response[i];

                    let vasResp: Partial<VasResponseDTO> = {
                        label: this.getBillerLabel(resp.biller_category_name),
                        category: {
                            categoryId: resp.biller_category_id,
                            name: resp.biller_category_name,
                            subCategory: resp.biller_sub_category_name,
                            mainCategory: ''
                        },
                        validation: {
                            customer: resp.customer_validation_required,
                            amount: resp.amount_validation_required,
                            hasBillerDetails: resp.has_biller_item_details,
                            select: false
                        },
                        billerId: resp.biller_item_id.toString(),
                        billerItem: {
                            name: resp.biller_item_details.biller_item_name,
                            itemId: resp.biller_item_details.biller_item_id,
                            amount: resp.biller_item_details.biller_item_amount
                        },
                        countryCode: resp.country_code,
                        currency: resp.biller_currency,
                        itemId: resp.biller_item_id
                    }

                    result.push(vasResp)

                }

                mappedData = result;

            }

            if(type === 'validate-biller' && isObject(response)){

                let resp: BaniResponseDTO = response;

                let result: Partial<VasResponseDTO> = {
                    status: resp.status,
                    currency: resp.biller_currency,
                    countryCode: resp.country_code,
                    billerCode: resp.customer_biller_code,
                    customer: {
                        id: resp.biller_customer_item,
                        name: resp.customer_name,
                        network: '',
                        phoneNumber: ''
                    },
                    billerItem: {
                        itemId: resp.biller_item_id,
                        amount: resp.biller_item_amount,
                        name: ''
                    }
                };

                mappedData = result;
            }

            if(type === 'bill-transaction' && isObject(response)){

                let resp: BaniResponseDTO = response;

                let result: Partial<VasResponseDTO> = {
                    amount: resp.amount.toString(),
                    status: resp.transaction_status,
                    currency: resp.biller_currency,
                    countryCode: resp.country_code,
                    billerCode: resp.customer_biller_code,
                    billerName: resp.customer_biller_name,
                    vasType: resp.vas_type,
                    createdAt: resp.pub_date,
                    reference: resp.transaction_ext_ref,
                    token: transaction?.vasData.hasToken ? transaction?.vasData.token : '',
                    customer: {
                        id: resp.biller_customer_item,
                        name: resp.customer_name,
                        network: resp.customer_phone_network,
                        phoneNumber: resp.customer_phone_number
                    },
                    billerItem: {
                        itemId: resp.biller_item_id,
                        amount: resp.biller_item_amount,
                        name: ''
                    },
                    category: {
                        mainCategory: resp.main_category,
                        subCategory: resp.sub_category,
                        categoryId: 0,
                        name: ''
                    }
                };

                mappedData = result;
            }

        }

        if(providerName === ProviderNameType.NINEPSB){

            if(type === 'data-plans' && isArray(response)){

                let result: Array<Partial<VasResponseDTO>> = [];

                for(let i = 0; i < response.length; i++){

                    let resp: PSBDataResponseDTO = response[i];
                    let network = resp.productId.split('-')[0];

                    let vasResp: Partial<VasResponseDTO> = {
                        dataBundle: {
                            bundle: resp.dataBundle,
                            amount: resp.amount,
                            validity: resp.validity,
                            currency: 'NGN',
                            network: network,
                            dataId: resp.productId
                        },
                        vasCode: resp.productId,
                        countryCode: 'NG'
                    }

                    result.push(vasResp)

                }

                mappedData = result;

            }

            if(type === 'list-billers' && isArray(response)){

                let result: Array<Partial<VasResponseDTO>> = [];

                for(let i = 0; i < response.length; i++){

                    let resp: PSBCategoryResponseDTO = response[i];

                    let vasResp: Partial<VasResponseDTO> = {
                        category: {
                            categoryId: resp.id,
                            name: capitalize(resp.name.toLowerCase(), true),
                            subCategory: '',
                            mainCategory: ''
                        },
                        label: this.getBillerLabel(resp.name),
                        countryCode: 'NG'
                    }

                    result.push(vasResp)

                }

                mappedData = result;

            }

            if(type === 'format-sub-category' && isArray(response)){

                let result: Array<{ billerId: string, name: string, categoryId: string }> = [];

                for(let i = 0; i < response.length; i++){
                    let resp = response[i];
                    result.push({ billerId: resp.id, name: resp.name, categoryId: categoryId! });
                }

                mappedData = result;

            }

            if(type === 'sub-categories' && isArray(response)){

                let result: Array<Partial<VasResponseDTO>> = [];

                for(let i = 0; i < response.length; i++){

                    let resp: VASInputResponseDTO = response[i];
                    let format = this.formatVASInputValidation(resp);

                    let vasResp: Partial<VasResponseDTO> = {
                        label: this.getBillerLabel(resp.category.name),
                        category: {
                            categoryId: resp.category.id,
                            name: resp.category.name,
                            subCategory: '',
                            mainCategory: resp.category.name
                        },
                        validation: {
                            customer: format.customer,
                            amount: format.amount,
                            hasBillerDetails: format.hasDetails,
                            select: format.select
                        },
                        billerItems: format.items,
                        billerId: resp.category.billerId,
                        countryCode: 'NG',
                        currency: 'NGN',
                        itemId: ''
                    }

                    result.push(vasResp)

                }

                mappedData = result;

            }

            if(type === 'validate-biller' && isObject(response)){

                let resp: PSBApiResponseDTO = response;

                let result: Partial<VasResponseDTO> = {
                    status: resp.status,
                    currency: 'NGN',
                    countryCode: 'NG',
                    billerCode: billerId,
                    billerId: billerId,
                    metadata: resp.otherField,
                    customer: {
                        id: customerId!,
                        name: resp.customerName,
                        network: '',
                        phoneNumber: ''
                    },
                    billerItem: {
                        itemId: itemId!,
                        amount: amount!,
                        name: ''
                    }
                };

                mappedData = result;
            }

            if(type === 'bill-transaction' && isObject(response)){

                let resp: PSBApiResponseDTO = response;

                let result: Partial<VasResponseDTO> = {
                    amount: transaction?.amount.toString(),
                    status: resp.transactionStatus,
                    currency: 'NGN',
                    countryCode: 'NG',
                    billerCode: transaction?.vasData.billerCode,
                    billerName: transaction?.vasData.billerName,
                    vasType: transaction?.vasData.type,
                    createdAt: transaction?.createdAt,
                    reference: transaction?.reference,
                    token: transaction?.vasData.hasToken ? transaction?.vasData.token : '',
                    customer: {
                        id: customerId!,
                        name: transaction?.customer.firstName!,
                        network: transaction?.vasData.network!,
                        phoneNumber: transaction?.customer.phoneNumber!
                    },
                    billerItem: {
                        itemId: itemId!,
                        amount: amount!,
                        name: billerId!
                    },
                    category: {
                        mainCategory: billerId!,
                        subCategory: '',
                        categoryId: categoryId!,
                        name: ''
                    }
                };

                mappedData = result;
            }

        }

        return mappedData;

    }

    /**
     * @name getCategoriesFields
     * @param data 
     * @returns 
     */
    public async getCategoriesFields(data: GetVASInputFields): Promise<IResult>{

        const { categories, providerName } = data;

        let responseList: Array<VASInputResponseDTO> = []
        let response: IResult = { error: false, message: '', code: 200, data: [] }

        if(providerName === ProviderNameType.NINEPSB && categories.length > 0){

            for(let i = 0; i < categories.length; i++){

                let category = categories[i];

                response = await NinepsbService.getBillerInputFields({ billerId: category.billerId });

                if(!response.error){

                    let apiResponse: Array<PSBBillInputResponseDTO> = response.data;

                    let assigned = {
                        fields: apiResponse,
                        category: {
                           billerId: category.billerId,
                           name: category.name,
                           id: category.categoryId 
                        }
                    };

                    responseList.push(assigned);

                }else{

                    response.error = true;
                    response.message = `failed to get ${category.name} input validation fields`;
                    break;

                }

            }

            if(response.error === false){
                response.data = responseList;
            } 

        }

        return response;

    }

    /**
     * @name attachPhoneCode
     * @param code 
     * @param phone 
     * @returns 
     */
    public attachPhoneCode(code: string, phone: string): string{

        let result: string = '';
        let codeStr: string = '';


        if(code && phone){

            if(strIncludesEs6(code, '-')){
                codeStr = code.substring(3);
                codeStr = `+${codeStr}`;
            }else if(strIncludesEs6(code, '+')){
                codeStr = code;
            }else{
                codeStr = code;
            }

            result = codeStr + phone.substring(1);

        }

        return result;

    }
    

}

export default new VasService();