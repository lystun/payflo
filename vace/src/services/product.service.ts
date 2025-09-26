import { UIID, arrayIncludes, hasDecimal, isDefined, isNeg, isPrecise, isZero, notDefined } from '@btffamily/vacepay';
import { CreateProductDTO, FilterProductDTO } from '../dtos/product.dto';
import { IPaymentLinkDoc, IProductDoc, IResult, ITransactionDoc, IUserDoc } from '../utils/types.util'
import Product from '../models/Product.model';
import { FeatureType, PrefixType, UserType } from '../utils/enums.util';
import SystemService from './system.service';
import { ObjectId } from 'mongoose';
import PaysatckService from './providers/paystack.service';
import StorageService from './storage.service';
import BankService from './bank.service';
import Subaccount from '../models/Subaccount.model';
import PaymentLinkService from './payment.link.service';
import ProductRespository from '../repositories/product.respository';

interface IOverview {
    total: number, 
    active: number, 
    inactive: number, 
    inflow: {
        total: number,
        today: number
    }, 
    transactions: number
}

class ProductService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name validateCreateProduct
     * @param data 
     * @returns 
     */
    public async validateCreateProduct(data: Partial<CreateProductDTO>): Promise<IResult>{

        let result: IResult = { error: false, message: '', data: null };

        if(!data.name){
            result.error = true;
            result.message = 'product name is required';
        }else if(data.avatar && !SystemService.isBase64(data.avatar)){
            result.error = true;
            result.message = 'product avatar is required to be a base64 string';
        }else if(data.code && data.code.length > 17){
            result.error = true;
            result.message = 'product code cannot be more than 17 characters';
        }else if(!data.price || isZero(data.price) || isNeg(data.price)){
            result.error = true;
            result.message = 'product price is required and cannot be zero or negative';
        }else if(data.price && hasDecimal(data.price) && !isPrecise({ value: data.price!, length: 2})){
            result.error = true;
            result.message = 'price decimal places cannot be more than 2';
        }else{
            result.error = false;
            result.message = '';
        }

        return result;

    }

    /**
     * @name createProduct
     * @param data 
     * @returns 
     */
    public async createProduct(data: CreateProductDTO): Promise<IResult>{

        let result: IResult = { error: false, message: '', data: null };

        const { business, code, name, description, price, avatar, isLink } = data;

        const oldProduct = await Product.findOne({ business: business._id, name: name });
        const oldProductCode = await Product.findOne({ business: business._id, code: `${PrefixType.PRODUCT}${code}` });

        if(oldProduct){
            result.error = true;
            result.message = 'product already exist. choose another name';
        }else if(code && oldProductCode){
            result.error = true;
            result.message = 'product code already exist.';
        }else{

            let productCode = code ? `${PrefixType.PRODUCT}${code}` : `${PrefixType.PRODUCT}${UIID(2)}`;

            let product: any = await Product.create({
                name,
                code: productCode,
                business: business._id,
                description,
                isEnabled: true,
                price: price
            });

            // attach product to business
            business.products.push(product._id);
            await business.save();

            // upload product avatar
            if(avatar){

                const filename = `product-${product.code.toLowerCase()}-avatar`;
                const upload = await StorageService.uploadGcpFile(avatar, filename, 'base64');

                if(upload.error){
                    //TODO: Logo Audit here
                }

                if(!upload.error && upload.data){
                    product.avatar = upload.data.publicUrl;
                    await product.save();
                }

            }

            // create payment link if specified
            if(isLink){

                const create = await PaymentLinkService.createPaymentLink({
                    business,
                    feature: FeatureType.PRODUCT,
                    name: name,
                    type: 'fixed',
                    amount: product.price,
                    description: product.description,
                    productId: product._id,
                    message: 'Thank you for your payment',
                    redirectUrl: '',
                    slug: product.code,
                    splits: []
                });

                if(!create.error){
                    product.payments.push(create.data._id);
                    product.link = create.data.link;
                    await product.save();
                }

            }

            result.data = product;

        }

        return result;

    }

    /**
     * @name detachFromPayment
     * @param productId 
     * @param payment 
     */
    public async detachFromPayment(productId: ObjectId, payment: IPaymentLinkDoc): Promise<void>{

        const product = await Product.findOne({ _id: productId });

        if(product){

            if(arrayIncludes(product.payments, payment._id.toString())){

                const filtered = product.payments.filter((x: any) => x.toString() !== payment._id.toString())
                product.payments = filtered;
                await product.save();

                payment.product = null;
                await payment.save();

            }

        }

    }

    /**
     * @name attachTransaction
     * @param product 
     * @param transaction 
     */
    public async attachTransaction(product: IProductDoc, transaction: ITransactionDoc): Promise<IProductDoc>{

        if(!arrayIncludes(product.transactions, transaction._id.toString())){
            product.transactions.push(transaction._id);
            await product.save();

            transaction.product = product._id;
            await transaction.save();
        }

        return product;

    }

    /**
     * @name updateInflow
     * @param product 
     * @param transaction 
     */
    public async updateInflow(product: IProductDoc, transaction: ITransactionDoc): Promise<IProductDoc>{

        product.inflow.value = product.inflow.value + transaction.amount;
        product.inflow.count += 1;
        await product.save();

        product = await this.attachTransaction(product, transaction);

        return product;

    }

    /**
     * @name updateAnalytics
     * @param product 
     * @returns 
     */
    public async updateAnalytics(product: IProductDoc): Promise<IProductDoc> {

        const analytics = await ProductRespository.aggregateProductInflow(product)

        product.analytics = analytics;
        await product.save();

        return product;

    }

    /**
     * @name defineFilterQuery
     * @param data 
     * @returns 
     */
    public defineFilterQuery(data: FilterProductDTO): Array<any>{

        let result: Array<any> = [];

        if(isDefined(data.isEnabled, true)){
            result.push({ "isEnabled": data.isEnabled })
        }

        if(isDefined(data.business)){
            result.push({ "business": data.business })
        }

        return result;

    }

    /**
     * @name getOverview
     * @param user 
     * @returns 
     */
    public async getOverview(user: IUserDoc): Promise<IOverview>{

        let result: IOverview = {
            active: 0, inactive: 0, total: 0,
            transactions: 0, inflow: { today: 0, total: 0 }
        }

        if(user.userType === UserType.ADMIN || user.userType === UserType.SUPER){

            result.active = await Product.countDocuments({ isEnabled: true })
            result.inactive = await Product.countDocuments({ isEnabled: false })

            // aggregations
            const aggTotal = await ProductRespository.aggregateTotal(user);
            const aggDaily = await ProductRespository.aggregateDailyInflow(user)

            result.total = aggTotal.count;
            result.inflow = {
                total: aggTotal.totalAmount,
                today: aggDaily.totalAmount
            }

        }else if(user.userType === UserType.BUSINESS){

            result.active = await Product.countDocuments({ isEnabled: true, business: user.business })
            result.inactive = await Product.countDocuments({ isEnabled: false, business: user.business })

            // aggregations
            const aggTotal = await ProductRespository.aggregateTotal(user);
            const aggDaily = await ProductRespository.aggregateDailyInflow(user)

            result.total = aggTotal.count;
            result.inflow = {
                total: aggTotal.totalAmount,
                today: aggDaily.totalAmount
            }

        }

        return result;

    }

}

export default new ProductService();