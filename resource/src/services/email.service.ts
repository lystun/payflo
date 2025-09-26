import { SendgridEmailDataDTO } from "../dtos/email.dto";
import { renderFile } from 'ejs'
import appRootUrl from 'app-root-path'
import transporter from '../utils/sendgrid.util';

class EmailService {

    constructor(){};

    public async sendEmailWithSendgrid(data: SendgridEmailDataDTO): Promise<void>{

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

}

export default new EmailService();