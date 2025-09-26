import AxiosService from '../services/axios.service';

interface IMailOptions {
    from: string,
    fromName: string,
    subject: string,
    text: any,
    html: any,
    to: Array<{ email: string, name: string }>,
    replyTo?: Array<{ email: string, name: string }>,
    cc?: Array<{ email: string, name: string }>,
    attachments?: Array<{
        content: string,
        mime: string,
        name: string
    }>
}

class ZeptoTransport {

    constructor() {
    }

    public async sendAPI(data: IMailOptions, callback: CallableFunction): Promise<void> {

        let replies: Array<{ email_address: { address: string, name: string } }> = [];
        let attach: Array<{ content: string, mime_type: string, name: string }> = [];
        const { from, html, subject, text, to, fromName, replyTo, attachments } = data;

        if (to.length > 0) {

            // grab addresses emails is going to
            const toList = to.map((x) => {
                return {
                    "email_address": {
                        "address": x.email,
                        "name": x.name
                    },
                }
            })

            // define payload body
            const body: any = {
                "from": { "address": from, "name": fromName },
                "to": toList,
                "subject": subject,
                "textbody": text,
                "htmlbody": html,
            }

            // grab addresses emails to reply to
            if (replyTo && replyTo.length > 0) {
                replies = replyTo.map((x) => {
                    return {
                        "email_address": {
                            "address": x.email,
                            "name": x.name
                        },
                    }
                })

                body["reply_to"] = replies;
            }

            // grab addresses emails to reply to
            if (attachments && attachments.length > 0) {
                attach = attachments.map((x) => {
                    return {
                        "content": x.content,
                        "mime_type": x.mime,
                        "name": x.name
                    }
                })
                body["attachments"] = attach;
            }


            const response = await AxiosService.call({
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    "Content-Type": "application/json",
                    Authorization: process.env.ZEPTO_TOKEN || ''
                },
                path: `${process.env.ZEPTO_API_URL}/v1.1/email`,
                body: body
            })

            callback(response)
        }


    }

}

export default new ZeptoTransport()