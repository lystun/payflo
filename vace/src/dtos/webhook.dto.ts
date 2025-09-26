import { IBusinessDoc, ITransactionDoc, WebhookStatus } from "../utils/types.util"

export interface VerifyWebhookDTO {
    webhook: string, 
    header: string,
    apiKey: string
}

export interface SendOutNotificationDTO {
    business: IBusinessDoc,
    transaction: ITransactionDoc,
    type: WebhookStatus
}