import { UIID, arrayIncludes, hasDecimal, isDefined, isPos, isPrecise, isZero, notDefined, strIncludes, strIncludesEs6 } from '@btffamily/vacepay';
import { IInvoiceDoc, IPaymentLinkDoc, IProductDoc, IResult, ITransactionDoc, IUserDoc } from '../utils/types.util'
import Product from '../models/Product.model';
import { FeatureType, PaymentLinkType, PrefixType, ProviderPaymentStatus, TransactionStatus, UserType } from '../utils/enums.util';
import SystemService from './system.service';
import { ChargeCardTransactionDTO, ChargeLinkCardDTO, CreatePaymentLinkDTO, CreateTransferTransactionDTO, FilterPaymentLinkDTO, UpdateLinkQRDTO } from '../dtos/payment.link.dto';
import PaymentLink from '../models/PaymentLink.model';
import ProductService from './product.service';
import StorageService from './storage.service';
import PaystackService from './providers/paystack.service';
import TransactionService from './transaction.service';
import { PaystackResponseDTO } from '../dtos/providers/paystack.dto';
import Subaccount from '../models/Subaccount.model';
import { ObjectId } from 'mongoose';
import PaymentLinkRepository from '../repositories/payment.link.repository';
import TransactionRepository from '../repositories/transaction.repository';
import CardService from './card.service';

interface IOverview {
    total: number,
    active: number,
    inactive: number,
    inflow: {
        total: number,
        today: number
    }
}

class PaymentLinkService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name validateCreateLink
     * @param data 
     * @returns 
     */
    public async validateCreateLink(data: CreatePaymentLinkDTO): Promise<IResult> {

        const allowedFeatures = ['invoice', 'product', 'request']
        const allowedTypes = ['fixed', 'dynamic']
        let result: IResult = { error: false, message: '', data: null };

        const { feature, type, name, amount, redirectUrl } = data;

        if (!name) {
            result.error = true;
            result.message = 'name is required';
        } else if (!feature) {
            result.error = true;
            result.message = 'payment link feature is required';
        } else if (!arrayIncludes(allowedFeatures, feature)) {
            result.error = true;
            result.message = `invalid feature value. choose from ${allowedFeatures.join(', ')}`;
        } else if (!type) {
            result.error = true;
            result.message = 'amount type is required';
        } else if (!arrayIncludes(allowedTypes, type)) {
            result.error = true;
            result.message = `invalid type value. choose from ${allowedTypes.join(', ')}`;
        } else if (type === PaymentLinkType.FIXED && notDefined(amount)) {
            result.error = true;
            result.message = 'amount is required';
        } else if (type === PaymentLinkType.FIXED && amount && (isZero(amount) || !isPos(amount))) {
            result.error = true;
            result.message = 'amount is required';
        } else if (type === PaymentLinkType.FIXED && amount && !isPos(amount)) {
            result.error = true;
            result.message = 'amount is required and cannot be negative';
            result.code = 400;
        } else if (type === PaymentLinkType.FIXED && amount && hasDecimal(amount) && !isPrecise({ value: amount, length: 2 })) {
            result.error = true;
            result.message = 'amount is required to have only 2 decimals';
            result.code = 400;
        } else if (type === PaymentLinkType.FIXED && amount && amount < 500) {
            result.error = true;
            result.message = 'minimum expected amount is 500';
            result.code = 400;
        } else if (!type) {
            result.error = true;
            result.message = 'amount type is required';
        } else if (redirectUrl && (!strIncludesEs6(redirectUrl, 'https://') && !strIncludesEs6(redirectUrl, 'http://'))) {
            result.error = true;
            result.message = 'redirect url must include https:// or http://';
        }else {
            result.error = false;
            result.message = '';
        }

        return result;

    }

    /**
     * @name validateCreateTransfer
     * @param data 
     * @returns 
     */
    public async validateCreateTransfer(data: CreateTransferTransactionDTO): Promise<IResult> {

        const allowedFeatures = ['invoice', 'product', 'request']
        const allowedTypes = ['fixed', 'dynamic']
        let result: IResult = { error: false, message: '', data: null };

        const { firstName, lastName, phoneNumber, email } = data;

        if (!firstName) {
            result.error = true;
            result.message = 'first name is required';
        } else if (!lastName) {
            result.error = true;
            result.message = 'last name is required';
        } else if (!email) {
            result.error = true;
            result.message = 'email is required';
        } else if (!phoneNumber) {
            result.error = true;
            result.message = 'phone number is required';
        } else {
            result.error = false;
            result.message = '';
        }

        return result;

    }

    /**
     * @name validateChargeCard
     * @param data 
     * @returns 
     */
    public async validateChargeCard(data: ChargeCardTransactionDTO): Promise<IResult> {

        const allowedTypes = ['card', 'validate']
        const allowedAuth = ['pin', 'otp', 'phone', 'birthday', 'address']
        let result: IResult = { error: false, message: '', code: 200, data: null };

        const { chargeType, validateType, callbackUrl, reference, card, authorize, customer } = data;

        if (!chargeType) {
            result.error = true;
            result.message = 'charge type is required';
        } else if (!arrayIncludes(allowedTypes, chargeType)) {
            result.error = true;
            result.message = `invalid charge type value. choose from ${allowedTypes.join(', ')}`;
        } else if (chargeType === 'card' && notDefined(card)) {
            result.error = true;
            result.message = 'card details is required';
        } else if (chargeType === 'validate' && !validateType) {
            result.error = true;
            result.message = 'authorization type is required';
        } else if (chargeType === 'validate' && validateType && !arrayIncludes(allowedAuth, validateType)) {
            result.error = true;
            result.message = `invalid authorization type value. choose from ${allowedAuth.join(', ')}`;
        } else if (!callbackUrl) {
            result.error = true;
            result.message = 'callback url is required';
        } else if (chargeType === 'validate' && !reference) {
            result.error = true;
            result.message = 'transaction reference is required';
        } else if (chargeType === 'validate' && notDefined(authorize)) {
            result.error = true;
            result.message = `${validateType} is required`;
        } else if (chargeType === 'card' && card) {

            if (!card.cvv) {
                result.error = true;
                result.message = 'card security[cvv] is required';
            } else if (!card.number) {
                result.error = true;
                result.message = 'card number is required';
            } else if (!card.expiryMonth) {
                result.error = true;
                result.message = 'card expiry month is required';
            } else if (!card.expiryYear) {
                result.error = true;
                result.message = 'card expiry year is required';
            } else if (!card.name) {
                result.error = true;
                result.message = 'card holder name is required';
            } else {
                result.error = false;
                result.message = '';
            }

        } else if (chargeType === 'validate' && authorize) {

            if (validateType === 'pin' && !authorize.pin) {
                result.error = true;
                result.message = 'card pin is required';
            } else if (validateType === 'phone' && !authorize.phone) {
                result.error = true;
                result.message = 'phone number is required';
            } else if (validateType === 'otp' && !authorize.otp) {
                result.error = true;
                result.message = 'OTP is required';
            } else if (validateType === 'birthday' && !authorize.birthday) {
                result.error = true;
                result.message = 'birthday date is required';
            } else if (validateType === 'address' && !authorize.address) {
                result.error = true;
                result.message = 'residential address is required';
            } else {
                result.error = false;
                result.message = '';
            }

        } else if (notDefined(customer)) {
            result.error = true;
            result.message = 'customer details is required';
        } else if (customer) {

            if (!customer.firstName) {
                result.error = true;
                result.message = 'first name is required';
            } else if (!customer.lastName) {
                result.error = true;
                result.message = 'last name is required';
            } else if (!customer.email) {
                result.error = true;
                result.message = 'email is required';
            } else if (!customer.phoneNumber) {
                result.error = true;
                result.message = 'phone number is required';
            } else {
                result.error = false;
                result.message = '';
            }

        } else {
            result.error = false;
            result.message = '';
        }

        return result;

    }

    /**
     * @name validateSplits
     * @param data 
     * @returns 
     */
    public async validateSplits(data: Array<string>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null };

        if (data.length > 0) {

            for (let i = 0; i < data.length; i++) {

                let splitCode: string = data[i];
                let subaccount = await Subaccount.findOne({ code: splitCode });

                if (!subaccount) {

                    result.error = true;
                    result.message = `subbacount for code ${splitCode} does not exist`;
                    break;

                }

            }

        } else {
            result.error = true;
            result.message = 'split codes is required';
        }

        return result;

    }

    /**
     * @name createProduct
     * @param data 
     * @returns 
     */
    public async createPaymentLink(data: CreatePaymentLinkDTO): Promise<IResult> {

        let urlExists: boolean = false, reuseLink: boolean = false;
        let result: IResult = { error: false, message: '', data: null };

        const {
            business, slug, feature, type, name, amount, description, reuseable, metadata,
            redirectUrl, message, productId, invoiceId, splits, customer, initialized, initializeRef,
        } = data;

        if (slug) {
            urlExists = await this.urlExists(slug);
        }

        if (urlExists) {
            result.error = true;
            result.message = 'payment link url already exist';
        } else {

            let redirectTo = `${process.env.CHECKOUT_APP_URL}/verify`

            if (initializeRef) {
                reuseLink = false
            } else {
                reuseLink = reuseable === true ? true : false
            }

            const exists = await PaymentLink.findOne({ business: business._id, name: name });

            if (exists) {
                result.error = true;
                result.message = 'payment link already exist. choose another name';
            } else {

                let urlLabel = slug ? slug.toLowerCase() : `${UIID(1)}`;

                let payment = await PaymentLink.create({
                    name,
                    slug: urlLabel,
                    business: business._id,
                    isEnabled: false,
                    description,
                    amount: !notDefined(amount) && !isZero(amount) ? amount : 0,
                    feature: feature,
                    type: type,
                    redirectUrl: redirectUrl ? redirectUrl : redirectTo,
                    message: message ? message : '',
                    initialized: initialized ? initialized : false,
                    reuseable: reuseLink,
                    initializeRef: initializeRef,
                    metadata: metadata
                });

                // update product split conditions
                payment = await this.updateLinkUrl(payment, urlLabel);

                // generate qrcode for payment link
                payment = await this.updateLinkQRCode({ payment, newLink: payment.link });

                // update splits if available
                if (splits && splits.length > 0) {
                    payment = await this.updateSplits(payment, splits);
                }

                // attach payment link to business
                business.payments.push(payment._id);
                await business.save();

                // save customer details if available
                if (payment.feature === FeatureType.REQUEST) {

                    if (customer) {
                        payment.customer = {
                            email: customer.email,
                            firstName: customer.firstName,
                            lastName: customer.lastName,
                            phoneCode: customer.phoneCode,
                            phoneNumber: customer.phoneNumber,
                        }
                    }

                    await payment.save()

                }

                // attach product to payment
                if (payment.feature === FeatureType.PRODUCT) {

                    if (!productId) {
                        payment.isEnabled = false;
                    } else {
                        payment.product = productId;
                        payment.isEnabled = true;
                    }

                    await payment.save();

                }

                // attach invoice to payment
                if (payment.feature === FeatureType.INVOICE) {

                    if (!invoiceId) {
                        payment.isEnabled = false;
                    } else {
                        payment.invoice = invoiceId;
                        payment.isEnabled = true;
                    }

                    await payment.save();

                }

                result.data = payment;

            }


        }

        return result;

    }

    /**
     * @name updateSplits
     * @param payment 
     * @param splits 
     * @returns 
     */
    public async updateSplits(payment: IPaymentLinkDoc, splits: Array<string>): Promise<IPaymentLinkDoc> {

        if (splits.length > 0) {

            let splitList: Array<ObjectId> = payment.subaccounts;

            for (let i = 0; i < splits.length; i++) {

                let splitCode = splits[i];
                let subaccount = await Subaccount.findOne({ code: splitCode });

                if (subaccount && !arrayIncludes(payment.subaccounts, subaccount._id.toString())) {
                    splitList.push(subaccount._id);
                }

            }

            payment.subaccounts = splitList;
            await payment.save();

        }

        return payment;

    }

    /**
     * @name attachProduct
     * @param payment 
     * @param product 
     * @returns 
     */
    public async attachProduct(payment: IPaymentLinkDoc, product: IProductDoc): Promise<IPaymentLinkDoc> {

        if (payment.feature === FeatureType.PRODUCT) {

            payment.product = product._id;
            payment.type = 'fixed';
            payment.amount = product.price;
            await payment.save();

            if (!arrayIncludes(product.payments, product._id.toString())) {
                product.payments.push(payment._id);
                await product.save()
            }


        }

        return payment;

    }

    /**
     * @name attachInvoice
     * @param payment 
     * @param invoice 
     * @returns 
     */
    public async attachInvoice(payment: IPaymentLinkDoc, invoice: IInvoiceDoc): Promise<IPaymentLinkDoc> {

        if (payment.feature === FeatureType.INVOICE) {

            payment.invoice = invoice._id;
            payment.type = 'fixed';
            payment.amount = invoice.summary.totalAmount;
            await payment.save();

            invoice.payment = payment._id;
            await invoice.save();

        }

        return payment;

    }

    /**
     * @name attachTransaction
     * @param payment 
     * @param transaction 
     */
    public async attachTransaction(payment: IPaymentLinkDoc, transaction: ITransactionDoc): Promise<IPaymentLinkDoc> {

        if (!arrayIncludes(payment.transactions, transaction._id.toString())) {
            payment.transactions.push(transaction._id);
            await payment.save();
        }

        return payment;

    }

    /**
     * @name updateInflow
     * @param payment 
     * @param transaction 
     * @returns 
     */
    public async updateInflow(payment: IPaymentLinkDoc, transaction: ITransactionDoc): Promise<IPaymentLinkDoc> {

        payment.totalAmount = payment.totalAmount + transaction.amount;
        await payment.save();

        payment = await this.attachTransaction(payment, transaction);

        return payment;

    }

    /**
     * @name updateAnalytics
     * @param payment 
     * @returns 
     */
    public async updateAnalytics(payment: IPaymentLinkDoc): Promise<IPaymentLinkDoc> {

        const today = await PaymentLinkRepository.aggregatePaymentLinkInflow(payment)

        payment.analytics.amount = today.amount ? today.amount : 0;
        payment.analytics.today = today.amount ? today.amount : 0;
        await payment.save();

        return payment;

    }

    /**
     * @name URLExists
     * @param slug 
     * @returns 
     */
    public async urlExists(slug: string): Promise<boolean> {

        let result: boolean = false;

        const payment = await PaymentLink.findOne({ slug: slug.toLowerCase() });

        if (payment) {
            result = true;
        }

        return result;
    }

    /**
     * @name updateLinkUrl
     * @param payment 
     * @param label 
     * @returns 
     */
    public async updateLinkUrl(payment: IPaymentLinkDoc, slug: string): Promise<IPaymentLinkDoc> {

        payment.slug = slug;
        payment.link = `${process.env.CHECKOUT_APP_URL}/link/${slug}`;
        await payment.save();

        return payment;

    }

    /**
     * @name updateLinkQRCode
     * @param data 
     * @returns 
     */
    public async updateLinkQRCode(data: UpdateLinkQRDTO): Promise<IPaymentLinkDoc> {

        let { payment, newLink, oldLink } = data;


        if (oldLink) {

            const split = oldLink.split('/');
            await StorageService.deleteGcpFile(split[(split.length - 1)]);

            payment.qrcode = '';
            await payment.save();

        }

        if (newLink && strIncludesEs6(newLink, 'https://')) {

            const createQR = await SystemService.generateQRCode({ qrData: newLink });

            const filename = `qrcode-${UIID(1)}`;
            const upload = await StorageService.uploadGcpFile(createQR.data, filename, 'base64');

            if (upload && !upload.error) {

                payment.qrcode = upload.data.publicUrl;
                await payment.save();

            }

        }

        return payment;

    }

    /**
     * @name chargeLinkCard
     * @param data 
     * @returns 
     */
    public async chargeLinkCard(data: ChargeLinkCardDTO): Promise<IResult> {

        let response: Partial<PaystackResponseDTO> = {};
        let _chargeStatus: string = '';
        let validateData: any = {}
        let result: IResult = { error: false, message: '', code: 200, data: null };

        const {
            business, provider, wallet, payment, chargeType, validateType,
            callbackUrl, amount, authorize, card, reference, customer, quantity,
        } = data;
        const txnref = TransactionService.generateRef(); // vacepay reference

        if (chargeType === 'card' && card) {

            let cardBin = card.number.substring(0, 6);
            result = await PaystackService.verifyCard({ cardBin: cardBin });

            if (result.error === false) {

                // create transaction
                response = result.data; // response
                const invoice: IInvoiceDoc = payment.invoice;
                const product: IProductDoc = payment.invoice;

                const transaction = await TransactionService.createPaymentLinkTransaction({
                    option: 'card',
                    type: 'credit',
                    business,
                    provider,
                    payment,
                    amount: amount ? amount : 0,
                    customer: {
                        firstName: customer.firstName,
                        lastName: customer.lastName,
                        phoneCode: customer.phoneCode,
                        phoneNumber: customer.phoneNumber
                    },
                    isWebhook: false,
                    reference: txnref,
                    wallet,
                    feature: 'payment-link',
                    card: {
                        cardBin: response.bin!,
                        cardLast: '',
                        brand: response.brand,
                        expiryMonth: '',
                        expiryYear: '',
                        cardType: response.card_type,
                        country: response.country_name,
                        countryCode: response.country_code,
                    },
                    currency: 'NGN',
                    invoice: invoice,
                    product: product,
                    quantity: quantity
                });

                // create card details in database
                const savedCard = await CardService.createCard({
                    type: 'transaction',
                    cvv: card.cvv,
                    expiryMonth: card.expiryMonth,
                    expiryYear: card.expiryYear,
                    number: card.number,
                    name: card.name ? card.name : '',
                    transaction: transaction
                });

                // map the charge data
                const chargeData = {
                    email: customer.email,
                    amount: amount && amount > 0 ? (amount * 100) : 0,
                    currency: 'NGN',
                    reference: txnref,
                    callbackUrl: callbackUrl,
                    authCode: '',
                    metadata: {
                        custom_fields: [
                            {
                                display_name: 'First Name',
                                variable_name: 'firstName',
                                value: customer.firstName
                            },
                            {
                                display_name: 'Last Name',
                                variable_name: 'lastName',
                                value: customer.lastName
                            },
                            {
                                display_name: 'Email',
                                variable_name: 'email',
                                value: customer.email
                            },
                            {
                                display_name: 'Phone Number',
                                variable_name: 'phoneNumber',
                                value: customer.phoneNumber
                            },
                            {
                                display_name: 'Business ID',
                                variable_name: 'businessId',
                                value: business._id
                            }
                        ],
                    },
                    card: {
                        cvv: card.cvv,
                        number: card.number,
                        expiry_month: card.expiryMonth,
                        expiry_year: card.expiryYear
                    }
                }

                // charge card
                result = await PaystackService.createCharge(chargeData);

                // process success api result
                if (result.error === false) {

                    let charge: PaystackResponseDTO = result.data;

                    // get the charge status
                    _chargeStatus = charge.status;

                    // format charge data to get message
                    const formatted = await PaystackService.formatCharge(_chargeStatus, txnref, charge);

                    if (formatted.data.status === ProviderPaymentStatus.SUCCESS) {

                        result = await PaystackService.verifyTransaction({ reference: formatted.data.reference });
                        response = result.data;

                        if (result.error === false) {

                            if (response.status === ProviderPaymentStatus.SUCCESS || (response.gateway_response === 'Successful' || response.gateway_response === 'Approved')) {

                                result.error = result.error === false ? false : true
                                result.message = result.error === true ? result.message : 'successful'
                                result.data = result.data;
                                result.code = result.error === false ? 200 : 500;

                            } else {

                                result.error = true;
                                result.message = result.data.message;
                                result.data = result.data;

                            }

                        } else {

                            result = result;

                        }

                    }
                    else if (formatted.data.status === ProviderPaymentStatus.PENDING || formatted.data.status === ProviderPaymentStatus.FAILED) {

                        result.error = formatted.error;
                        result.message = `${formatted.data.nextStep}`
                        result.data = formatted.data;
                        result.code = formatted.data.statusCode;

                    }

                }

                // update transaction
                if (result.error) {
                    transaction.status = TransactionStatus.FAILED;
                    await transaction.save()
                }

            }

        }

        if (chargeType === 'validate' && authorize && reference) {

            const transaction = await TransactionRepository.findByReference(reference);

            if (transaction) {

                validateData.reference = reference;

                if (validateType === 'pin') {
                    validateData.pin = authorize.pin;
                } else if (validateType === 'otp') {
                    validateData.otp = authorize.otp;
                } else if (validateType === 'phone') {
                    validateData.phone = authorize.phone;
                } else if (validateType === 'birthday') {
                    validateData.birthday = authorize.birthday;
                } else if (validateType === 'address' && authorize.address) {
                    validateData.address = authorize.address.address;
                    validateData.city = authorize.address.city;
                    validateData.state = authorize.address.state;
                    validateData.zipCode = authorize.address.zipCode;
                }

                // call Paystack API
                const submit = await PaystackService.submitPay(validateData, validateType);

                if (submit.error === false) {

                    if (submit.data.status === ProviderPaymentStatus.SUCCESS) {

                        result = await PaystackService.verifyTransaction({ reference: reference });
                        response = result.data;

                        if (result.error === false) {
                            result = result;
                            result.message = 'payment successful';
                        } else {

                            // update transaction
                            transaction.status = TransactionStatus.FAILED;
                            await transaction.save();

                            result.error = true;
                            result.message = result.data.message;
                            result.data = result.data;
                            result.code = 500;

                        }

                    }
                    else {

                        let charge: PaystackResponseDTO = submit.data;

                        // get the charge status
                        _chargeStatus = submit.data.status;

                        // format charge data to get message
                        const formatted = await PaystackService.formatCharge(_chargeStatus, txnref, charge);

                        result.error = formatted.error;
                        result.message = `${formatted.data.nextStep}`
                        result.data = formatted.data;
                        result.code = formatted.data.statusCode;

                    }

                }
                else if (submit.error === true) {

                    // update transaction
                    transaction.status = TransactionStatus.FAILED;
                    await transaction.save();

                    result.error = true;
                    result.message = submit.message;
                    result.data = submit.data;
                    result.code = 500;

                }


            }

            else {
                result.error = true;
                result.message = 'transaction does not exist';
                result.data = {};
                result.code = 500;
            }

        }

        return result;

    }

    /**
     * @name defineFilterQuery
     * @param data 
     * @returns 
     */
    public defineFilterQuery(data: FilterPaymentLinkDTO): Array<any> {

        let result: Array<any> = [];

        if (isDefined(data.isEnabled, true)) {
            result.push({ "isEnabled": data.isEnabled })
        }

        if (isDefined(data.business)) {
            result.push({ "business": data.business })
        }

        if (isDefined(data.feature)) {
            result.push({ "feature": data.feature })
        }

        if (isDefined(data.type)) {
            result.push({ "type": data.type })
        }

        return result;

    }

    /**
     * @name getOverview
     * @param user 
     * @returns 
     */
    public async getOverview(user: IUserDoc): Promise<IOverview> {

        let total: number = 0, active: number = 0, inactive: number = 0,
            inflow: { total: number, today: number } = { total: 0, today: 0 };

        if (user.userType === UserType.ADMIN || user.userType === UserType.SUPER) {

            const aggregateTotal = await PaymentLinkRepository.aggregateTotal(user);
            const aggregateToday = await PaymentLinkRepository.aggregateDailyInflow(user);

            total = aggregateTotal.count;
            active = await PaymentLink.countDocuments({ isEnabled: true })
            inactive = await PaymentLink.countDocuments({ isEnabled: false })
            inflow = {
                total: aggregateTotal.totalAmount,
                today: aggregateToday.totalAmount
            }


        } else if (user.userType === UserType.BUSINESS) {

            const aggregateTotal = await PaymentLinkRepository.aggregateTotal(user);
            const aggregateToday = await PaymentLinkRepository.aggregateDailyInflow(user);

            total = aggregateTotal.count;
            active = await PaymentLink.countDocuments({ isEnabled: true, business: user.business })
            inactive = await PaymentLink.countDocuments({ isEnabled: false, business: user.business })
            inflow = {
                total: aggregateTotal.totalAmount,
                today: aggregateToday.totalAmount
            }
        }

        return {
            total,
            active,
            inactive,
            inflow
        }

    }

}

export default new PaymentLinkService();