import Post from '../models/Post.model';
import { IBracketDoc, IPostDoc, IResult } from '../utils/types.util'
import { arrayIncludes } from '@btffamily/vacepay';
import Bracket from '../models/Bracket.model';
import Comment from '../models/Comment.model';

interface IOverview{
    total: number,
    enabled: number,
    disabled: number
}

class CommentService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * 
     * @returns 
     */
    public async overview(): Promise<IOverview>{

        let result: IOverview = {
            total: 0,
            enabled: 0,
            disabled: 0
        }

        const comments = await Comment.find({});

        if(comments.length > 0){

            result.total = comments.length;

            for(let i = 0; i < comments.length; i++){
                const comment = comments[i];

                if(comment.isEnabled === true){
                    result.enabled += 1;
                }

                if(comment.isEnabled === false){
                    result.disabled += 1;
                }
                
            }

        }

        return result;

    }

}

export default new CommentService();