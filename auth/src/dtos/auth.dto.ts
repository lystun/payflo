export interface RegisterDTO{
    email: string, 
    password: string, 
    phoneNumber: string, 
    phoneCode: string, 
    userType: string,
    businessType?:string,
    businessName?:string, 
    callbackUrl: string;
    activateUrl: string
}

export interface LoginDTO{
    email: string, 
    password: string, 
    method: string,
    code?:string,
    hash?: string,
}

export interface ForgotPasswordDTO{
    email: string,
    type: 'otp' | 'token',
    callbackUrl?: string
}