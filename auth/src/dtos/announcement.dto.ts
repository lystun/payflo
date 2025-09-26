import { IAnnouncementDoc, IUserDoc } from "../utils/types.util"

export interface CreateAnnouncementDTO {
    user: IUserDoc,
    title: string,
    url?: string,
    description?: string,
    avatar?: string,
    mail?: {
        subject: string
        message: string
    },
    mobile?: {
        message: string,
        title: string,
        sms: boolean,
        push: boolean
    },
    web?: {
        message: string,
        title: string,
        dashboard: boolean,
        isPublic: boolean
    }
}
export interface UpdateAnnouncementDTO {
    title?: string,
    url?: string,
    description?: string,
    avatar?: string,
    mail?: {
        subject: string
        message: string
    },
    mobile?: {
        message: string,
        title: string,
        sms: boolean,
        push: boolean
    },
    web?: {
        message: string,
        title: string,
        dashboard: boolean,
        isPublic: boolean
    }
}
export interface FilterAnnouncementDTO{
    sms?: boolean,
    push?: boolean,
    dashboard?: boolean,
    public?: boolean
}
export interface ProcessSendAnnouncementDTO{
    announcement: IAnnouncementDoc
}