import { IResult } from '../../utils/types.util'

class PayazaService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

}

export default new PayazaService();