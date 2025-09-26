import Post from '../models/Post.model';
import { IResult, ITagDoc, IPostDoc, ICampaignSection, ICampaignDoc, ISubscriberDoc, IUTMParams, IJobData } from '../utils/types.util'
import { ObjectId } from 'mongoose'
import Category from '../models/Category.model';
import { UIID, arrayIncludes, dateToday, isString, leadingNum } from '@btffamily/vacepay';
import Tag from '../models/Tag.model';
import Subscriber from '../models/Subscriber.model';
import BullQueue from '../queues/bull.queue';
import QueueChnannels from '../queues/channel.queue';
import { sendGrid } from '../utils/email.util';
import Campaign from '../models/Campaign.model';
import UserService from './user.service';
import EmailService from './email.service';
import { CampaignBlastDTO } from '../dtos/campaign.dto';

import dayjs from 'dayjs';
import customeParse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customeParse)

interface IOverview{
    total: number,
    enabled: number,
    disabled: number
}

class CampaignService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    private isBase64(val: string): boolean {

        const mime = val.split(';base64')[0].split(':')[1];

        return mime !== '' ? true : false

    }

    /**
     * @name validateSections
     * @param sections 
     * @returns 
     */
    public async validateSections(sections: Array<ICampaignSection>): Promise<IResult>{

        if(sections.length > 0){

            for(let i = 0; i < sections.length; i++){

                const section = sections[i];

                if(!section.caption){
                    this.result.error = true;
                    this.result.message = `caption is required for section ${i+1}`;
                    break;
                } else if(!section.body){
                    this.result.error = true;
                    this.result.message = `section ${i+1} content is required`
                    break;
                } else if(!section.url){
                    this.result.error = true;
                    this.result.message = `section ${i+1} url is required`
                    break;
                } else if(!section.footnote){
                    this.result.error = true;
                    this.result.message = `section ${i+1} footnote is required`
                    break;
                } else if(section.thumbnail && !isString(section.thumbnail)){
                    this.result.error = true;
                    this.result.message = `section ${i+1} thumbnail image should be a string`
                    break;
                } else if(section.thumbnail && !this.isBase64(section.thumbnail)){
                    this.result.error = true;
                    this.result.message = `section ${i+1} thumbnail image should be a base64 string`
                    break;
                } else {
                    this.result.error = false;
                    this.result.message = ``;
                    continue;
                }

            }

        }

        return this.result;

    }

    /**
     * @name overview
     * @param id 
     * @returns 
     */
    public async overview(id: ObjectId | null): Promise<IOverview>{

        let result: IOverview = {
            total: 0,
            enabled: 0,
            disabled: 0
        }

        let tagList: Array<ITagDoc> = [];
        const tags = await Tag.find({});

        if(tags.length > 0){

            if(id !== null){

                tagList = tags.filter((x) => x.user.toString() === id.toString());

                if(tagList.length > 0){

                    result.total = tagList.length;

                    for(let i = 0; i < tagList.length; i++){
                        const tag = tagList[i];

                        if(tag.isEnabled === true){
                            result.enabled += 1;
                        }

                        if(tag.isEnabled === false){
                            result.disabled += 1;
                        }
                        
                    }

                }

            }

            if(id === null){

                result.total = tags.length;

                for(let i = 0; i < tags.length; i++){
                    const tag = tags[i];

                    if(tag.isEnabled === true){
                        result.enabled += 1;
                    }

                    if(tag.isEnabled === false){
                        result.disabled += 1;
                    }
                    
                }

            }

        }

        return result;

    }

    /**
     * @processMailBlast
     * @param campaign 
     */
    public async processCampaignBlast(data: CampaignBlastDTO): Promise<void>{

        const { campaign, type, guests } = data;

        const sendQueue = new BullQueue(QueueChnannels.MailBlast);
        const _campaign = await Campaign.findOne({ _id: campaign._id });

        if(type === 'send-campaign' && _campaign){

            // create job
            const job: IJobData = {
                data: {
                    campaign: _campaign
                },
                delay: 100,
                name: ''
            }

            // add job to queue
            sendQueue.addToQueue([job]);

            // process job { with callback }
            sendQueue.processJobs(this.sendBulkCampaign);

        }

        if(type === 'test-campaign' && _campaign && guests && guests.length > 0){

            // create job
            const job: IJobData = {
                data: {
                    campaign: _campaign,
                    guests: guests
                },
                delay: 100,
                name: ''
            }

            // add job to queue
            sendQueue.addToQueue([job]);

            // process job { with callback }
            sendQueue.processJobs(this.sendTestCampaign);

        }


    }

    /**
     * @name sendBulkEmail
     * @param data 
     */
    public async sendBulkCampaign(data: { campaign: ICampaignDoc }): Promise<void> {

        let sections: Array<any> = [];
        const { campaign } = data;
        const envVar = parseInt(process.env.MAIL_BLAST_LIMIT || '50');

        const limit: number = envVar;
        let count: number = 0;
        const total: number = await Subscriber.countDocuments({ isEnabled: true });

        while (count <= total) {

            const subscribers = await Subscriber.find({ isEnabled: true }).skip(count).limit(limit);

            if (subscribers.length > 0 && campaign) {

                for (let i = 0; i < subscribers.length; i++) {

                    let subber: ISubscriberDoc = subscribers[i];
                    let dt = dateToday(campaign.createdAt);

                    // capture campaign sections
                    await Campaign.findOne({ _id: campaign._id }).then((old) => {

                        if (old) {
                            const context = {
                                sections: old.sections.map((section) => {
                                    return {
                                        label: section.label,
                                        caption: section.caption,
                                        color: section.color,
                                        marked: section.marked,
                                        thumbnail: section.thumbnail,
                                        url: section.url,
                                        buttonText: 'Read More',
                                        campaignCode: old.code,
                                        subscriberCode: subber.code,
                                        footnote: section.footnote
                                    }
                                })
                            }

                            sections = context.sections;

                        }

                    })

                    await EmailService.sendCampaignEmail({
                        driver: 'zepto',
                        guest: subber.email,
                        template: '_campaign',
                        title: campaign.title,
                        sections: sections,
                        createdAt: `${dt.date} ${dt.monthName.toUpperCase()}, ${dt.year}`,
                        code: subber.code,
                        subject: `Concreap - ${campaign.headline}`,
                        buttonText: "Read More",
                        isHandlebar: true
                    });

                }

                count += limit;

            }

        }

    }

    /**
     * @name processTestMailBlast
     * @param campaign 
     */
    public async sendTestCampaign(data: { campaign: ICampaignDoc, guests: Array<string> }): Promise<void> {

        let sections: Array<any> = [];
        const { campaign, guests } = data;
        const _campaign = await Campaign.findOne({ _id: campaign._id });

        if (_campaign) {

            for (let i = 0; i < guests.length; i++) {

                let codeGen = UIID(1)
                let dt = dateToday(Date.now());
                let time = `${leadingNum(dt.hour + 1) + ":" + leadingNum(dt.min) + ":" + leadingNum(dt.sec)} ${dayjs(dt.ISO).format('A')}`
                let dateReadable = `${dt.date} ${dt.monthName.toUpperCase()}, ${dt.year}. ${time}`

                // capture campaign sections
                await Campaign.findOne({ _id: _campaign._id }).then((old) => {

                    if (old) {
                        const context = {
                            sections: old.sections.map((section) => {
                                return {
                                    label: section.label,
                                    caption: section.caption,
                                    color: section.color,
                                    marked: section.marked,
                                    thumbnail: section.thumbnail,
                                    url: section.url,
                                    buttonText: 'Read More',
                                    campaignCode: old.code,
                                    subscriberCode: codeGen,
                                    footnote: section.footnote
                                }
                            })
                        }

                        sections = context.sections;

                    }

                })

                let check = await UserService.checkEmail(guests[i]);

                if (check) {

                    await EmailService.sendCampaignEmail({
                        driver: 'zepto',
                        guest: guests[i],
                        template: '_campaign',
                        title: _campaign.title,
                        sections: sections,
                        createdAt: dateReadable,
                        code: codeGen,
                        subject: `Concreap - ${_campaign.headline}`,
                        buttonText: "Read More",
                        isHandlebar: true
                    });

                }


            }

        }

    }

    /**
     * @name trackClicks
     * @param campaign 
     * @param subscriber 
     * @param utm 
     */
    public async trackClicks(campaign: ICampaignDoc, subscriber: ISubscriberDoc, utm: IUTMParams): Promise<void>{

        const _campaign = await Campaign.findOne({ _id: campaign._id });

        const today = dateToday(Date.now());

        if(_campaign){

            let clicks = _campaign.clicks ? _campaign.clicks : [];
            let seen = _campaign.seen ? _campaign.seen : [];

            const ck = clicks.find((x) => x.medium === utm.medium && x.source === utm.source && x.subscriber.toString() === subscriber._id.toString())
            const ckx = clicks.findIndex((x) => x.medium === utm.medium && x.source === utm.source && x.subscriber.toString() === subscriber._id.toString())

            const sn = seen.find((x) => x.medium === utm.medium && x.source === utm.source && x.subscriber.toString() === subscriber._id.toString())
            const snx = seen.findIndex((x) => x.medium === utm.medium && x.source === utm.source && x.subscriber.toString() === subscriber._id.toString())

            if(ck && ckx >= 0 && sn && snx >= 0 ){

                const cat = dateToday(ck.clickedAt);
                const cm1 = `${cat.year}/${cat.month}/${cat.date}`;
                const cm2 = `${today.year}/${today.month}/${today.date}`;

                if(cm1 !== cm2){

                    ck.count = ck.count + 1;
                    clicks.splice(ckx, 1, ck);

                    sn.count = sn.count + 1;
                    seen.splice(snx, 1, sn);

                    _campaign.clicks = clicks;
                    _campaign.seen = seen;
                    await _campaign.save()
                }

            }else{

                _campaign.clicks.push({
                    subscriber: subscriber._id,
                    count: 1,
                    source: utm.source,
                    medium: utm.medium,
                    clickedAt: today.ISO
                })

                _campaign.seen.push({
                    subscriber: subscriber._id,
                    count: 1,
                    source: utm.source,
                    medium: utm.medium,
                    seenAt: today.ISO
                })

                await _campaign.save();

            }

        } 

    }

}

export default new CampaignService();