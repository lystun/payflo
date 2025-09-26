import { SendEmailDTO, SendgridEmailDataDTO, ZeptoEmailDataDTO } from "../dtos/email.dto";
import { renderFile } from 'ejs'
import appRootUrl from 'app-root-path'
import transporter from '../utils/sendgrid.util';
import { dateToday, isArray, leadingNum } from "@btffamily/vacepay";
import zepto from '../utils/zepto.util'

class EmailService {

    constructor() { };

    /**
     * @name sendEmailWithSendgrid
     * @param data 
     */
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
                loginEmail: data.loginEmail,
                loginPassword: data.loginPassword,
                buttonUrl: data.buttonUrl,
                buttonText: data.buttonText,
                eventTitle: data.eventTitle,
                eventDescription: data.eventDescription,
                startDate: data.startDate,
                endDate: data.endDate,
                transaction: data.transaction,
                code: data.code,
                chargeback: data.chargeback
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
                        attachments: data.attachments
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

    public async sendEmailWithZepto(data: ZeptoEmailDataDTO): Promise<void> {

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
                loginEmail: data.loginEmail,
                loginPassword: data.loginPassword,
                buttonUrl: data.buttonUrl,
                buttonText: data.buttonText,
                eventTitle: data.eventTitle,
                eventDescription: data.eventDescription,
                startDate: data.startDate,
                endDate: data.endDate,
                transaction: data.transaction,
                code: data.code,
                chargeback: data.chargeback
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

    public async sendTransactionExportEmail(config: SendEmailDTO): Promise<void> {

        const { business, driver, options, template, attachments, email } = config;
        let count: number = 0, startDate, endDate;

        let buttonText: string = options && options.buttonText || 'Verify';
        let _template = template ? template : 'export_transaction';
        let salute = options && options.salute ? options.salute : 'Champ';
        let url = options && options.buttonUrl ? options.buttonUrl : '';
        let fromName = process.env.EMAIL_FROM_NAME || 'Vacepay';

        let bodyOne = options && options.bodyOne ? options.bodyOne : `---`;
        let bodyTwo = options && options.bodyTwo ? options.bodyTwo : `---`;
        let bodyThree = options && options.bodyThree ? options.bodyThree : `---`;
        count = options && options.count ? options.count : 0;

        startDate = options && options.startDate ? options.startDate : 'YYYY-MM-DD';
        endDate = options && options.endDate ? options.endDate : 'YYYY-MM-DD';

        let title: string = options && options.subject ? options.subject : 'Transaction Export Successful';

        // send using sendgrid if driver is {sendgrid}
        if (driver === 'sendgrid') {

            await this.sendEmailWithSendgrid({
                email: email ? email : business.email,
                fromName: fromName,
                template: _template,
                emailSalute: salute,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: bodyOne,
                bodyTwo: bodyTwo,
                bodyThree: bodyThree,
                buttonText: buttonText,
                buttonUrl: `${url}`,
                startDate: startDate,
                endDate: endDate,
                count: count,
                attachments: attachments
            });

        }

        if (driver === 'zepto') {

            await this.sendEmailWithZepto({
                email: email ? email : business.email,
                fromName: fromName,
                template: _template,
                emailSalute: salute,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: bodyOne,
                bodyTwo: bodyTwo,
                bodyThree: bodyThree,
                buttonText: buttonText,
                buttonUrl: `${url}`,
                startDate: startDate,
                endDate: endDate,
                count: count,
                attachments: attachments
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

        const { driver, business, code, options, template } = config;

        let buttonText: string = options && options.buttonText || 'Verify';
        let _template = template ? template : 'verify_email';
        let salute = options && options.salute ? options.salute : ', Let\'s verify your account';
        let url = options && options.buttonUrl ? options.buttonUrl : '';
        let fromName = process.env.EMAIL_FROM_NAME || 'Vacepay';

        let bodyOne = options && options.bodyOne ? options.bodyOne : `We have received your request to make a security-sensitive changes to your Zelia account.`;
        let bodyTwo = options && options.bodyTwo ? options.bodyTwo : `To ensure the security of your account, we have generated a one-time password (OTP) for verification.`;
        let bodyThree = options && options.bodyThree ? options.bodyThree : `Note that this OTP expires in 10 minutes.`;

        let title: string = options && options.subject ? options.subject : options && options.otpType ? this.switchOTPTitle(options.otpType) : 'Verify Account';


        // send using sendgrid if driver is {sendgrid}
        if (config.driver === 'sendgrid') {

            await this.sendEmailWithSendgrid({
                email: business.email,
                code: code,
                fromName: fromName,
                template: _template,
                emailSalute: salute,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: bodyOne,
                bodyTwo: bodyTwo,
                bodyThree: bodyThree,
                buttonText: buttonText,
                buttonUrl: `${url}`
            });

        }

        if (config.driver === 'zepto') {

            await this.sendEmailWithZepto({
                email: business.email,
                code: code,
                fromName: fromName,
                template: _template,
                emailSalute: salute,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: bodyOne,
                bodyTwo: bodyTwo,
                bodyThree: bodyThree,
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
    private switchOTPTitle(type: string): string {

        let result: string = 'Verify Account';

        if (type === 'register') {
            result = 'Verify Your Account'
        } else if (type === 'login') {
            result = 'Verify Your Email'
        } else if (type === 'change-password') {
            result = 'Password Change Code'
        } else if (type === 'password-reset') {
            result = 'Password Reset Code'
        } else {
            result = 'Verify your identity'
        }

        return result;

    }

    /**
     * @name sendBankInflowEmail
     * @param config 
     */
    public async sendBankInflowEmail(config: SendEmailDTO): Promise<void> {

        const { business, transaction, account, driver, options, template, wallet } = config;

        let accountNo: string = '', balance: string = '', description: string = '', status: string = '',
            amount: string = '', date: string = '', fee: string = '', reference: string = '';

        let buttonText: string = options && options.buttonText || 'Verify';
        let _template = template ? template : 'wallet_credit';
        let salute = options && options.salute ? options.salute : 'Champ';
        let url = options && options.buttonUrl ? options.buttonUrl : '';
        let fromName = process.env.EMAIL_FROM_NAME || 'Vacepay';

        let bodyOne = options && options.bodyOne ? options.bodyOne : `Find the details of your transaction below:`;
        let bodyTwo = options && options.bodyTwo ? options.bodyTwo : `---`;
        let bodyThree = options && options.bodyThree ? options.bodyThree : `---`;

        let title: string = options && options.subject ? options.subject : 'Your wallet was funded successfuly';

        if (transaction) {

            const today = dateToday(transaction.createdAt);
            reference = transaction.reference;
            description = transaction.description;
            status = transaction.status;
            amount = `NGN${transaction.amount.toLocaleString()}`;
            date = `${leadingNum(today.date)}-${leadingNum(today.month)}-${today.year}`;
            fee = `NGN${transaction.fee.toLocaleString()}`;
            balance = wallet ? `NGN${wallet.balance.available.toLocaleString()}` : 'NGN0.00';

        }

        if (account) {
            accountNo = account.accountNo;
        }

        // send using sendgrid if driver is {sendgrid}
        if (driver === 'sendgrid') {

            await this.sendEmailWithSendgrid({
                email: business.email,
                fromName: fromName,
                template: _template,
                emailSalute: salute,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: bodyOne,
                bodyTwo: bodyTwo,
                bodyThree: bodyThree,
                buttonText: buttonText,
                buttonUrl: `${url}`,
                transaction: {
                    description,
                    status,
                    date,
                    amount,
                    fee,
                    reference,
                    balance
                }
            });

        }

        if (driver === 'zepto') {

            await this.sendEmailWithZepto({
                email: business.email,
                fromName: fromName,
                template: _template,
                emailSalute: salute,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: bodyOne,
                bodyTwo: bodyTwo,
                bodyThree: bodyThree,
                buttonText: buttonText,
                buttonUrl: `${url}`,
                transaction: {
                    description,
                    status,
                    date,
                    amount,
                    fee,
                    reference,
                    balance
                }
            });

        }
    }

    /**
     * @name sendBankSettledEmail
     * @param config 
     */
    public async sendBankSettledEmail(config: SendEmailDTO): Promise<void> {

        const { business, transaction, account, driver, options, template, wallet } = config;

        let accountNo: string = '', balance: string = '', description: string = '', status: string = '',
            amount: string = '', date: string = '', fee: string = '', reference: string = '';

        let buttonText: string = options && options.buttonText || 'Verify';
        let _template = template ? template : 'wallet_credit';
        let salute = options && options.salute ? options.salute : 'Champ';
        let url = options && options.buttonUrl ? options.buttonUrl : '';
        let fromName = process.env.EMAIL_FROM_NAME || 'Vacepay';

        let bodyOne = options && options.bodyOne ? options.bodyOne : `Find the details of your transaction below:`;
        let bodyTwo = options && options.bodyTwo ? options.bodyTwo : `---`;
        let bodyThree = options && options.bodyThree ? options.bodyThree : `---`;

        let title: string = options && options.subject ? options.subject : 'Settlement completed successfully';

        if (transaction) {

            const today = dateToday(transaction.createdAt);
            reference = transaction.reference;
            description = transaction.description;
            status = transaction.status;
            amount = `NGN${transaction.amount.toLocaleString()}`;
            date = `${leadingNum(today.date)}-${leadingNum(today.month)}-${today.year}`;
            fee = `NGN${transaction.fee.toLocaleString()}`;
            balance = wallet ? `NGN${wallet.balance.available.toLocaleString()}` : 'NGN0.00';

        }

        if (account) {
            accountNo = account.accountNo;
        }

        // send using sendgrid if driver is {sendgrid}
        if (driver === 'sendgrid') {

            await this.sendEmailWithSendgrid({
                email: business.email,
                fromName: fromName,
                template: _template,
                emailSalute: salute,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: bodyOne,
                bodyTwo: bodyTwo,
                bodyThree: bodyThree,
                buttonText: buttonText,
                buttonUrl: `${url}`,
                transaction: {
                    description,
                    status,
                    date,
                    amount,
                    fee,
                    reference,
                    balance
                }
            });

        }

        if (driver === 'zepto') {

            await this.sendEmailWithZepto({
                email: business.email,
                fromName: fromName,
                template: _template,
                emailSalute: salute,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: bodyOne,
                bodyTwo: bodyTwo,
                bodyThree: bodyThree,
                buttonText: buttonText,
                buttonUrl: `${url}`,
                transaction: {
                    description,
                    status,
                    date,
                    amount,
                    fee,
                    reference,
                    balance
                }
            });

        }
    }

    /**
     * @name sendPaymentLinkEmail
     * @param config 
     */
    public async sendPaymentLinkEmail(config: SendEmailDTO): Promise<void> {

        const { business, transaction, account, driver, options, template, wallet } = config;

        let accountNo: string = '', balance: string = '', description: string = '', status: string = '',
            amount: string = '', date: string = '', paymentName: string = '', fee: string = '', reference: string = '';

        let buttonText: string = options && options.buttonText || 'Verify';
        let _template = template ? template : 'wallet_credit';
        let salute = options && options.salute ? options.salute : 'Champ';
        let url = options && options.buttonUrl ? options.buttonUrl : '';
        let fromName = process.env.EMAIL_FROM_NAME || 'Vacepay';

        let bodyOne = options && options.bodyOne ? options.bodyOne : `Find the details of your transaction below:`;
        let bodyTwo = options && options.bodyTwo ? options.bodyTwo : `---`;
        let bodyThree = options && options.bodyThree ? options.bodyThree : `---`;

        let title: string = options && options.subject ? options.subject : 'Incoming payment successful';

        if (transaction) {

            const today = dateToday(transaction.createdAt);
            reference = transaction.reference;
            description = transaction.description;
            status = transaction.status;
            amount = `NGN${transaction.amount.toLocaleString()}`;
            date = `${leadingNum(today.date)}-${leadingNum(today.month)}-${today.year}`;
            fee = `NGN${transaction.fee.toLocaleString()}`;
            balance = wallet ? `NGN${wallet.balance.available.toLocaleString()}` : 'NGN0.00';
            paymentName = transaction.payment.name;

        }

        if (account) {
            accountNo = account.accountNo;
        }

        // send using sendgrid if driver is {sendgrid}
        if (driver === 'sendgrid') {

            await this.sendEmailWithSendgrid({
                email: business.email,
                fromName: fromName,
                template: _template,
                emailSalute: salute,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: bodyOne,
                bodyTwo: bodyTwo,
                bodyThree: bodyThree,
                buttonText: buttonText,
                buttonUrl: `${url}`,
                transaction: {
                    description,
                    status,
                    date,
                    amount,
                    fee,
                    reference,
                    balance,
                    paymentName
                }
            });

        }

        if (driver === 'zepto') {

            await this.sendEmailWithZepto({
                email: business.email,
                fromName: fromName,
                template: _template,
                emailSalute: salute,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: bodyOne,
                bodyTwo: bodyTwo,
                bodyThree: bodyThree,
                buttonText: buttonText,
                buttonUrl: `${url}`,
                transaction: {
                    description,
                    status,
                    date,
                    amount,
                    fee,
                    reference,
                    balance,
                    paymentName
                }
            });

        }
    }

    /**
     * @name sendTransferflowEmail
     * @param config 
     */
    public async sendTransferflowEmail(config: SendEmailDTO): Promise<void> {

        const { business, transaction, account } = config;

        let description: any = '', date: any = '', amount: any = '', status: any = '', fee: any = '';
        let accountNo: string = '';

        const text: string = config.options?.buttonText || 'Get Started';
        const url: string = config.options?.buttonUrl || process.env.WEBSITE_APP_URL!;
        const template: string = config.template ? config.template : 'wallet_credit'

        if (transaction) {

            const today = dateToday(transaction.createdAt);

            description = transaction.description;
            status = transaction.status;
            amount = `NGN${transaction.amount.toLocaleString()}`;
            date = `${leadingNum(today.date)}/${leadingNum(today.month)}/${today.year}`;
            fee = transaction.fee

        }

        if (account) {
            accountNo = account.accountNo;
        }

        // send using sendgrid if driver is {sendgrid}
        if (config.driver === 'sendgrid') {

            await this.sendEmailWithSendgrid({
                email: business.officialEmail,
                fromName: 'Vacepay',
                template: template,
                emailSalute: `Hello ${business.name}`,
                emailTitle: 'Incoming payment via payment link',
                preheaderText: 'incoming payment via your payment link',
                bodyOne: `Incoming payment of ${amount.toLocaleString()} via your payment link ${transaction?.payment.name} was successful.`,
                buttonText: text,
                buttonUrl: `${url}/login`,
                transaction: {
                    description,
                    status,
                    date,
                    amount,
                    fee,
                    reference: ''
                }
            });

        }

        if (config.driver === 'zepto') {

            await this.sendEmailWithZepto({
                email: business.officialEmail,
                fromName: 'Vacepay',
                template: template,
                emailSalute: `Hello ${business.name}`,
                emailTitle: 'Incoming payment via payment link',
                preheaderText: 'incoming payment via your payment link',
                bodyOne: `Incoming payment of ${amount.toLocaleString()} via your payment link ${transaction?.payment.name} was successful.`,
                buttonText: text,
                buttonUrl: `${url}/login`,
                transaction: {
                    description,
                    status,
                    date,
                    amount,
                    fee,
                    reference: ''
                }
            });

        }
    }

    /**
     * @name sendWalletOutflowEmail
     * @param config 
     */
    public async sendWalletOutflowEmail(config: SendEmailDTO): Promise<void> {

        const { business, transaction, account, driver, options, template, wallet } = config;

        let accountNo: string = '', balance: string = '', description: string = '', status: string = '',
            amount: string = '', date: string = '', paymentName: string = '', fee: string = '', reference: string = '';

        let buttonText: string = options && options.buttonText || 'Verify';
        let _template = template ? template : 'wallet_debit';
        let salute = options && options.salute ? options.salute : 'Champ';
        let url = options && options.buttonUrl ? options.buttonUrl : '';
        let fromName = process.env.EMAIL_FROM_NAME || 'Vacepay';

        let bodyOne = options && options.bodyOne ? options.bodyOne : `Find the details of your transaction below:`;
        let bodyTwo = options && options.bodyTwo ? options.bodyTwo : `---`;
        let bodyThree = options && options.bodyThree ? options.bodyThree : `---`;

        let title: string = options && options.subject ? options.subject : 'Incoming payment successful';

        if (transaction) {

            const today = dateToday(transaction.createdAt);
            reference = transaction.reference;
            description = transaction.description;
            status = transaction.status;
            amount = `NGN${transaction.amount.toLocaleString()}`;
            date = `${leadingNum(today.date)}-${leadingNum(today.month)}-${today.year}`;
            fee = `NGN${transaction.fee.toLocaleString()}`;
            balance = wallet ? `NGN${wallet.balance.available.toLocaleString()}` : 'NGN0.00';

        }

        if (account) {
            accountNo = account.accountNo;
        }

        // send using sendgrid if driver is {sendgrid}
        if (driver === 'sendgrid') {

            await this.sendEmailWithSendgrid({
                email: business.email,
                fromName: fromName,
                template: _template,
                emailSalute: salute,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: bodyOne,
                bodyTwo: bodyTwo,
                bodyThree: bodyThree,
                buttonText: buttonText,
                buttonUrl: `${url}`,
                transaction: {
                    description,
                    status,
                    date,
                    amount,
                    fee,
                    reference,
                    balance
                }
            });

        }

        if (driver === 'zepto') {

            await this.sendEmailWithZepto({
                email: business.email,
                fromName: fromName,
                template: _template,
                emailSalute: salute,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: bodyOne,
                bodyTwo: bodyTwo,
                bodyThree: bodyThree,
                buttonText: buttonText,
                buttonUrl: `${url}`,
                transaction: {
                    description,
                    status,
                    date,
                    amount,
                    fee,
                    reference,
                    balance
                }
            });

        }
    }

    /**
     * @name sendWalletReversalEmail
     * @param config 
     */
    public async sendWalletReversalEmail(config: SendEmailDTO): Promise<void> {

        const { business, transaction, account, driver, options, template, wallet } = config;

        let accountNo: string = '', balance: string = '', description: string = '', status: string = '',
            amount: string = '', date: string = '', paymentName: string = '', fee: string = '', reference: string = '';

        let buttonText: string = options && options.buttonText || 'Verify';
        let _template = template ? template : 'wallet_reversal';
        let salute = options && options.salute ? options.salute : 'Champ';
        let url = options && options.buttonUrl ? options.buttonUrl : '';
        let fromName = process.env.EMAIL_FROM_NAME || 'Vacepay';

        let bodyOne = options && options.bodyOne ? options.bodyOne : `Find the details of your transaction below:`;
        let bodyTwo = options && options.bodyTwo ? options.bodyTwo : `---`;
        let bodyThree = options && options.bodyThree ? options.bodyThree : `---`;

        let title: string = options && options.subject ? options.subject : 'Incoming payment successful';

        if (transaction) {

            const today = dateToday(transaction.createdAt);
            reference = transaction.reference;
            description = transaction.description;
            status = transaction.status;
            amount = `NGN${transaction.amount.toLocaleString()}`;
            date = `${leadingNum(today.date)}-${leadingNum(today.month)}-${today.year}`;
            fee = `NGN${transaction.fee.toLocaleString()}`;
            balance = wallet ? `NGN${wallet.balance.available.toLocaleString()}` : 'NGN0.00';

        }

        if (account) {
            accountNo = account.accountNo;
        }

        // send using sendgrid if driver is {sendgrid}
        if (driver === 'sendgrid') {

            await this.sendEmailWithSendgrid({
                email: business.email,
                fromName: fromName,
                template: _template,
                emailSalute: salute,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: bodyOne,
                bodyTwo: bodyTwo,
                bodyThree: bodyThree,
                buttonText: buttonText,
                buttonUrl: `${url}`,
                transaction: {
                    description,
                    status,
                    date,
                    amount,
                    fee,
                    reference,
                    balance
                }
            });

        }

        if (driver === 'zepto') {

            await this.sendEmailWithZepto({
                email: business.email,
                fromName: fromName,
                template: _template,
                emailSalute: salute,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: bodyOne,
                bodyTwo: bodyTwo,
                bodyThree: bodyThree,
                buttonText: buttonText,
                buttonUrl: `${url}`,
                transaction: {
                    description,
                    status,
                    date,
                    amount,
                    fee,
                    reference,
                    balance
                }
            });

        }
    }

    /**
     * @name sendNewChargebackEmail
     * @param config 
     */
    public async sendNewChargebackEmail(config: SendEmailDTO): Promise<void> {

        const { business, transaction, account, driver, options, template, wallet, chargeback } = config;

        let accountNo: string = '', balance: string = '', description: string = '', status: string = '',
            amount: string = '', date: string = '', level: string = '', fee: string = '', reference: string = '';

        let buttonText: string = options && options.buttonText || 'Review Chargeback';
        let _template = template ? template : 'chargeback';
        let salute = options && options.salute ? options.salute : 'Champ';
        let url = options && options.buttonUrl ? options.buttonUrl : '';
        let fromName = process.env.EMAIL_FROM_NAME || 'Vacepay';

        let bodyOne = options && options.bodyOne ? options.bodyOne : `Find the details of the chargeback below:`;
        let bodyTwo = options && options.bodyTwo ? options.bodyTwo : `---`;
        let bodyThree = options && options.bodyThree ? options.bodyThree : `---`;

        let title: string = options && options.subject ? options.subject : 'New chargeback on account';

        if (transaction) {

            const today = dateToday(transaction.createdAt);
            reference = transaction.reference;
            description = transaction.description;
            status = transaction.status;
            amount = `NGN${transaction.amount.toLocaleString()}`;
            date = `${leadingNum(today.date)}-${leadingNum(today.month)}-${today.year}`;
            fee = `NGN${transaction.fee.toLocaleString()}`;
            balance = wallet ? `NGN${wallet.balance.available.toLocaleString()}` : 'NGN0.00';

        }

        if (account) {
            accountNo = account.accountNo;
        }

        if (chargeback) {

            const today = dateToday(chargeback.createdAt);

            status = chargeback.status;
            amount = `NGN${chargeback.amount.toLocaleString()}`;
            date = `${leadingNum(today.date)}/${leadingNum(today.month)}/${today.year} ${leadingNum(today.hour)}:${leadingNum(today.min)}:${leadingNum(today.sec)}`;
            level = chargeback.level;
        }

        // send using sendgrid if driver is {sendgrid}
        if (config.driver === 'sendgrid') {

            await this.sendEmailWithSendgrid({
                email: business.email,
                fromName: fromName,
                template: _template,
                emailSalute: salute,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: bodyOne,
                bodyTwo: bodyTwo,
                bodyThree: bodyThree,
                buttonText: buttonText,
                buttonUrl: `${url}`,
                chargeback: {
                    level,
                    status,
                    date,
                    amount,
                    reference
                }
            });

        }

        if (config.driver === 'zepto') {

            await this.sendEmailWithZepto({
                email: business.email,
                fromName: fromName,
                template: _template,
                emailSalute: salute,
                emailTitle: title,
                preheaderText: title.toLowerCase(),
                bodyOne: bodyOne,
                bodyTwo: bodyTwo,
                bodyThree: bodyThree,
                buttonText: buttonText,
                buttonUrl: `${url}`,
                chargeback: {
                    level,
                    status,
                    date,
                    amount,
                    reference
                }
            });

        }
    }

}

export default new EmailService();