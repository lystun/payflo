import Blacklist from '../models/Blacklist.model';
import Role from '../models/Role.model';
import { IResult } from '../utils/types.util'

interface IOverview{
    total: number
}

class BlacklistService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    public async overview(): Promise<IOverview>{

        let result: IOverview = {
            total: 0
        }

        const list = await Blacklist.countDocuments();

        result = {
            total: list,
        }

        return result;

    }

}

export default new BlacklistService();