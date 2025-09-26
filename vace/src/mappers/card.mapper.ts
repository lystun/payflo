import { isDefined, isObject, toDecimal } from '@btffamily/vacepay';
import { ICardDoc, IResult} from '../utils/types.util'
import { MappedCardDataDTO } from '../dtos/card.dto';

class CardMapper {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name mapCardData
     * @param data 
     * @returns 
     */
    public async mapCardData(data: ICardDoc): Promise<MappedCardDataDTO> {

        const result: MappedCardDataDTO = {
            brand: data.brand,
            cardBin: data.cardBin,
            cardLast: data.cardLast,
            expiryMonth: data.expiryMonth,
            expiryYear: data.expiryYear,
            cardType: data.cardType,
            country: data.country,
            countryCode: data.countryCode,
            currency: data.currency,
            slug: data.slug,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        }

        return result;

    }

}

export default new CardMapper();