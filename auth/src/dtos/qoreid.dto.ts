export interface QoreValidateWebhookDTO {
    signature: any,
    payload: any
}

export interface QoreWebhookDataDTO {
    id: string,
    customerReference: string,
    metadata: {
        isLive: boolean,
        imageUrl: string,
        externalDatabaseRefID: string,
        message: string
    },
    applicant: {
        firstname: string,
        lastname: string,
        phone: string,
        phoneCountryCode: string,
    },
    summary: {
        liveness_check: {
            isLive: boolean,
            externalDatabaseRefID: string,
            scanResultBlob: string,
            message: string
        }
    },
    status: {
        state: string,
        status: string
    },
    liveness: {
        isLive: boolean,
        externalDatabaseRefID: string,
        scanResultBlob: string,
        message: string
    }
}