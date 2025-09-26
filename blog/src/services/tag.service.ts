import Post from '../models/Post.model';
import { IResult, ITagDoc, IPostDoc } from '../utils/types.util'
import { ObjectId } from 'mongoose'
import Category from '../models/Category.model';
import { arrayIncludes } from '@btffamily/vacepay';
import Tag from '../models/Tag.model';

interface IOverview{
    total: number,
    enabled: number,
    disabled: number
}

class TagService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    public async attachPost(tag: ITagDoc, post: IPostDoc): Promise<void>{

        if(!arrayIncludes(tag.posts, post._id.toString())){
            tag.posts.push(post._id);
            await tag.save();
        }

    }

    public async detachPost(tag: ITagDoc, post: IPostDoc): Promise<void>{

        if(arrayIncludes(tag.posts, post._id.toString())){
            const filtered = tag.posts.filter((x) => x.toString() !== post._id.toString())
            tag.posts = filtered;
            await tag.save();
        }

    }

    public async removeTagFromPosts(tagId: ObjectId): Promise<IResult> {
    
        const posts = await Post.find({});
    
        if(posts && posts.length > 1){
    
            for(let i = 0; i < posts.length; i++){
    
                if(arrayIncludes(posts[i].tags, tagId.toString())){
    
                    const index = posts[i].tags.findIndex((t: any) => t.toString() === tagId.toString());
                    posts[i].tags.splice(index, 1);
                    await posts[i].save();
    
                }
    
            }
    
        }
    
        return this.result;
    
    }
    
    public async removeTagFromCategories(tagId: ObjectId): Promise<IResult> {
    
        const categories = await Category.find({});
    
        if(categories && categories.length > 1){
    
            for(let i = 0; i < categories.length; i++){
    
                if(arrayIncludes(categories[i].tags, tagId.toString())){
    
                    const index = categories[i].tags.findIndex((t) => t.toString() === tagId.toString());
                    categories[i].tags.splice(index, 1);
                    await categories[i].save();
    
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

    public async detachPostFromAll(post: IPostDoc): Promise<void>{

        const tags = await Tag.find({});

        if(tags.length > 0){

            for(let i = 0; i < tags.length; i++){

                let tag = tags[i]

                if(arrayIncludes(tag.posts, post._id.toString())){
                    await this.detachPost(tag, post);
                } 

            }

        }

    }

}

export default new TagService();