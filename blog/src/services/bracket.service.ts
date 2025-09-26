import Post from '../models/Post.model';
import { IBracketDoc, IPostDoc, IResult } from '../utils/types.util'
import { arrayIncludes } from '@btffamily/vacepay';
import Bracket from '../models/Bracket.model';

interface IOverview{
    total: number,
    enabled: number,
    disabled: number
}

class BracketService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * 
     * @param category 
     * @param post 
     */
    public async attachPost(bracket: IBracketDoc, post: IPostDoc): Promise<void>{

        if(!arrayIncludes(bracket.posts, post._id.toString())){
            bracket.posts.push(post._id);
            await bracket.save();
        }

    }

    /**
     * 
     * @param category 
     * @param post 
     */
    public async detachPost(bracket: IBracketDoc, post: IPostDoc): Promise<void>{

        if(arrayIncludes(bracket.posts, post._id.toString())){
            const filtered = bracket.posts.filter((x) => x.toString() !== post._id.toString())
            bracket.posts = filtered;
            await bracket.save();
        }

    }

    public async overview(): Promise<IOverview>{

        let result: IOverview = {
            total: 0,
            enabled: 0,
            disabled: 0
        }

        const brackets = await Bracket.find({});

        if(brackets.length > 0){

            result.total = brackets.length;

            for(let i = 0; i < brackets.length; i++){
                const bracket = brackets[i];

                if(bracket.isEnabled === true){
                    result.enabled += 1;
                }

                if(bracket.isEnabled === false){
                    result.disabled += 1;
                }
                
            }

        }

        return result;

    }

    public async detachPostFromAll(post: IPostDoc): Promise<void>{

        const brackets = await Bracket.find({});

        if(brackets.length > 0){

            for(let i = 0; i < brackets.length; i++){

                let bracket = brackets[i];

                if(arrayIncludes(bracket.posts, post._id.toString())){
                    this.detachPost(bracket, post)
                }

            }

        }

    }

}

export default new BracketService();