import { ObjectId } from 'mongoose'
import Announcement from '../models/Announcement.model'
import { IAnnouncementDoc, IResult } from '../utils/types.util'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html';
import { CreateAnnouncementDTO, FilterAnnouncementDTO, ProcessSendAnnouncementDTO, UpdateAnnouncementDTO } from '../dtos/announcement.dto';
import { UIID, charLen, isBase64, notDefined, wordLen } from '@btffamily/vacepay';
import StorageService from './storage.service';
import BullQueue from '../queues/bull.queue';
import QueueChnannels from '../queues/channel.queue';

class AnnService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name validateCreateAnnouncement
     * @param data 
     * @returns 
     */
    public async validateCreateAnnouncement(data: CreateAnnouncementDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { title, avatar, mail, mobile, url, web } = data;

        if (!title) {
            result.error = true;
            result.message = 'title is required'
            result.code = 400;
        } else if (!url) {
            result.error = true;
            result.message = 'url is required'
            result.code = 400;
        } else if (avatar && !isBase64(avatar)) {
            result.error = true;
            result.message = 'avatar is required to be a base64 string'
            result.code = 400;
        } else if (mail && !mail.subject) {
            result.error = true;
            result.message = 'email subject is required'
            result.code = 400;
        } else if (mail && !mail.message) {
            result.error = true;
            result.message = 'email message is required'
            result.code = 400;
        } else if (mail && !mail.message) {
            result.error = true;
            result.message = 'email message is required'
            result.code = 400;
        } else if (mobile && !mobile.title) {
            result.error = true;
            result.message = 'mobile message title is required'
            result.code = 400;
        } else if (mobile && charLen(mobile.title) > 50) {
            result.error = true;
            result.message = 'mobile title cannot contain more than 50 characters'
            result.code = 400;
        } else if (mobile && !mobile.message) {
            result.error = true;
            result.message = 'mobile message is required'
            result.code = 400;
        } else if (mobile && charLen(mobile.message) > 100) {
            result.error = true;
            result.message = 'mobile message cannot contain more than 100 characters'
            result.code = 400;
        } else if (web && !web.title) {
            result.error = true;
            result.message = 'web message title is required'
            result.code = 400;
        } else if (web && !web.message) {
            result.error = true;
            result.message = 'mobile message is required'
            result.code = 400;
        } else if (web && wordLen(web.message) > 60) {
            result.error = true;
            result.message = 'web message cannot contain more than 45 words'
            result.code = 400;
        } else {
            result.error = false;
            result.message = ''
            result.code = 200;
        }

        return result;

    }

    /**
     * @name validateUpdateAnnouncement
     * @param data 
     * @returns 
     */
    public async validateUpdateAnnouncement(data: UpdateAnnouncementDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { avatar, mobile, web } = data;

        if (avatar && !isBase64(avatar)) {
            result.error = true;
            result.message = 'avatar is required to be a base64 string'
            result.code = 400;
        }else if (mobile && mobile.title && charLen(mobile.title) > 50) {
            result.error = true;
            result.message = 'mobile title cannot contain more than 50 characters'
            result.code = 400;
        }else if (mobile && mobile.message && charLen(mobile.message) > 100) {
            result.error = true;
            result.message = 'mobile message cannot contain more than 100 characters'
            result.code = 400;
        }else if (web && web.message && wordLen(web.message) > 60) {
            result.error = true;
            result.message = 'web message cannot contain more than 45 words'
            result.code = 400;
        } else {
            result.error = false;
            result.message = ''
            result.code = 200;
        }

        return result;

    }

    /**
     * @name createAnnouncement
     * @param data 
     * @returns 
     */
    public async createAnnouncement(data: CreateAnnouncementDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { title, user, avatar, description, mail, mobile, url, web } = data;

        const exist = await Announcement.findOne({ title: title });

        if (exist) {
            result.error = true;
            result.message = `announcement with title ${exist.title} already exist`;
        } else {

            let code = `ANN${UIID(1)}`;
            const announcement = await Announcement.create({
                title: title,
                url: url ? url : '',
                description: description ? description : '',
                user: user._id,
                code: code
            })

            if (web) {
                announcement.web = web;
            }

            if (mobile) {
                announcement.mobile = mobile;
            }

            if (mail) {

                // sanitize and convert the html
                const conv = await marked.parse(mail.message);
                const mkd = sanitizeHtml(conv, {
                    allowedTags: false,
                    allowedAttributes: false,
                    allowedSchemes: ['data', 'http', 'https', 'ftp', 'mailto', 'tel'],
                    allowedSchemesByTag: { img: ['data'] },
                    allowedClasses: {
                        'code': ['language-*', 'lang-*'],
                        '*': ['fancy', 'simple']
                    }
                });

                announcement.mail = {
                    marked: mkd,
                    message: mail.message,
                    subject: mail.subject
                }

            }

            if (avatar) {

                const filename = `annt-${announcement.code.toLowerCase()}-avatar`;
                const upload = await StorageService.uploadGcpFile(avatar, filename, 'base64');

                if (!upload.error && upload.data) {
                    announcement.avatar = upload.data.publicUrl;
                }

            }

            await announcement.save();

            result.data = announcement;

        }

        return result;

    }

    /**
     * @name defineFilterQuery
     * @param data 
     * @returns 
     */
    public defineFilterQuery(data: FilterAnnouncementDTO): Array<any> {

        let result: Array<any> = [];

        if (!notDefined(data.sms, true)) {
            result.push({ "mobile.sms": data.sms })
        }

        if (!notDefined(data.push, true)) {
            result.push({ "mobile.push": data.push })
        }

        if (!notDefined(data.dashboard, true)) {
            result.push({ "web.dashboard": data.dashboard })
        }

        if (!notDefined(data.public, true)) {
            result.push({ "web.public": data.public })
        }

        return result;

    }

    /**
     * @name processSendAnnouncement
     * @param data 
     */
    public async processSendAnnouncement(data: ProcessSendAnnouncementDTO): Promise<void>{

        const sendQueue = new BullQueue(QueueChnannels.Announcement);
        const { announcement } = data;

        // add to queue
        sendQueue.addToQueue([
            {
                data: { announcement },
                delay: 100,
                name: 'process-announcement'
            }
        ]);

        // process queue
        sendQueue.processJobs(this.sendAnnouncement);

    }

    /**
     * @name sendAnnouncement
     * @param data 
     */
    public async sendAnnouncement(data: any): Promise<void>{

        const announcement: IAnnouncementDoc = data.announcement;

        // TODO: come back to process sending announcement

    }

}

export default new AnnService()
