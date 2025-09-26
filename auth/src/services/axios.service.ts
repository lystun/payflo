import Axios, { AxiosError } from 'axios'
import { CallAxiosDTO } from '../dtos/axios.dto'
import { IResult } from '../utils/types.util';

class AxiosService {

    constructor() { }

    public async call(params: CallAxiosDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null };
        const { headers, method, path, body } = params;

        await Axios({
            method: method,
            url: path,
            data: body,
            headers: headers
        }).then((resp) => {
            const status = resp.status;
            result.data = { ...resp.data, status };
        }).catch((err: AxiosError) => {
            result.error = true;
            result.message = err.message ? err.message : 'An error occured'
            result.data = err.response?.data || null
        })

        return result;

    }

}

export default new AxiosService()