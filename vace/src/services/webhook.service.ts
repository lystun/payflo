import { dateToday, isDefined } from '@btffamily/vacepay';
import User from '../models/User.model';
import { BusinessType, DomainType, HeaderType, TransactionFeatureType, UserType, WebhookEventType, WebhookStatusType } from '../utils/enums.util';
import ENV from '../utils/env.util';
import { IResult, ITransactionDoc, IUserDoc, IWebhook, WebhookStatus } from '../utils/types.util'
import crypto from 'crypto'
import { Request } from 'express'
import Axios, { AxiosRequestConfig } from 'axios';
import { SendOutNotificationDTO, VerifyWebhookDTO } from '../dtos/webhook.dto';
import TransactionRepository from '../repositories/transaction.repository';
import CorporateMapper from '../mappers/corporate.mapper';
import UserRepository from '../repositories/user.repository';
import CardMapper from '../mappers/card.mapper';

class WebhookService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name 
     * @param apiKey 
     * @param data 
     * @returns 
     */
    public async createWebhookSignature(apiKey: string, data: any): Promise<string> {

        // Generate signature using crypto hmac sha512 algorithm
        const datastring = JSON.stringify(data);
        const signature = crypto.createHmac('sha512', apiKey).update(datastring).digest('hex');
        return signature;

    }

    /**
     * @name updateWebhokData
     * @param user 
     * @param url 
     * @returns 
     */
    public async updateWebhokData(user: IUserDoc, url: string): Promise<IWebhook> {

        if (url && url !== '') {

            // configure domain,
            let domain: string = ENV.isProduction() ? DomainType.LIVE : DomainType.TEST;

            user.webhook = {
                createdAt: dateToday(Date.now()).ISO,
                domain: domain,
                isActive: true,
                header: HeaderType.WEBHOOK,
                url: url
            }

            await user.save();

        }

        return user.webhook;

    }

    /**
     * @name getWebhookData
     * @param user 
     * @returns 
     */
    public async getWebhookData(user: IUserDoc): Promise<IWebhook | null> {

        let result: IWebhook | null = null;

        const _user = await User.findOne({ _id: user._id })
            .select("+webhook +webhook.url +webhook.header +webhook.domain +webhook.isActive +webhook.createdAt");

        if (!_user) {
            result = null;
        } else {
            result = _user.webhook;
        }

        return result;

    }

    /**
     * @name verifyUserWebhook
     * @param data 
     * @returns 
     */
    public async verifyUserWebhook(data: VerifyWebhookDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { apiKey, header, webhook } = data;

        // define parameters
        const payload = {
            url: webhook
        }
        const signature = await this.createWebhookSignature(apiKey, payload);

        // define headers
        let headers: any = {};
        headers['Content-Type'] = 'application/json';
        headers[header] = signature;

        // define config
        const config: AxiosRequestConfig = {
            method: 'POST',
            url: `${webhook}`,
            headers: headers,
            data: { ...payload },
        };

        await Axios(config)
            .then((resp) => {
                result = resp.data;
            })
            .catch((err) => {
                result.error = true;
                result.message = 'invalid webhook url';
                result.data = err.response ? err.response : '';
                result.code = 500;
            });

        return result;

    }

    /**
     * @name decodeWebhookEventType
     * @param transaction 
     * @param type 
     * @returns 
     */
    public decodeWebhookEventType(transaction: ITransactionDoc, type: WebhookStatus): string {

        let result: string = WebhookStatusType.SUCCESS;
        let feature = transaction.feature;

        if (type === 'success' || type === 'processed') {

            if (feature === TransactionFeatureType.BANK_ACCOUNT || feature === TransactionFeatureType.INTERNAL_CREDIT) {
                result = WebhookEventType.PAYIN_SUCCESS;
            } else if (feature === TransactionFeatureType.PAYMENT_LINK) {
                result = WebhookEventType.PAYIN_LINK_SUCCESS;
            } else if (feature === TransactionFeatureType.API_REFUND || feature === TransactionFeatureType.WALLET_REFUND) {
                result = WebhookEventType.CHARGEBACK_SUCCESS;
            } else if (feature === TransactionFeatureType.WALLET_CHARGEBACK) {
                result = WebhookEventType.PAYOUT_SUCCESS;
            } else if (feature === TransactionFeatureType.WALLET_REVERSAL) {
                result = WebhookEventType.PAYIN_SUCCESS;
            } else if (feature === TransactionFeatureType.INTERNAL_CREDIT) {
                result = WebhookEventType.PAYIN_SUCCESS;
            } else if (feature === TransactionFeatureType.INTERNAL_DEBIT || feature === TransactionFeatureType.INTERNAL_TRANSFER) {
                result = WebhookEventType.PAYOUT_SUCCESS;
            } else if (feature === TransactionFeatureType.WALLET_AIRTIME) {
                result = WebhookEventType.VAS_SUCCESS;
            } else if (feature === TransactionFeatureType.WALLET_BILL) {
                result = WebhookEventType.VAS_SUCCESS;
            } else if (feature === TransactionFeatureType.WALLET_DATA) {
                result = WebhookEventType.VAS_SUCCESS;
            } else if (feature === TransactionFeatureType.WALLET_VAS) {
                result = WebhookEventType.VAS_SUCCESS;
            } else if (feature === TransactionFeatureType.WALLET_TRANSFER || feature === TransactionFeatureType.WALLET_WITHDRAW) {
                result = WebhookEventType.PAYOUT_SUCCESS;
            }

        }

        if (type === 'failed') {

            if (feature === TransactionFeatureType.BANK_ACCOUNT || feature === TransactionFeatureType.INTERNAL_CREDIT) {
                result = WebhookEventType.PAYIN_FAILED;
            } else if (feature === TransactionFeatureType.PAYMENT_LINK) {
                result = WebhookEventType.PAYIN_LINK_FAILED;
            } else if (feature === TransactionFeatureType.API_REFUND || feature === TransactionFeatureType.WALLET_REFUND) {
                result = WebhookEventType.REFUND_FAILED;
            } else if (feature === TransactionFeatureType.WALLET_CHARGEBACK) {
                result = WebhookEventType.CHARGEBACK_FAILED;
            } else if (feature === TransactionFeatureType.WALLET_REVERSAL) {
                result = WebhookEventType.PAYIN_FAILED;
            } else if (feature === TransactionFeatureType.INTERNAL_CREDIT) {
                result = WebhookEventType.PAYIN_FAILED;
            } else if (feature === TransactionFeatureType.INTERNAL_DEBIT || feature === TransactionFeatureType.INTERNAL_TRANSFER) {
                result = WebhookEventType.PAYOUT_FAILED;
            } else if (feature === TransactionFeatureType.WALLET_AIRTIME) {
                result = WebhookEventType.VAS_FAILED;
            } else if (feature === TransactionFeatureType.WALLET_BILL) {
                result = WebhookEventType.VAS_FAILED;
            } else if (feature === TransactionFeatureType.WALLET_DATA) {
                result = WebhookEventType.VAS_FAILED;
            } else if (feature === TransactionFeatureType.WALLET_VAS) {
                result = WebhookEventType.VAS_FAILED;
            } else if (feature === TransactionFeatureType.WALLET_TRANSFER || feature === TransactionFeatureType.WALLET_WITHDRAW) {
                result = WebhookEventType.PAYOUT_FAILED;
            }

        }

        return result;

    }

    /**
     * @name mapWebhookPayload
     * @param transaction 
     * @returns 
     */
    public async mapWebhookPayload(transaction: ITransactionDoc): Promise<any> {

        let mapped: any = {};

        mapped = await CorporateMapper.mapTransactionData(transaction);

        if (transaction.refund && isDefined(transaction.refund._id)) {
            mapped.refund = await CorporateMapper.mapRefundData(transaction.refund);
        }

        if (transaction.refunds && transaction.refunds[0] && isDefined(transaction.refunds[0]._id)) {
            delete mapped.refund;
            mapped.refunds = await CorporateMapper.mapRefundList(transaction.refunds);
        }

        if (transaction.product && isDefined(transaction.product._id)) {
            mapped.product = await CorporateMapper.mapProductData(transaction.product);
            mapped.product.quantity = transaction.productQty;
        }

        if (transaction.invoice && isDefined(transaction.invoice._id)) {
            mapped.invoice = await CorporateMapper.mapInvoiceData(transaction.invoice);
        }

        if (transaction.subaccount && isDefined(transaction.subaccount._id)) {
            mapped.subaccount = await CorporateMapper.mapInvoiceData(transaction.subaccount);
        }

        if (transaction.payment && isDefined(transaction.payment._id)) {
            mapped.paymentLink = await CorporateMapper.mapPaymentLinkData(transaction.payment);
        }

        if (transaction.card && isDefined(transaction.card._id)) {
            mapped.card = await CardMapper.mapCardData(transaction.card);
        }

        return mapped;

    }

    /**
     * @name sendWebhookNotification
     * @param data 
     * @returns 
     */
    public async sendWebhookNotification(data: SendOutNotificationDTO): Promise<void> {

        let headers: any = {}, user: IUserDoc | null = null;
        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { business, transaction, type } = data;

        if (isDefined(business.user._id)) {
            user = await UserRepository.findByIdAndSelectWebhook(business.user._id, true);
        } else {
            user = await UserRepository.findByIdAndSelectWebhook(business.user, true);
        }
        const _transaction = await TransactionRepository.findByReference(transaction.reference, true);

        if (user && _transaction) {

            // get webhook parameters
            const webhook: IWebhook = user.webhook;
            const event = this.decodeWebhookEventType(_transaction, type);

            /**
             * send webhook only if it is registered and active 
             * and the webhook hasnt' been sent before
             */
            if (webhook.url && webhook.isActive && _transaction.webhook.isSent === false) {

                // map the data to be sent
                const mapped = await this.mapWebhookPayload(_transaction);

                // define webhook payload
                const payload = {
                    event: event,
                    data: mapped
                }

                // create signature
                const signature = await this.createWebhookSignature(user.apiKey.secret, payload);

                // define headers
                headers['Content-Type'] = 'application/json';
                headers[HeaderType.WEBHOOK] = signature;

                // define config
                const config: AxiosRequestConfig = {
                    method: 'POST',
                    url: `${webhook.url}`,
                    headers: headers,
                    data: { ...payload },
                };

                // call the webhook endpoin
                await Axios(config)
                    .then(async (resp) => {

                        result.data = resp.data;

                        // update transaction
                        _transaction.webhook.isSent = true;
                        await _transaction.save();

                    })
                    .catch((err) => {
                        result.error = true;
                        result.message = 'invalid webhook url';
                        result.data = err.response.data;
                        result.code = 500;
                    });

            }


        } else {

            result.error = true;
            result.message = 'an error occured. contact support';
            result.data = {};
            result.code = 500;

        }


        await console.log(result)

    }

}

export default new WebhookService();