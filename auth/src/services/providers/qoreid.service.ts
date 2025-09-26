import { timingSafeEqual, createHmac } from 'crypto'
import { QoreValidateWebhookDTO } from "../../dtos/qoreid.dto";

class QoreidService {

    private webhookSecret: string;

    constructor() {

        if (!process.env.QOREID_WEBHOOK_SECRET) {
            throw new Error('QoreID API Keys are not defined')
        }

        this.webhookSecret = process.env.QOREID_WEBHOOK_SECRET;
        
    }

    /**
     * @name validateWebhook
     * @param data 
     * @returns 
     */
    public async validateWebhook(data: QoreValidateWebhookDTO): Promise<boolean> {

        let result: boolean = false;
        const { payload,signature } = data
        
        let hash = createHmac('sha512', this.webhookSecret).update(JSON.stringify(payload)).digest('hex');
        result = timingSafeEqual(Buffer.from(hash), Buffer.from(signature))

        return result;

    }

}

export default new QoreidService()