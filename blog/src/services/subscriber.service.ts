import Post from '../models/Post.model';
import { IResult, ITagDoc, IPostDoc, ICampaignSection, ICampaignDoc, ISubscriberDoc, IUTMParams } from '../utils/types.util'
import { ObjectId } from 'mongoose'
import Category from '../models/Category.model';
import { arrayIncludes, dateToday, isString } from '@btffamily/vacepay';
import Tag from '../models/Tag.model';
import Subscriber from '../models/Subscriber.model';
import BullQueue from '../queues/bull.queue';
import QueueChnannels from '../queues/channel.queue';
import { sendGrid } from '../utils/email.util';

interface IOverview{
    total: number,
    enabled: number,
    disabled: number
}

class SubscriberService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name trackClicks
     * @param campaign 
     * @param subscriber 
     * @param utm 
     */
    public async trackClicks(campaign: ICampaignDoc, subscriber: ISubscriberDoc, utm: IUTMParams): Promise<void>{

        const today = dateToday(Date.now());

        const _subscriber = await Subscriber.findOne({ _id: subscriber._id });

        if(_subscriber){

            const click = _subscriber.clicks.find((x) => x.medium === utm.medium && x.source === utm.source && x.campaign.toString() === campaign._id.toString())
            const clickX = _subscriber.clicks.findIndex((x) => x.medium === utm.medium && x.source === utm.source && x.campaign.toString() === campaign._id.toString())

            if(click && clickX >= 0){

                const cat = dateToday(click.clickedAt);
                const cm1 = `${cat.year}/${cat.month}/${cat.date}`;
                const cm2 = `${today.year}/${today.month}/${today.date}`;

                if(cm1 !== cm2){
                    click.count = click.count + 1;
                    _subscriber.clicks.splice(clickX, 1, click);
                    await _subscriber.save();
                }

            }else{

                _subscriber.clicks.push({
                    campaign: campaign._id,
                    count: 1,
                    source: utm.source,
                    medium: utm.medium,
                    clickedAt: today.ISO
                })

                await _subscriber.save();

            }

        }

        

    }

}

export default new SubscriberService();