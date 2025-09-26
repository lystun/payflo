import { ObjectId, Model } from 'mongoose'

export type LogType = 'info' | 'warning' | 'error' | 'success' | 'any';
export type EmailDriver = 'sendgrid' | 'aws' | 'mailtrap';
export type VerifyOTPType = 'register' | 'password-reset' | 'change-password' | 'login'
export type AuditType = 'undefined' | 'error' | 'success';

export interface IAuditDoc extends Document{

    user: ObjectId;
    description: string;
    slug: string;
    action: string;
    entity: string;
    controller: string,
    changes: Record<string, any>

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAll(): any

}

export interface ITimezoneDoc extends Document {

	name: string,
	displayName: string,
	label: string,
	countries: Array<string>,
	utcOffset: number | string
	utcOffsetStr: number | string
	dstOffset: string
	aliasOf: any
	slug: string;

	// time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id:ObjectId;
    id:ObjectId;

    // props
    getAll(): ITimezoneDoc

}

export interface INetworkDoc extends Document{

    name: string;
    description: string;
    slug: string;
    label: string;
    logo: string

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAll(): any

}

export interface IUserDoc extends Document{

    userId: ObjectId | any;
    email: string;
    userType: string;
    businessType: string;
    apiKey: IAPIKey;
    keys: Array<IAPIKey>,
    roles: Array<ObjectId | any>
    permissions: Array<IUserPermission>

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getAllUsers(): IUserDoc;
}

export interface IUserPermission {
    entity: string,
    actions: Array<string>
}

export interface ICountryDoc extends Document {
    
    name: string;
    code2: string;
    code3: string;
    capital: string;
    region: string;
    subregion: string;
    currencyCode: string;
    currencyImage: string;
    phoneCode: string;
    flag: string;
    states: Array<object>;
    slug: string;
    base64: string;
    timezones: Array<{
        details: ObjectId | any,
        name: string,
        displayName: string,
        label: string,
        countries: Array<string>,
        utcOffset: number | string
        utcOffsetStr: number | string
        dstOffset: string
        aliasOf: any
        slug: string;
    }>

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // props
    findByName(name: string): ICountryDoc;
    findByCode(code: string): ICountryDoc;
    getCountry(id: any): ICountryDoc;
}

export interface IBankDoc extends Document {
    name: string;
    legalName: string,
    code: string;
    platformCode: string
    isEnabled: boolean;
    country: string;
    currency: string;
    type: string;
    slug: string;
    providers: Array<IBankProvider>

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id:ObjectId;
    id:ObjectId;

    // props
    findByCode(code: string): IBankDoc;
}

export interface IAPIKey {
    secret: string,
    public: string,
    token: string,
    publicToken: string,
    domain: string,
    isActive: boolean,
    updatedAt: string
}

export interface IPagination {
	total: number,
    count: number,
	pagination: {
		next: { page: number, limit: number },
		prev: { page: number, limit: number },
	},
	data: Array<any>
}

export interface IResult {
    error: boolean,
    message: string,
    code?: number,
    data: any
}

export interface ISearchQuery {
    model: Model<any>,
    ref: string | null | undefined,
    value: any | null | undefined,
	data: any,
    query: any,
	queryParam: any,
	populate: Array<any>,
    operator: any;
}

export interface IGeoSearchQuery {
    model: Model<any>,
    ref: string | null | undefined,
    value: any | null | undefined,
    data: any,
    query: {
        address: string,
        location: string,
        minDistance: number,
        maxDistance: number,
        geoData: {
            longitude: number,
            latitude: number
        },
        radius: number
        radiusUnit: string,
        coordinates: Array<any>
    },
	queryParam: any,
	populate: Array<any>,
    operator: string;
}

export interface IBankProvider {
    id: string | null,
    name: string,
    bankCode: string,
    longCode: string | null,
    active: boolean,
    metadata: {
        payWithBank: boolean,
        isDeleted: boolean,
        createdAt: string | null,
        updatedAt: string | null 
    },
    production: {
        name: string,
        code: string,
        list: string,
    }
}
export interface IJobData {
    data: any;
    name?: string,
    delay?: number;
}

