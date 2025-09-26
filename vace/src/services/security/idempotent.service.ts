import { dateToday, formatISO, leadingNum } from '@btffamily/vacepay';
import { CheckRequestKeyDTO, CheckRequestTimeDTO, StoreRequestKeyDTO } from '../../dtos/security/idempotent.dto';
import redis from '../../middleware/redis.mw';
import { computeKey } from '../../utils/cache.util';
import { IResult } from '../../utils/types.util'
import crypto from 'crypto'
import TransactionRepository from '../../repositories/transaction.repository';
import { cache } from 'ejs';
import CorporateMapper from '../../mappers/corporate.mapper';

class IdempotentService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name storeRequestKey
     * @param data 
     */
    public async storeRequestKey(data: StoreRequestKeyDTO): Promise<void> {

        const { key, payload, user, transaction } = data;

        // compute user data
        const userData = { _id: user._id, email: user.email }

        // compute cache data
        const cacheData = {
            key: computeKey(process.env.APP_ENV, key),
            value: { user: userData, payload: payload, transaction: transaction, key: key }
        }

        // store data
        await redis.keepData(cacheData, parseInt('120')); // expire in 30 minutes

    }

    /**
     * @name checkRequestKey
     * @param data 
     */
    public async checkRequestKey(data: CheckRequestKeyDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 403, data: null }
        const { key, payload, user } = data;

        const cached = await redis.fetchData(computeKey(process.env.APP_ENV, key));

        if (cached && cached.user.email === user.email) {

            if (cached.transaction) {

                result.error = true;
                result.code = 403;
                result.message = 'a request is already being processed';
                result.data = null;

            } else {

                result.error = true;
                result.code = 403;
                result.message = 'a request is already being processed';
                result.data = null;

            }

        }

        return result;

    }

    /**
     * @name checkRequestTime
     * @param data 
     * @returns 
     */
    public async checkRequestTime(data: CheckRequestTimeDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 403, data: null }
        const { payload, user, type } = data;

        if (type === 'payload-time') {

            const formatTime = formatISO(dateToday(Date.now()).ISO);

            const splt = formatTime.time.split(':');
            const spltConv = splt.map((x) => { return parseInt(x) }); // convert items to numbers

            const splitTime = `${splt[0]}:${splt[1]}`; // remove seconds
            const splitOneMin = `${splt[0]}:${leadingNum(spltConv[1] + 1)}`; // add 1 to the curr minute

            const datastring = JSON.stringify({ payload, user, time: splitTime }); // stringify data
            const signature = crypto.createHmac('sha512', user.email).update(datastring).digest('hex');

            const cached = await redis.fetchData(computeKey(process.env.APP_ENV, signature));

            if (cached) {

                if (user.email === cached.user.email) {

                    if (splitTime === cached.time) {
                        result.error = true;
                        result.message = `a request is currently being processed`;
                    } else if (splitTime === cached.nextMin) {
                        result.error = true;
                        result.message = `a request is currently being processed`;
                    }

                }

            } else {

                // compute user data
                const userData = { _id: user._id, email: user.email }

                // compute cache data
                const data = {
                    key: computeKey(process.env.APP_ENV, signature),
                    value: { payload, user: userData, time: splitTime, nextMin: splitOneMin }
                }

                // store data
                await redis.keepData(data, parseInt('1800')); // expire in 30 minutes

            }

        }

        if (type === 'user-time') {

            const formatTime = formatISO(dateToday(Date.now()).ISO);

            const splt = formatTime.time.split(':');
            const spltConv = splt.map((x) => { return parseInt(x) }); // convert items to numbers

            const splitTime = `${splt[0]}:${splt[1]}`; // remove seconds
            const splitOneMin = `${splt[0]}:${leadingNum(spltConv[1] + 1)}`; // add 1 to the curr minute

            // generate hash of user and time data
            const datastring = JSON.stringify({ user, time: splitTime }); // stringify data
            const signature = crypto.createHmac('sha512', user.email).update(datastring).digest('hex');

            const cached = await redis.fetchData(computeKey(process.env.APP_ENV, signature));

            if (cached) {

                if (user.email === cached.user.email) {

                    if (splitTime === cached.time) {
                        result.error = true;
                        result.message = `a request is currently being processed`;
                    } else if (splitTime === cached.nextMin) {
                        result.error = true;
                        result.message = `a request is currently being processed`;
                    }

                }

            } else {

                // compute user data
                const userData = { _id: user._id, email: user.email }

                // compute cache data
                const data = {
                    key: computeKey(process.env.APP_ENV, signature),
                    value: { payload, user: userData, time: splitTime, nextMin: splitOneMin }
                }

                // store data
                await redis.keepData(data, parseInt('1800')); // expire in 30 minutes

            }

        }

        return result;

    }

}

export default new IdempotentService();