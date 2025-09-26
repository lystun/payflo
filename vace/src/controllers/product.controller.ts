import crypto from 'crypto';
import mongoose, { ObjectId, Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { asyncHandler, strIncludesEs6, arrayIncludes, isString, isBase64, Random, isZero, isNeg, hasDecimal, isPrecise, notDefined } from '@btffamily/vacepay'
import { generate } from '../utils/random.util';
import { uploadBase64File } from '../utils/google.util'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import User from '../models/User.model'

import nats from '../events/nats';
import { NewAuditDTO } from '../dtos/audit.dto';
import SystemService from '../services/system.service';
import Business from '../models/Business.model';
import { IBusinessDoc, IPaymentLinkDoc, IProductDoc, ISearchQuery, ISettingDoc, ISubaccountDoc, IWalletDoc } from '../utils/types.util';
import { advanced, search } from '../utils/result.util';
import Account from '../models/Account.model';
import { BusinessType, SettingStatusType, UserType } from '../utils/enums.util';
import Product from '../models/Product.model';
import { CreateProductDTO, FilterProductDTO, UpdateProductDTO } from '../dtos/product.dto';
import ProductService from '../services/product.service';
import BusinessService from '../services/business.service';
import StorageService from '../services/storage.service';
import Transaction from '../models/Transaction.model';
import { FilterTransactionDTO } from '../dtos/transaction.dto';
import Invoice from '../models/Invoice.model';
import TransactionService from '../services/transaction.service';
import Subaccount from '../models/Subaccount.model';
import PaymentLinkService from '../services/payment.link.service';

/**
 * @name getProducts
 * @description Get reource from database
 * @route GET /vace/v1/products
 */
export const getProducts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json(res.advancedResults);
});

/**
 * @name getProduct
 * @description Get a reource from database
 * @route GET /vace/v1/products/:id
 */
export const getProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const user = await User.findOne({ _id: req.user._id }).populate([{ path: 'business' }]);

    let product = await Product.findOne({ _id: req.params.id }).populate([
        { path: 'business', select: '_id email officialEmail name, products' }
    ]);

    if (!product) {
        return next(new ErrorResponse('Error', 404, ['product does not exist']))
    }

    if (user && user.userType === UserType.BUSINESS) {

        const business: IBusinessDoc = user.business;

        if (!arrayIncludes(business.products, product._id.toString())) {
            return next(new ErrorResponse('Error', 404, ['product does not belong to business']))
        }

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: product,
        message: 'successful',
        status: 200
    })

})

/**
 * @name getProductTransactions
 * @description Get a reource from database
 * @route GET /vace/v1/products/transactions/:id
 */
export const getProductTransactions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const product = await Product.findOne({ _id: req.params.id });

    if (!product) {
        return next(new ErrorResponse('Error', 404, ['product does not exist']))
    }

    const result = await advanced(Transaction, [], 'status', req, 'product', product._id, null, 'absolute');

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        pagination: result.pagination,
        data: result.data,
        message: 'successful',
        status: 200
    })

})

/**
 * @name searchProducts
 * @description Get a reource from database
 * @route POST /vace/v1/products/search
 * @access Superadmin | Admin
 */
export const searchProducts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { key } = req.body;

    if (!key) {
        return next(new ErrorResponse('Error', 400, [`search key is required`]))
    }

    const pop = [
        { path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
    ]

    const query: ISearchQuery = {
        model: Product,
        ref: null,
        value: null,
        data: [
            { name: { $regex: key, $options: 'i' } },
            { code: { $regex: key, $options: 'i' } },
        ],
        query: null,
        queryParam: req.query,
        populate: pop,
        operator: 'or'
    }

    const result = await search(query); // search from DB

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        data: result.data,
        pagination: result.pagination,
        message: 'successful',
        status: 200
    })

})

/**
 * @name filterProducts
 * @description Get a reource from database
 * @route POST /vace/v1/products/filter
 * @access Superadmin | Admin
 */
export const filterProducts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as FilterProductDTO;

    const filters = ProductService.defineFilterQuery(body);

    const pop = [
        { path: 'business', select: '_id email officialEmail name, products' }
    ]

    const query: ISearchQuery = {
        model: Product,
        ref: null,
        value: null,
        data: filters,
        query: null,
        queryParam: req.query,
        populate: pop,
        operator: 'and'
    }

    const result = await search(query); // search from DB

    res.status(200).json({
        error: false,
        errors: [],
        count: result.count,
        total: result.total,
        data: result.data,
        pagination: result.pagination,
        message: 'successful',
        status: 200
    })

})

/**
 * @name createProduct
 * @description Create a reource in the database
 * @route POST /vace/v1/products/:id
 * @access Superadmin | Admin | Business
 */
export const createProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { name, avatar, code, description, price, isLink } = req.body as CreateProductDTO;

    const validate = await ProductService.validateCreateProduct(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', 400, [`${validate.message}`]))
    }

    const business = await Business.findOne({ _id: req.params.id }).populate([{ path: 'user' }, { path: 'settings' }])

    if (!business) {
        return next(new ErrorResponse('Error', 404, ['business does not exist']))
    }

    if (!BusinessService.isCompliant(business.user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    const settings: ISettingDoc = business.settings;

    if(settings.product === SettingStatusType.INACTIVE){
        return next(new ErrorResponse('Error', 403, [`product is deactivated on account. contact support`]))
    }

    let generateLink: boolean = !notDefined(isLink, true) ? isLink : false;
    const create = await ProductService.createProduct({
        name,
        description,
        price,
        business,
        code,
        avatar,
        isLink: generateLink
    });

    if (create.error) {
        return next(new ErrorResponse('Error', 403, [`${create.message}`]))
    }

    const product: IProductDoc = create.data;

    res.status(200).json({
        error: false,
        errors: [],
        data: product,
        message: 'successful',
        status: 200
    })

});

/**
 * @name enableProduct
 * @description Update a reource in the database
 * @route PUT /vace/v1/products/enable/:id
 * @access Superadmin | Admin | Business
 */
export const enableProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const user = await User.findOne({ _id: req.user._id }).populate([{ path: 'business' }]);

    const product = await Product.findOne({ _id: req.params.id })

    if (!product) {
        return next(new ErrorResponse('Error', 404, ['product does not exist']))
    }

    if (user && user.userType === UserType.BUSINESS) {

        const business: IBusinessDoc = user.business;

        if (!arrayIncludes(business.products, product._id.toString())) {
            return next(new ErrorResponse('Error', 403, ['product does not belong to business']))
        }

    }

    if (product.isEnabled === false) {
        product.isEnabled = true;
        await product.save();
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            name: product.name,
            code: product.code,
            isEnabled: product.isEnabled
        },
        message: 'successful',
        status: 200
    })

});

/**
 * @name disableProduct
 * @description Update a reource in the database
 * @route PUT /vace/v1/products/disable/:id
 * @access Superadmin | Admin | Business
 */
export const disableProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const user = await User.findOne({ _id: req.user._id }).populate([{ path: 'business' }]);

    const product = await Product.findOne({ _id: req.params.id })

    if (!product) {
        return next(new ErrorResponse('Error', 404, ['product does not exist']))
    }

    if (user && user.userType === UserType.BUSINESS) {

        const business: IBusinessDoc = user.business;

        if (!arrayIncludes(business.products, product._id.toString())) {
            return next(new ErrorResponse('Error', 403, ['product does not belong to business']))
        }

    }

    if (product.isEnabled === true) {
        product.isEnabled = false;
        await product.save();
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: {
            name: product.name,
            code: product.code,
            isEnabled: product.isEnabled
        },
        message: 'successful',
        status: 200
    })

});


/**
 * @name updateProduct
 * @description Update a reource in the database
 * @route PUT /vace/v1/products/:id
 * @access Superadmin | Admin | Business
 */
export const updateProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { name, avatar, description, price } = req.body as UpdateProductDTO;

    let product = await Product.findOne({ _id: req.params.id }).populate([
        {
            path: 'business', populate: [
                { path: 'user' }
            ]
        },
        { path: 'payments' }
    ])

    if (!product) {
        return next(new ErrorResponse('Error', 404, ['product does not exist']))
    }

    const business: IBusinessDoc = product.business

    if (!BusinessService.isCompliant(business.user)) {
        return next(new ErrorResponse('Error', 403, [`business compliance is pending approval`]))
    }

    if (name) {

        const nameExists = await Product.findOne({ name: name, business: business._id });

        if (nameExists) {
            return next(new ErrorResponse('Error', 404, ['product name already exists']))
        }

    }

    if(price){

        if(isZero(price) || isNeg(price)){
            return next(new ErrorResponse('Error', 400, ['price cannot be zero or negative']))
        }

        if(hasDecimal(price) && !isPrecise({ value: price, length: 2 })){
            return next(new ErrorResponse('Error', 400, ['price decimal places cannot be more than 2']))
        }

    }

    product.name = name ? name : product.name;
    product.description = description ? description : product.description;
    product.price = price ? price : product.price;
    await product.save();

    if(price && product.payments[0]){
        const payment: IPaymentLinkDoc = product.payments[0];
        await PaymentLinkService.attachProduct(payment, product);
    }

    if (avatar && isBase64(avatar)) {

        const filename = `product-${product.code.toLowerCase()}-${Random.randomNum(8)}`;
        const upload = await StorageService.uploadGcpFile(avatar, filename, 'base64');

        if (upload.error) {
            //TODO: Logo Audit here
        }

        if (!upload.error && upload.data) {
            product.avatar = upload.data.publicUrl;
            await product.save();
        }

    }

    res.status(200).json({
        error: false,
        errors: [],
        data: product,
        message: 'successful',
        status: 200
    })

});


