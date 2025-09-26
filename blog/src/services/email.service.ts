import { SendCampainEmailDTO, SendgridEmailDataDTO } from "../dtos/email.dto";
import { renderFile } from 'ejs'
import appRootUrl from 'app-root-path'
import transporter from '../utils/sendgrid.util';
import { notDefined } from "@btffamily/vacepay";

import handlebars from 'handlebars'
import fs from 'fs-extra'

class EmailService {

    constructor(){};

    /**
     * @name sendEmailWithSendgrid
     * @param data 
     */
    public async sendEmailWithSendgrid(data: SendgridEmailDataDTO): Promise<void>{

        const { isHandlebar } = data;

        const options = {
            auth: {
                apiKey: process.env.SENDGRID_API_KEY || '',
            }
        }
    
        const appUrlSource = `${appRootUrl.path}/src`;

        if(!notDefined(isHandlebar, true) && isHandlebar){

            const content = fs.readFileSync(`${appUrlSource}/views/emails/hbs/${data.template}.handlebars`, 'utf-8');
            const template = handlebars.compile(content);

            const html = (template({
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
                sections: data.sections,
                createdAt: data.createdAt,
                code: data.code,
            }))

            const mailData = {
                to: data.email,
                from: `${data.fromName ? data.fromName : process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
                subject: data.emailTitle,
                text: 'email',
                html: html,
            };

            //send mail
            await transporter.send(options, mailData, (resp: any) => {
                // loggerUtil.log(resp);
            });

        }else{

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
                    sections: data.sections,
                    createdAt: data.createdAt,
                    code: data.code
                },
        
                {},
        
                async (error, html) => {
                    try {
                        
                        const mailData = {
                            to: data.email,
                            from: `${data.fromName ? data.fromName : process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
                            subject: data.emailTitle,
                            text: 'email',
                            html: html,
                        };
        
                        //send mail
                        await transporter.send(options, mailData, (resp: any) => {
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

    /**
     * @name sendCampaignEmail
     * @param config 
     */
    public async sendCampaignEmail(config: SendCampainEmailDTO): Promise<void>{

        let text: string = config.buttonText || 'Read More';
        let url: string = config.buttonUrl || '';
        let title: string = config.subject || 'Hello Champ!';
        let template: string = config.template || '_campaign';

        // send using sendgrid if driver is {sendgrid}
        if(config.driver === 'sendgrid'){

            await this.sendEmailWithSendgrid({
                title: config.title,
                email: config.subber ? config.subber.email : config.guest!,
                fromName: process.env.FROM_NAME || 'Platform',
                template: template,
                emailSalute: `Hello Champ!`,
                emailTitle: title,
                preheaderText: 'concreap-roundup',
                sections: config.sections,
                createdAt: config.createdAt,
                code: config.code,
                bodyOne: '',
                buttonText: text,
                buttonUrl: `${url}`,
                isHandlebar: config.isHandlebar
              });

        }

    }

}

export default new EmailService();