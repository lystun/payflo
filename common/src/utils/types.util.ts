export type SyncAction = 'user.updated' | 'user.deleted' | 'user.created' | 'country.found' | 'user.apikey' | 'action.update' | 'action.create' |
'audit.created' | 'audit.updated' | 'audit.deleted' | 'notification.created' | 'notification.updated' | 'notification.deleted' | 'action.delete' |
'kyc.updated' | 'kyb.updated' ;

export type SyncType = 'type.onboard' | 'type.compliance' | 'type.register' | 'type.login' | 'type.update' | 'typ.delete' | 'type.create' | 'type.audit' | 'type.notification';

export interface IDateToday{
    year: number, 
    month: number, 
    monthName: any, 
    date: number, 
    week: number, 
    day: number, 
    dayName: any, 
    hour: number, 
    min: number, 
    sec: number, 
    milli: number,
    ISO: string;
    dayjs: any,
    dateTime: number 
}

export type DateCompare = 'equal' | 'greaterthan' | 'lessthan' | 'greaterequal' | 'lessequal';

export interface IMonthsSplit {
    start: number,
    end: number,
    dates: Array<number>
}

export interface IDatesSplit {
    label: string,
    start:string,
    end:string,
    dates: Array<string>
}

export interface IStringToBase64 {
    type: 'buffer' | 'direct',
    payload: string
}

export interface IBase64ToString {
    type: 'buffer' | 'direct',
    payload: string
}
export interface IArrayToObject {
    type: string,
    key: any,
    value: any
}