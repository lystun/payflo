import Post from '../models/Post.model';
import { ICategoryDoc, IPostDoc, IResult, ITagDoc } from '../utils/types.util'
import { ObjectId } from 'mongoose'
import PostService from './post.service'
import { arrayIncludes } from '@btffamily/vacepay';
import Category from '../models/Category.model';

interface IOverview{
    total: number,
    enabled: number,
    disabled: number
}

class Categoryervice {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * 
     * @param category 
     * @param post 
     */
    public async attachPost(category: ICategoryDoc, post: IPostDoc): Promise<void>{

        if(!arrayIncludes(category.posts, post._id.toString())){
            category.posts.push(post._id);
            await category.save();
        }

    }

    /**
     * 
     * @param category 
     * @param post 
     */
    public async detachPost(category: ICategoryDoc, post: IPostDoc): Promise<void>{

        if(arrayIncludes(category.posts, post._id.toString())){
            const filtered = category.posts.filter((x) => x.toString() !== post._id.toString())
            category.posts = filtered;
            await category.save();
        }

    }

    /**
     * 
     * @param category 
     * @param tag 
     */
    public async attachTag(category: ICategoryDoc, tag: ITagDoc): Promise<void>{

        if(!arrayIncludes(category.tags, tag._id.toString())){
            category.tags.push(tag._id);
            await category.save();
        }

    }

    /**
     * 
     * @param category 
     * @param tag 
     */
    public async detachTag(category: ICategoryDoc, tag: ITagDoc): Promise<void>{

        if(arrayIncludes(category.tags, tag._id.toString())){
            const filtered = category.tags.filter((x) => x.toString() !== tag._id.toString())
            category.tags = filtered;
            await category.save();
        }

    }

    /**
     * 
     * @param categoryId 
     * @returns 
     */
    public async removeCategoryFromPosts(categoryId: ObjectId): Promise<IResult>{
    
        const posts = await Post.find({});
    
        if(posts && posts.length > 0){
    
            for(let i = 0; i < posts.length; i++){
    
                if(posts[i].category.toString() === categoryId.toString()){
    
                    const attach = await PostService.attachPostToNextCategory(posts[i]._id, categoryId);
                    posts[i].category = attach.data;
                    await posts[i].save();
    
                }else{
                    continue;
                }
    
            }
    
        }else{
    
            this.result.error = true;
            this.result.message = 'cannot remove category from posts'
    
        }
    
        return this.result;
    
    }

    /**
     * @name overview
     * @returns 
     */
    public async overview(): Promise<IOverview>{

        let result: IOverview = {
            total: 0,
            enabled: 0,
            disabled: 0
        }

        const categories = await Category.find({});

        if(categories.length > 0){

            result.total = categories.length;

                for(let i = 0; i < categories.length; i++){
                    const cat = categories[i];

                    if(cat.isEnabled === true){
                        result.enabled += 1;
                    }

                    if(cat.isEnabled === false){
                        result.disabled += 1;
                    }
                    
                }

        }

        return result;

    }

    public async detachPostFromAll(post: IPostDoc): Promise<void>{

        const categories = await Category.find({});

        if(categories.length > 0){

            for(let i = 0; i < categories.length; i++){

                let category = categories[i]

                if(arrayIncludes(category.posts, post._id.toString())){
                    await this.detachPost(category, post);
                } 

            }

        }

    }

}

export default new Categoryervice();