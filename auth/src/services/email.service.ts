import { SendEmailDTO, SendgridEmailDataDTO, ZeptoEmailDataDTO } from "../dtos/email.dto";
import { renderFile } from 'ejs'
import appRootUrl from 'app-root-path'
import transporter from '../utils/sendgrid.util';
import loggerUtil from '../utils/logger.util';
import { VerifyOTPType } from "../utils/types.util";
import APIUrl from "../utils/apiurl.util";
import { VerificationType } from "../utils/enums.util";
import { isArray } from "@btffamily/vacepay";
import zepto from '../utils/zepto.util'

class EmailService {

    constructor() { }

    public async sendEmailWithSendgrid(data: SendgridEmailDataDTO): Promise<void> {

        const options = {
            auth: {
                apiKey: process.env.SENDGRID_API_KEY || '',
            }
        }

        const appUrlSource = `${appRootUrl.path}/src`;

        renderFile(
            `${appUrlSource}/views/emails/ejs/${data.template}.ejs`,
            {
                preheaderText: data.preheaderText,
                emailTitle: data.emailTitle,
                emailSalute: data.emailSalute,
                bodyOne: data.bodyOne,
                bodyTwo: data.bodyTwo,
                bodyThree: data.bodyThree,
                loginEmail: data.loginEmail,
                loginPassword: data.loginPassword,
                buttonUrl: data.buttonUrl,
                buttonText: data.buttonText,
                eventTitle: data.eventTitle,
                eventDescription: data.eventDescription,
                startDate: data.startDate,
                endDate: data.endDate,
                email: data.email,
                password: data.password,
                code: data.code
            },

            {},

            async (error, html) => {
                try {

                    const mailData = {
                        to: data.email,
                        from: `${data.fromName ? data.fromName : process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_EMAIL}>`,
                        subject: data.emailTitle,
                        text: 'email',
                        html: html,
                    };

                    //send mail
                    transporter.send(options, mailData, (resp: any) => {
                        // loggerUtil.log(resp);
                    });

                    // eslint-disable-next-line no-catch-shadow
                } catch (error) {
                    console.log(error);
                    return error;
                }
            }
        );

    }

    /**
     * @name sendEmailWithZepto
     * @param data 
     */
    public async sendEmailWithZepto(data: ZeptoEmailDataDTO): Promise<any> {

        let responseCode = '00';
        const appUrlSource = `${appRootUrl.path}/src`;

        renderFile(
            `${appUrlSource}/views/emails/ejs/${data.template}.ejs`,
            {
                preheaderText: data.preheaderText,
                emailTitle: data.emailTitle,
                emailSalute: data.emailSalute,
                bodyOne: data.bodyOne,
                bodyTwo: data.bodyTwo,
                bodyThree: data.bodyThree,
                loginEmail: data.loginEmail,
                loginPassword: data.loginPassword,
                buttonUrl: data.buttonUrl,
                buttonText: data.buttonText,
                eventTitle: data.eventTitle,
                eventDescription: data.eventDescription,
                startDate: data.startDate,
                endDate: data.endDate,
                email: data.email,
                password: data.password,
                code: data.code
            },

            {},

            async (error, html) => {
                try {

                    const mailData: any = {
                        to: [{ email: data.email, name: data.email }],
                        from: process.env.ZEPTO_FROM_EMAIL,
                        fromName: `${data.fromName ? data.fromName : process.env.EMAIL_FROM_NAME}`,
                        subject: data.emailTitle,
                        text: 'email',
                        html: html,
                    };

                    //send mail
                    zepto.sendAPI(mailData, (resp: any) => {

                        if (isArray(resp) && resp.length > 0) {

                            const response = resp[0];
                            if (response && response !== null && response.statusCode) {
                                responseCode = response.statusCode.toString()
                            }

                        }
                        // console.log('ZEPTO', JSON.stringify(resp, null, 2))
                        // loggerUtil.log(resp);
                    });

                    // eslint-disable-next-line no-catch-shadow
                } catch (error) {
                    console.log(error);
                    return error;
                }
            }
        );

    }

    /**
     * @name sendWelcomeEmail
     * @description Send welcome email to a new user
     * @param { SendEmailDTO } config 
     * @returns void
     */
    public async sendWelcomeEmail(config: SendEmailDTO): Promise<void> {
        const text: string = config.options?.buttonText || 'Get Started';
        const url: string = config.options?.buttonUrl || APIUrl.stagingWeb;

        // send using sendgrid if driver is {sendgrid}
        if (config.driver === 'sendgrid') {
            await this.sendEmailWithSendgrid({
                email: config.user.email,
                fromName: 'Vacepay',
                template: 'welcome',
                emailSalute: `Hello Champ!`,
                emailTitle: 'Welcome to Vacepay',
                preheaderText: 'welcome to vacepay',
                bodyOne: `We are thrilled to welcome you to VacePay, your trusted financial partner 
                    in the world of fintech! Thank you for choosing us as your go-to Vacepay for all your 
                    financial needs. We understand that managing your finances and making transactions should be hassle-free and secure, 
                    and we're here to make that happen for you.`,
                buttonText: text,
                buttonUrl: `${url}/login`,
            });
        }

        if (config.driver === 'zepto') {
            await this.sendEmailWithZepto({
                email: config.user.email,
                fromName: 'Vacepay',
                template: 'welcome',
                emailSalute: `Hello Champ!`,
                emailTitle: 'Welcome to Vacepay',
                preheaderText: 'welcome to vacepay',
                bodyOne: `We are thrilled to welcome you to VacePay, your trusted financial partner 
                    in the world of fintech! Thank you for choosing us as your go-to Vacepay for all your 
                    financial needs. We understand that managing your finances and making transactions should be hassle-free and secure, 
                    and we're here to make that happen for you.`,
                buttonText: text,
                buttonUrl: `${url}/login`,
            });
        }
    }

    /**
     * @name sendKYCUpdateEmail
     * @description Send KYC update email to user
     * @param {SendEmailDTO} config
     * @returns void
     */
    public async sendKYCUpdateEmail(config: SendEmailDTO): Promise<void> {

        const { options } = config;
        let body: string = '';

        const text: string = options?.buttonText || 'Get Started';
        const url: string = options?.buttonUrl || APIUrl.stagingWeb;
        const subject: string = options?.subject || 'Your KYC Update';

        if (options && options.status) {
            body = this.switchKYCBody(options.status)
        } else {
            body = options && options.emailBody ? options.emailBody : '';
        }

        // send using sendgrid if driver is {sendgrid}
        if (config.driver === 'sendgrid') {
            await this.sendEmailWithSendgrid({
                email: config.user.email,
                fromName: 'Vacepay',
                template: 'kyc',
                emailSalute: `Hello Champ!`,
                emailTitle: subject,
                preheaderText: subject.toLowerCase(),
                bodyOne: body,
                buttonText: text,
                buttonUrl: `${url}`,
            });
        }

        if (config.driver === 'zepto') {
            await this.sendEmailWithZepto({
                email: config.user.email,
                fromName: 'Vacepay',
                template: 'kyc',
                emailSalute: `Hello Champ!`,
                emailTitle: subject,
                preheaderText: subject.toLowerCase(),
                bodyOne: body,
                buttonText: text,
                buttonUrl: `${url}`,
            });
        }
    }

    /**
     * @name sendKYBUpdateEmail
     * @description Send KYB update email to user
     * @param {SendEmailDTO} config
     * @returns void
     */
    public async sendKYBUpdateEmail(config: SendEmailDTO): Promise<void> {

        const { options } = config;
        let body: string = '';

        const text: string = options?.buttonText || 'Get Started';
        const url: string = options?.buttonUrl || APIUrl.stagingWeb;
        const subject: string = options?.subject || 'Your KYB Update';

        if (options && options.status) {
            body = this.switchKYBBody(options.status)
        } else {
            body = options && options.emailBody ? options.emailBody : '';
        }

        // send using sendgrid if driver is {sendgrid}
        if (config.driver === 'sendgrid') {
            await this.sendEmailWithSendgrid({
                email: config.user.email,
                fromName: 'Vacepay',
                template: 'kyb',
                emailSalute: `Hello ${config.user.businessName}!`,
                emailTitle: subject,
                preheaderText: subject.toLowerCase(),
                bodyOne: body,
                buttonText: text,
                buttonUrl: `${url}`,
            });
        }

        if (config.driver === 'zepto') {
            await this.sendEmailWithZepto({
                email: config.user.email,
                fromName: 'Vacepay',
                template: 'kyb',
                emailSalute: `Hello ${config.user.businessName}!`,
                emailTitle: subject,
                preheaderText: subject.toLowerCase(),
                bodyOne: body,
                buttonText: text,
                buttonUrl: `${url}`,
            });
        }
    }

    /**
     * @name switchKYCBody
     * @description Switch {type} to determine KYC update email body
     * @param type
     * @returns {string} string
     */
    public switchKYCBody(type: string): string {
        let result = '';

        if (type === VerificationType.APPROVED) {
            result = 'Your KYC details has been updated and approved.';
        }

        if (type === VerificationType.PENDING) {
            result = 'Your KYC details has been updated and it is now pending.';
        }

        if (type === VerificationType.DECLINED) {
            result = 'Your KYC details has been updated to be declined.';
        }

        return result;
    }

    /**
     * @name switchKYBBody
     * @description Switch {type} to determine KYB update email body
     * @param type
     * @returns {string} string
     */
    public switchKYBBody(type: string): string {
        let result = '';

        if (type === VerificationType.APPROVED) {
            result = 'Your business compliance details has been updated and approved.';
        }

        if (type === VerificationType.PENDING) {
            result =
                'Your business compliance details has been updated and it is now pending.';
        }

        if (type === VerificationType.DECLINED) {
            result =
                'Your business compliance details has been updated to be declined.';
        }

        return result;
    }

    /**
     * @name sendAccountEmail
     * @description Send welcome email to a new user
     * @param { SendEmailDTO } config 
     * @returns void
     */
    public async sendAccountEmail(config: SendEmailDTO): Promise<void> {

        let text: string = config.options?.buttonText || 'Login';
        let url: string = config.options?.buttonUrl || '';

        // send using sendgrid if driver is {sendgrid}
        if (config.driver === 'sendgrid') {

            await this.sendEmailWithSendgrid({
                email: config.user.email,
                fromName: process.env.EMAIL_FROM_NAME || 'Vacepay',
                template: 'welcome',
                emailSalute: `Hello Champ!`,
                emailTitle: 'Welcome to Vacepay',
                preheaderText: 'welcome to Vacepay',
                bodyOne: `
                    A Vacepay account has been created for you.
                    Please, use the login details below to access your dashboard, track your orders and more.
                `,
                bodyTwo: `Email: ${config.user.email} and Password: ${config.user.savedPassword}`,
                buttonText: text,
                buttonUrl: `${url}`
            });

        }

        if (config.driver === 'zepto') {

            await this.sendEmailWithZepto({
                email: config.user.email,
                fromName: process.env.EMAIL_FROM_NAME || 'Vacepay',
                template: 'welcome',
                emailSalute: `Hello Champ!`,
                emailTitle: 'Welcome to Vacepay',
                preheaderText: 'welcome to Vacepay',
                bodyOne: `
                    A Vacepay account has been created for you.
                    Please, use the login details below to access your dashboard, track your orders and more.
                `,
                bodyTwo: `Email: ${config.user.email} and Password: ${config.user.savedPassword}`,
                buttonText: text,
                buttonUrl: `${url}`
            });

        }

    }

    /**
     * @name sendResetLinkEmail
     * @description Send welcome email to a new user
     * @param { SendEmailDTO } config 
     * @returns void
     */
    public async sendResetLinkEmail(config: SendEmailDTO): Promise<void> {

        let text: string = config.options?.buttonText || 'Change Password';
        let url: string = config.options?.buttonUrl || '';

        // send using sendgrid if driver is {sendgrid}
        if (config.driver === 'sendgrid') {

            await this.sendEmailWithSendgrid({
                email: config.user.email,
                fromName: process.env.EMAIL_FROM_NAME || 'Vacepay',
                template: 'general',
                emailSalute: `Hello Champ!`,
                emailTitle: 'Change your password',
                preheaderText: 'change password',
                bodyOne: `You ( or someone ) just requested to change your password. If this is not you, ignore this email or contact support@vacepay.com.`,
                bodyTwo: `Click the button below and change your password.`,
                buttonText: text,
                buttonUrl: `${url}`
            });

        }

        if (config.driver === 'zepto') {

            await this.sendEmailWithZepto({
                email: config.user.email,
                fromName: process.env.EMAIL_FROM_NAME || 'Vacepay',
                template: 'general',
                emailSalute: `Hello Champ!`,
                emailTitle: 'Change your password',
                preheaderText: 'change password',
                bodyOne: `You ( or someone ) just requested to change your password. If this is not you, ignore this email or contact support@vacepay.com.`,
                bodyTwo: `Click the button below and change your password.`,
                buttonText: text,
                buttonUrl: `${url}`
            });

        }

    }

    /**
     * @name sendActivationEmail
     * @description Send activation email
     * @param { SendEmailDTO } config 
     * @returns void
     */
    public async sendActivationEmail(config: SendEmailDTO): Promise<void> {

        let text: string = config.options?.buttonText || 'Activate Account';
        let url: string = config.options?.buttonUrl || '';

        // send using sendgrid if driver is {sendgrid}
        if (config.driver === 'sendgrid') {

            await this.sendEmailWithSendgrid({
                email: config.user.email,
                fromName: process.env.EMAIL_FROM_NAME || 'Vacepay',
                template: 'general',
                emailSalute: `Hello Champ!`,
                emailTitle: 'Activate your account',
                preheaderText: 'activate your account',
                bodyOne: `Activate your Vacepay account. Click the button below to activate your account`,
                buttonText: text,
                buttonUrl: `${url}`
            });

        }

        if (config.driver === 'zepto') {

            await this.sendEmailWithZepto({
                email: config.user.email,
                fromName: process.env.EMAIL_FROM_NAME || 'Vacepay',
                template: 'general',
                emailSalute: `Hello Champ!`,
                emailTitle: 'Activate your account',
                preheaderText: 'activate your account',
                bodyOne: `Activate your Vacepay account. Click the button below to activate your account`,
                buttonText: text,
                buttonUrl: `${url}`
            });

        }

    }

    /**
     * @name sendOTPEmail
     * @description Send OTP email to a user
     * @param { SendEmailDTO } config 
     * @returns void
     */
    public async sendOTPEmail(config: SendEmailDTO): Promise<void> {

        let buttonText: string = config.options?.buttonText || 'Verify';
        let url: string = config.options?.buttonUrl || '';

        let title: string = config.options && config.options.subject ? config.options.subject : config.options && config.options.otpType ? this.switchOTPTitle(config?.options.otpType) : 'Verify Account';


        // send using sendgrid if driver is {sendgrid}
        if (config.driver === 'sendgrid') {

            await this.sendEmailWithSendgrid({
                email: config.user.email,
                code: config.code,
                fromName: process.env.EMAIL_FROM_NAME || 'Vacepay',
                template: 'verify',
                emailSalute: `Hello Champ!`,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: `We got a request on your account and it is security sensitive. Use the One-Time Password (OTP) code below to verify your identity and confirm your identity.`,
                buttonText: buttonText,
                buttonUrl: `${url}`
            });

        }

        if (config.driver === 'zepto') {

            await this.sendEmailWithZepto({
                email: config.user.email,
                code: config.code,
                fromName: process.env.EMAIL_FROM_NAME || 'Vacepay',
                template: 'verify',
                emailSalute: `Hello Champ!`,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: `We got a request on your account and it is security sensitive. Use the One-Time Password (OTP) code below to verify your identity and confirm your identity.`,
                buttonText: buttonText,
                buttonUrl: `${url}`
            });

        }

    }

    /**
     * @name switchOTPTitle
     * @description Switch {type} to determine OTP email title
     * @param {VerifyOTPType} type 
     * @returns {string} string
     */
    private switchOTPTitle(type: VerifyOTPType): string {

        let result: string = 'Verify Account';

        if (type === 'register') {
            result = 'Verify Your Account'
        }

        if (type === 'login') {
            result = 'Verify Your Email'
        }

        if (type === 'change-password') {
            result = 'Password Change Code'
        }

        if (type === 'password-reset') {
            result = 'Password Reset Code'
        }

        if (type === 'verify') {
            result = 'Verify your Vacepay account'
        }

        return result;

    }

    /**
     * @name sendPasswordChangedEmail
     * @description Send password changed email to user
     * @param {SendEmailDTO} config 
     * @returns void
     */
    public async sendPasswordChangedEmail(config: SendEmailDTO): Promise<void> {

        let text: string = config.options?.buttonText || 'Login';
        let url: string = config.options?.buttonUrl || '';

        // send using sendgrid if driver is {sendgrid}
        if (config.driver === 'sendgrid') {

            await this.sendEmailWithSendgrid({
                email: config.user.email,
                fromName: process.env.EMAIL_FROM_NAME || 'Vacepay',
                template: 'password',
                emailSalute: `Hello Champ!`,
                emailTitle: 'Your Password Was Changed',
                preheaderText: 'password changed',
                bodyOne: `Your password was changed successfully.`,
                bodyTwo: `If you did not initiate this action, please contact us at support@vacepay.com to request an account suspension.`,
                buttonText: text,
                buttonUrl: `${url}/login`
            });

        }

        if (config.driver === 'zepto') {

            await this.sendEmailWithZepto({
                email: config.user.email,
                fromName: process.env.EMAIL_FROM_NAME || 'Vacepay',
                template: 'password',
                emailSalute: `Hello Champ!`,
                emailTitle: 'Your Password Was Changed',
                preheaderText: 'password changed',
                bodyOne: `Your password was changed successfully.`,
                bodyTwo: `If you did not initiate this action, please contact us at support@vacepay.com to request an account suspension.`,
                buttonText: text,
                buttonUrl: `${url}/login`
            });

        }

    }

    /**
     * @name sendLoginEmail
     * @description Send login security email to user
     * @param {SendEmailDTO} config 
     * @returns void
     */
    public async sendLoginEmail(config: SendEmailDTO): Promise<void> {

        let text: string = config.options?.buttonText || 'Contact Us';
        let url: string = config.options?.buttonUrl || '';

        // send using sendgrid if driver is {sendgrid}
        if (config.driver === 'sendgrid') {

            await this.sendEmailWithSendgrid({
                email: config.user.email,
                fromName: process.env.EMAIL_FROM_NAME || 'Vacepay',
                template: 'login',
                emailSalute: `Hello Champ!`,
                emailTitle: 'Your account was accessed',
                preheaderText: 'login activity',
                bodyOne: `We noticed your Vacepay acount was accessed recently. There was a login activity on your Vacepay account.`,
                bodyTwo: `If you did not initiate this action, please contact us at support@vacepay.com to request an account suspension.`,
                buttonText: text,
                buttonUrl: `${url}/login`
            });

        }

        if (config.driver === 'zepto') {

            await this.sendEmailWithZepto({
                email: config.user.email,
                fromName: process.env.EMAIL_FROM_NAME || 'Vacepay',
                template: 'login',
                emailSalute: `Hello Champ!`,
                emailTitle: 'Your account was accessed',
                preheaderText: 'login activity',
                bodyOne: `We noticed your Vacepay acount was accessed recently. There was a login activity on your Vacepay account.`,
                bodyTwo: `If you did not initiate this action, please contact us at support@vacepay.com to request an account suspension.`,
                buttonText: text,
                buttonUrl: `${url}/login`
            });

        }

    }

    /**
     * @name sendWelcomeEmail
     * @description Send welcome email to a new user
     * @param { SendEmailDTO } config 
     * @returns void
     */
    public async sendInviteEmail(config: SendEmailDTO): Promise<void> {

        const { driver, user, code, options, template, metadata } = config;

        let buttonText: string = options && options.buttonText || 'View Invite';
        let _template = template ? template : 'invite';
        let salute = options && options.salute ? options.salute : `${user.firstName}`;
        let url = options && options.buttonUrl ? options.buttonUrl : '';
        let bodyOne = options && options.bodyOne ? options.bodyOne : `You have been invited to join the Vacepay Platform.`;
        let title: string = options && options.subject ? options.subject : 'Vacepay Invite';


        // send using sendgrid if driver is {sendgrid}
        if (driver === 'sendgrid') {

            await this.sendEmailWithSendgrid({
                email: user.email,
                password: metadata ? metadata.password : '',
                fromName: process.env.EMAIL_FROM_NAME!,
                template: _template,
                emailSalute: salute,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: bodyOne,
                buttonText: buttonText,
                buttonUrl: url
            });

        }

        if (driver === 'zepto') {

            await this.sendEmailWithSendgrid({
                email: user.email,
                password: metadata ? metadata.password : '',
                fromName: process.env.EMAIL_FROM_NAME!,
                template: _template,
                emailSalute: salute,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: bodyOne,
                buttonText: buttonText,
                buttonUrl: url
            });

        }

    }

}

export default new EmailService();