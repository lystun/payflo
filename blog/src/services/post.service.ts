import Post from '../models/Post.model';
import { IGraphData, IPostDoc, IResult, ITagDoc } from '../utils/types.util'
import { ObjectId } from 'mongoose'
import Category from '../models/Category.model';
import { arrayIncludes, dateToday } from '@btffamily/vacepay';
import Comment from '../models/Comment.model';
import SystemService from './system.service';

interface IOverview{
    total: number,
    pending: number,
    published: number,
    enabled: number,
    disabled: number
}

interface IGraph{

}

class PostService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    public async attachTag(post: IPostDoc, tag: ITagDoc): Promise<void>{

        if(!arrayIncludes(post.tags, tag._id.toString())){
            post.tags.push(tag._id);
            await post.save();
        }

    }

    public async detachTag(post: IPostDoc, tag: ITagDoc): Promise<void>{

        if(arrayIncludes(post.tags, tag._id.toString())){
            const filtered = post.tags.filter((x) => x.toString() !== tag._id.toString())
            post.tags = filtered;
            await post.save();
        }

    }

    public async validatePost(data: any): Promise<IResult>{

        if(!data || data === null || data === undefined){

            this.result.error = true;
            this.result.message = 'post data is required'

        }else{

            if(!data.title){
                this.result.error = true;
                this.result.message = 'title is required'
            }else if(!data.headline){
                this.result.error = true;
                this.result.message = 'headline is required'
            }else if(!data.body){
                this.result.error = true;
                this.result.message = 'post body is required'
            }else if(!data.categoryId){
                this.result.error = true;
                this.result.message = 'category id is required'
            }else if(!data.bracketId){
                this.result.error = true;
                this.result.message = 'bracket id is required'
            }else if(!data.authorId){
                this.result.error = true;
                this.result.message = 'author id is required'
            }else if(!data.callback){
                this.result.error = true;
                this.result.message = 'callback url is required'
            }else{
                this.result.error = false;
                this.result.message = ''
            }

        }

        return this.result;

    }

    /**
     * 
     * @param postId 
     * @param categoryId 
     * @returns 
     */
    public async attachPostToNextCategory (postId: ObjectId, categoryId: ObjectId): Promise<IResult> {

        const categories = await Category.find({});
    
        if(categories && categories.length > 1){
    
            for(let i = 0; i < categories.length; i++){
    
                if(categories[i]._id.toString() !== categoryId.toString()){
    
                    categories[i].posts.push(postId);
                    await categories[i].save();
                    
                    this.result.data = categories[i]._id;
    
                    break;
    
                }else{
                    continue;
                }
    
            }
    
        }else{
    
            this.result.error = true;
            this.result.message = 'cannot attach post to next category'
    
        }
    
        return this.result;
    
    }
    
    /**
     * 
     * @param postId 
     * @param categoryId 
     * @returns 
     */
    public async removePostFromCategory(postId: ObjectId, categoryId: ObjectId): Promise<IResult>{
    
        const category = await Category.findOne({ _id: categoryId });
    
        if(category && category.posts.length > 0 && arrayIncludes(category.posts, postId.toString())){
    
            const index = category.posts.findIndex((p) => p.toString() === postId.toString());
            category.posts.slice(index, 1);
            await category.save();
    
        }else{
            this.result.error = true;
            this.result.message = 'category is undefined or does not have a list of posts';
        }
    
    
        return this.result;
    
    }

    /**
     * @name overview
     * @param id 
     * @returns 
     */
    public async overview(id: ObjectId | null = null): Promise<IOverview>{

        let result: IOverview = {
            total: 0,
            pending: 0,
            published: 0,
            enabled: 0,
            disabled: 0
        }

        let postList: Array<IPostDoc> = []

        const posts = await Post.find({});

        if(posts.length > 0){

            if(id !== null){

                postList = posts.filter((x) => x.user.toString() === id.toString());

                result.total = postList.length;

                if(postList.length > 0){

                    for(let i = 0; i < postList.length; i++){
                        const post = postList[i];

                        if(post.status === 'pending' && post.isPublished === false){
                            result.pending += 1;
                        }

                        if(post.status === 'published' && post.isPublished === true){
                            result.published += 1;
                        }

                        if(post.isEnabled === true){
                            result.enabled += 1;
                        }

                        if(post.isEnabled === false){
                            result.disabled += 1;
                        }
                        
                    }

                }

            }

            if(id === null){

                result.total = posts.length;

                for(let i = 0; i < posts.length; i++){
                    const post = posts[i];

                    if(post.status === 'pending' && post.isPublished === false){
                        result.pending += 1;
                    }

                    if(post.status === 'published' && post.isPublished === true){
                        result.published += 1;
                    }

                    if(post.isEnabled === true){
                        result.enabled += 1;
                    }

                    if(post.isEnabled === false){
                        result.disabled += 1;
                    }
                    
                }

            }

        }

        return result;

    }

    public async graphData(dt: string = '', id: ObjectId | null = null): Promise<Array<IGraphData>>{

        let result: Array<IGraphData> = [];
        let dates: Array<{lb: string, dt: string}> = [];
        let temp: Array<{lb: string, v: number}> = [];
        let max: number = 60;

        let list: Array<IPostDoc> = []
        const today = dt === '' ? new Date() : new Date(dt);
        const conv = dateToday(today);

        //get weeks and weeks-dates {ISO string format}
        const weeks = SystemService.getWeeksInMonth(conv.year, (conv.month - 1));
        const weeksDates = SystemService.getWeeksDates(conv.year, conv.month, weeks);

        if(id === null){

            const posts = await Post.find({});

            posts.forEach((post: IPostDoc, index: number) => {

                const pcv = dateToday(post.createdAt);
    
                if(pcv.month === conv.month && pcv.year === conv.year){
                    list.push(post)
                }
    
            })

        }

        if(id !== null){

            const posts = await Post.find({ author: id });

            if(posts.length > 0){

                posts.forEach((post: IPostDoc, index: number) => {

                    const pcv = dateToday(post.createdAt);
        
                    if(pcv.month === conv.month && pcv.year === conv.year){
                        list.push(post)
                    }
        
                })

            }
            

        }

        // process data if available
        if(list.length > 0 && weeksDates.length > 0){

            /*
                Extract into results. 
                Extract all dates in the month here
                and split them into weeks
            */
            for(let i = 0; i < weeksDates.length; i++){

                const week = weeksDates[i];

                result.push({
                    week: week.label,
                    start: week.start,
                    end: week.end,
                    total: 0,
                    value: 0,
                    dates: week.dates
                })

                // extract dates
                week.dates.map((x) => {
                    dates.push({ lb: week.label, dt: x })
                })

            }

            // process all dates in the month, week by week
            for(let j = 0; j < dates.length; j++){

                const wdm = dates[j].dt.substring(5,7) // month number
                const wdd = dates[j].dt.substring(8,10) // date number

                list.map((p: IPostDoc, index) => {

                    const pm = dateToday(p.createdAt).ISO.substring(5,7) // month number
                    const pd = dateToday(p.createdAt).ISO.substring(8,10) // date number

                    if(wdm === pm && wdd === pd){

                        const rs = result.find((x) => x.week === dates[j].lb);
                        const rsx = result.findIndex((x) => x.week === dates[j].lb);

                        if(rs && rsx >= 0){
                            rs.total = rs.total + 1;
                            rs.value = rs.value + 1;
                            result.splice(rsx, 1, rs);
                        }
                    }

                })

            }

            result.map((x) => {
                temp.push({ lb: x.week, v: x.total })
            })

            // add max total values using reverse for-loop
            for(let y = 0; y < result.length; y++){

                // get the item with highest {total} value
                const itm = temp.find((x) => x.v === Math.max.apply(null, temp.map((x) => x.v)));
                const itmx = temp.findIndex((x) => x.v === Math.max.apply(null, temp.map((x) => x.v)));

                if(itm && itmx >= 0){

                    const wk = result.find((x) => x.week === itm.lb)
                    const wkx = result.findIndex((x) => x.week === itm.lb);
                    
                    if(wk && wkx >= 0){

                        wk.total = max;
                        result.splice(wkx, 1, wk);
                        max = max - 15;

                        temp.splice(itmx, 1);
                    }

                }

            }

            

        }

        // if(list.length <= 0 && weeksDates.length > 0){

        //     for(let i = 0; i < weeksDates.length; i++){

        //         const week = weeksDates[i];

        //         result.push({
        //             week: week.label,
        //             start: week.start,
        //             end: week.end,
        //             total: 0,
        //             value: 0,
        //             dates: week.dates
        //         })

        //     }

        // }

        return result;

    }

    public async deleteAllComments(post: IPostDoc): Promise<void>{

        const comments = await Comment.find({ post: post._id });

        if(comments.length > 0){

            for(let i = 0; i < comments.length; i++){

                let comment = comments[i]

                await Comment.deleteOne({ _id: comment._id });

            }

        }

    }

}

export default new PostService();