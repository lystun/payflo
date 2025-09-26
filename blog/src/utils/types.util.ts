import { ObjectId, Document, Model } from 'mongoose'

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

export interface ICampaignDoc extends Document{

    title: string;
    headline: string;
    description: string
    slug: string;
    isEnabled: boolean;
    status: string,
    code: string;
    premalink: string;
    sections: Array<ICampaignSection>
    clicks: Array<{
        subscriber: ObjectId | any,
        count: number,
        source: string,
        medium: string,
        clickedAt: string | number
    }>
    seen: Array<{
        subscriber: ObjectId | any,
        count: number,
        source: string,
        medium: string,
        seenAt: string | number
    }>

    user: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getCampaign(): ICampaignDoc;

}

export interface ISubscriberDoc extends Document{

    name: string;
    email: string;
    leftAt: string;
    slug: string;
    isEnabled: boolean;
    code: string;
    dp: string;
    clicks: Array<{
        campaign: ObjectId | any,
        count: number,
        source: string,
        medium: string,
        clickedAt: string | number
    }>

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getSubscribers(): ISubscriberDoc;

}

export interface IBracketDoc extends Document{

    name: string;
    description: string;
    code: string;
    slug: string;
    isEnabled: boolean;
    
    posts: Array<ObjectId | any>;
    user: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    getBrackets(id: any): IBracketDoc;

}

export interface ICategoryDoc extends Document{

    name: string;
    description: string;
    code: string;
    slug: string;
    isEnabled: boolean;
    
    posts: Array<ObjectId | any>;
    tags: Array<ObjectId | any>;
    user: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    findByCategoryId(id: any): ICategoryDoc;

}

export interface ICommentDoc extends Document{

    body: string;
    isEnabled: boolean;
    reactions: Array<{ 
        type: string,
        count: number
    }>;

    post: ObjectId | any;
    user: ObjectId | any;
    author: any; 

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    findByCommentId(id: any): ICommentDoc;


}

export interface IPostDoc extends Document{

    title: string;
    body: string;
    headline: string;
    abstract: string;
    wordCount: number;
    slug: string;
    premalink: string;
    previewLink: string;
    isPublished: boolean;
    publishedAt: Date | number | any;
    cover: string;
    thumbnail: string;
    markedHtml: string;
    status: string;
    isEnabled: boolean;
    
    tags: Array<ObjectId | any>;
    category: ObjectId | any;
    bracket: ObjectId | any;
    comments: Array<ObjectId | any>;
    reactions: Array<{ 
        user: ObjectId | any
        type: string,
        count: number
    }>;

    contributors: Array<ObjectId | any>;

    author: ObjectId;
    user: ObjectId;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    findByPostId(id: any): IPostDoc;

}

export interface ITagDoc extends Document{

    name: string;
    description: string;
    slug: string;
    isEnabled: boolean;
    
    posts: Array<ObjectId | any>;
    categories: Array<ObjectId | any>;
    user: ObjectId | any;

    // time stamps
    createdAt: string;
    updatedAt: string;
    _version: number;
    _id: ObjectId;
    id: ObjectId;

    // functions
    findByTagId(id: any): ITagDoc;


}

export interface IUserDoc extends Document{

    userId: ObjectId | any;
    firstName: string;
    lastName: string;
    middleName: string;
    avatar: string;
    email: string;
    phoneNumber: string;
    userType: string;
    businessType: string;
    businessName: string,
    identity: {
        basic: string,
        ID: string,
        face: string,
        address: string,
        bvn: string,
        kyb: string,
        kyc: string
    }
    isActive: Boolean;

    posts: Array<ObjectId | any>;
    comments: Array<ObjectId | any>;
    tags: Array<ObjectId | any>;
    business: ObjectId | any;

    apiKey: IAPIKey
    keys: Array<IAPIKey>
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
    operator: string;
}

export interface IAdvancedResult {
    model: Model<any>,
    populate: Array<any>,
    ref: string | null | undefined,
    value: any | null | undefined,
	data: any,
    query: any,
	queryParam: any,
    paginate: string,
    operator: string;
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

export interface IBank {
    _id: string, 
    name: string,  
    code: string, 
    isEnabled: boolean, 
    country: string, 
    currency: string,
    isDefault: string, 
    type: string
}

export interface ISubaccount {
    businessName: string,
    bankCode: string,
    accountNo: string,
    perCharge: number,
    meta: {
        createdOn: any,
        description: string,
        createdBy: any
    }
}

export interface IGraphData {
    week: string,
    start: string,
    end: string,
    value: number,
    total: number,
    dates: Array<string>
}

export interface IOverviewData {
    posts: {
        total: number,
        pending: number,
        published: number,
        enabled: number,
        disabled: number
    },
    comments: {
        total: number,
        enabled: number,
        disabled: number
    },
    categories: {
        total: number,
        enabled: number,
        disabled: number
    },
    tags: {
        total: number,
        enabled: number,
        disabled: number
    },
    brackets: {
        total: number,
        enabled: number,
        disabled: number
    },
    users: {
        total: number,
        writers: number,
        admins: number,
        teachers: number,
        mentors: number
    },
    subscribers: {
        total: number,
        enabled: number,
        disabled: number
    }
    graph: Array<IGraphData>
}

export interface ICampaignSection {
    label: string,
    caption: string,
    thumbnail: string,
    body: string,
    marked: string,
    url: string,
    footnote: string,
    color: string,
}

export interface IUTMParams{
    source: string,
    content: string,
    medium: string,
    campaign: string
}

export interface IFileUpload {
    name: string,
    data: any,
    size: number,
    parsedSize: number,
    encoding: string,
    path: string,
    mime: string
}

export interface IUploadProgress {
    id: any,
    progress: number,
    consumed: number,
    size: number,
    completed: boolean
}

export interface ICountry {
    name: string;
    code2: string;
    code3: string;
    capital: string;
    region: string;
    subRegion: string;
    currencyCode: string;
    currencyImage: string;
    phoneCode: string;
    flag: string;
    states: Array<object | any>;
    slug: string;
    timezones: Array<object | any>;
}

export interface IJobData {
    data: any;
    name?: string,
    delay?: number;
}
