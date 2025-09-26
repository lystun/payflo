import { AuthorizeChargeDTO, CreateCardDTO, CreateChargeDTO, DecodeChargeNextStepDTO, GetNextStepDTO } from '../dtos/card.dto';
import { CardAuthType, CardSchemeType, CurrencyType, NextStepType, ProviderNameType, TransactionFeatureType, TransactionStatus } from '../utils/enums.util';
import { ICardDoc, IInvoiceDoc, IProductDoc, IProviderDoc, IResult } from '../utils/types.util'
import { testCardPattern, ICardType, CardSchemes } from '../utils/card.util'
import TransactionService from './transaction.service';
import SystemService from './system.service';
import Card from '../models/Card.model';

class CardService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name createCard
     * @param data 
     * @returns 
     */
    public async createCard(data: CreateCardDTO): Promise<ICardDoc> {

        const { cvv, expiryMonth, expiryYear, number, type, business, name, transaction } = data;

        const brand = await this.getCardBrand(number)

        const card = await Card.create({
            cardHolder: name ? name : '',
            cardBin: this.getCardBin(number),
            cardLast: this.getCardLast(number),
            brand: brand.name,
            expiryMonth: expiryMonth,
            expiryYear: expiryYear,
            cardType: brand.brand,
            currency: CurrencyType.NGN,
            countryCode: 'NG',
            country: 'Nigeria',
        });

        if (type === 'transaction' && transaction) {

            const encCardData = await SystemService.encryptData({
                payload: {
                    number: number,
                    cvv: cvv,
                    expiryMonth: expiryMonth,
                    expiryYear: expiryYear,
                    name: card.cardHolder
                },
                separator: '-',
                password: transaction.reference
            });

            card.cardData = encCardData;
            card.transaction = transaction._id;
            await card.save();

            transaction.card = card._id
            await transaction.save();

        }

        if (type === 'business' && business) {

            const encCardData = await SystemService.encryptData({
                payload: {
                    number: number,
                    cvv: cvv,
                    expiryMonth: expiryMonth,
                    expiryYear: expiryYear,
                    name: card.cardHolder
                },
                separator: '-',
                password: business.email
            });

            card.cardData = encCardData;
            card.business = business._id;
            await card.save()

            business.cards.push(card._id)
            await business.save()
        }

        return card;

    }

    /**
     * @name getCardBin
     * @param number 
     * @returns 
     */
    public getCardBin(number: string): string {

        let result = number.substring(0, 6);
        return result;

    }

    /**
     * @name getCardLast
     * @param number 
     * @returns 
     */
    public getCardLast(number: string): string {

        let sliced = number.slice(-4)
        return sliced;

    }

    /**
     * @name getCardBrand
     * @param number 
     * @returns 
     */
    public async getCardBrand(number: string): Promise<ICardType> {
        const cardType = testCardPattern(number);
        return cardType;
    }

    /**
     * @name getChargeNextStep
     * @param data 
     * @returns 
     */
    public async getChargeNextStep(data: GetNextStepDTO): Promise<DecodeChargeNextStepDTO> {

        let result: DecodeChargeNextStepDTO = { nextStep: '', reference: '', statusCode: 206 }
        const { reference, type, message, url } = data;

        if (type === NextStepType.SEND_PIN) {

            result = {
                nextStep: 'card PIN is required',
                displayText: message ? message.toLowerCase() : 'enter card pin',
                status: TransactionStatus.PENDING,
                reference: reference,
                type: CardAuthType.PIN,
                path: NextStepType.SEND_PIN,
                url: '',
                statusCode: 206,
                metadata: {
                    reference,
                    type,
                    message
                }
            }

        }

        else if (type === NextStepType.SEND_OTP) {

            result = {
                nextStep: 'OTP is required',
                displayText: message ? message.toLowerCase() : 'enter the otp sent to your phone number and/or email',
                status: TransactionStatus.PENDING,
                reference: reference,
                type: CardAuthType.OTP,
                path: NextStepType.SEND_OTP,
                url: '',
                statusCode: 206,
                metadata: {
                    reference,
                    type,
                    message
                }
            }

        }

        else if (type === NextStepType.SEND_PHONE) {

            result = {
                nextStep: 'phone number is required',
                displayText: message ? message.toLowerCase() : 'enter your phone number',
                status: TransactionStatus.PENDING,
                reference: reference,
                type: CardAuthType.PHONE,
                path: NextStepType.SEND_PHONE,
                url: '',
                statusCode: 206,
                metadata: {
                    reference,
                    type,
                    message
                }
            }

        }

        else if (type === NextStepType.SEND_BIRTHDAY) {

            result = {
                nextStep: 'birthday is required',
                displayText: message ? message.toLowerCase() : 'enter birthday in format YYYY-MM-DD',
                status: TransactionStatus.PENDING,
                reference: reference,
                type: CardAuthType.BIRTHDAY,
                path: NextStepType.SEND_BIRTHDAY,
                url: '',
                statusCode: 206,
                metadata: {
                    reference,
                    type,
                    message
                }
            }

        }

        else if (type === NextStepType.OPEN_URL) {

            result = {
                nextStep: 'redirect customer to the url provided',
                displayText: message ? message.toLowerCase() : 'redirect customer to the url provided',
                status: TransactionStatus.PENDING,
                reference: reference,
                type: CardAuthType.URL,
                path: NextStepType.OPEN_URL,
                url: url,
                statusCode: 206,
                metadata: {
                    reference,
                    type,
                    message
                }
            }

        }

        else if (type === NextStepType.SEND_ADDRESS) {

            result = {
                nextStep: 'address is required',
                displayText: message ? message.toLowerCase() : 'supply your address details',
                status: TransactionStatus.PENDING,
                reference: reference,
                type: CardAuthType.ADDRESS,
                path: NextStepType.SEND_ADDRESS,
                url: '',
                statusCode: 206,
                metadata: {
                    reference,
                    type,
                    message
                }
            }

        }

        else if (type === NextStepType.SUCCESS) {

            result = {
                nextStep: 'transaction successful',
                displayText: message ? message.toLowerCase() : 'transaction successful',
                status: TransactionStatus.SUCCESSFUL,
                reference: reference,
                type: "success",
                path: NextStepType.SUCCESS,
                url: '',
                statusCode: 206,
                metadata: {
                    reference,
                    type,
                    message
                }
            }

        }

        else if (type === NextStepType.FAILED) {

            result = {
                nextStep: 'transaction failed',
                displayText: message ? message.toLowerCase() : 'transaction failed',
                status: TransactionStatus.FAILED,
                reference: reference,
                type: "failed",
                path: NextStepType.FAILED,
                url: '',
                statusCode: 206,
                metadata: {
                    reference,
                    type,
                    message
                }
            }

        }

        return result;

    }

    /**
     * @name createCharge
     * @param data 
     * @returns 
     */
    public async createCharge(data: CreateChargeDTO): Promise<IResult> {

        let result: IResult = { error: true, code: 200, data: null, message: '' }

        const {
            business, callbackUrl, customer, payment, currency, ipAddress,
            provider, wallet, amount, card, quantity,
        } = data;

        

        return result;

    }

    /**
     * @name authorizeCharge
     * @param data 
     * @returns 
     */
    public async authorizeCharge(data: AuthorizeChargeDTO): Promise<IResult> {

        let result: IResult = { error: true, code: 200, data: null, message: '' }

        const {
            ipAddress, authorize, validateType, transaction
        } = data;

        const provider: IProviderDoc = transaction.provider;

        

        return result;

    }

}

export default new CardService();