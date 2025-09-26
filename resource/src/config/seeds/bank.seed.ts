import fs from 'fs';
import colors from 'colors';
import redis from '../../middleware/redis.mw'
import { CacheKeys, computeKey } from '../../utils/cache.util'
import { advanced } from '../../utils/result.util'

import Bank from '../../models/Bank.model';
import { Random } from '@btffamily/vacepay';
import { ProviderNameType } from '../../utils/enums.util';

// read in the seed file
const data: Array<any> = JSON.parse(
    fs.readFileSync(`${__dirname.split('config')[0]}_data/banks.json`, 'utf-8')
);

export const seedBanks = async () => {

    try {

        const rs = await Bank.find();
        if (rs && rs.length > 0) return;

        const seed = await Bank.create(data);

        if (seed) {
            console.log(colors.green.inverse('Banks seeded successfully.'));
        }

    } catch (err) {
        console.log(colors.red.inverse(`${err}`));
    }

}

export const syncProvidersId = async (): Promise<void> => {

    let count = 0;
    const banks = await Bank.find({});

    for(let i = 0; i < banks.length; i++){

        let bank = banks[i];

        let bani = bank.providers.find((x) => x.name === ProviderNameType.BANI);
        let baniI = bank.providers.findIndex((x) => x.name === ProviderNameType.BANI);

        if(bani && baniI >= 0){
            bani.id = 'NGSQGT';
            bani.production.list = 'NGSQGT';
            bank.providers.splice(baniI, 1, bani)
        }

        let paystack = bank.providers.find((x) => x.name === ProviderNameType.PAYSTACK);
        let paystackI = bank.providers.findIndex((x) => x.name === ProviderNameType.PAYSTACK);

        if(paystack && paystackI >= 0){
            paystack.id = paystack.bankCode ? paystack.bankCode : bank.code;
            bank.providers.splice(paystackI, 1, paystack)
        }

        let ninepsb = bank.providers.find((x) => x.name === ProviderNameType.NINEPSB);
        let ninepsbI = bank.providers.findIndex((x) => x.name === ProviderNameType.NINEPSB);

        if(ninepsb && ninepsbI >= 0){
            ninepsb.id = ninepsb.bankCode ? ninepsb.bankCode : bank.code;
            bank.providers.splice(ninepsbI, 1, ninepsb)
        }

        let netmfb = bank.providers.find((x) => x.name === ProviderNameType.NETMFB);
        let netmfbI = bank.providers.findIndex((x) => x.name === ProviderNameType.NETMFB);

        if(netmfb && netmfbI >= 0){
            netmfb.id = netmfb.bankCode ? netmfb.bankCode : bank.code;
            bank.providers.splice(netmfbI, 1, netmfb)
        }

        await bank.save()

    }

    if(count >= 0){
        await console.log("provider ids synced")
    }

}

export const createPlatformCodes = async (): Promise<void> => {

    let count = 0;
    const banks = await Bank.find({});

    for(let i = 0; i < banks.length; i++){

        let bank = banks[i];
        bank.platformCode = Random.randomNum(4);
        await bank.save();

        count += 1;

    }

    if(count >= 0){
        await console.log("platform codes created")
    }

}

export const cacheBanks = async (type: string = 'd'): Promise<void> => {

    if (type === 'd') {
        redis.deleteData(CacheKeys.Banks)
    }

    if (type === 'i') {

        try {

            const banks = await advanced(Bank, [], 'name', { query: { limit: 9999 } });

            if (banks && banks.data.length > 0) {

                // expires in 15 days
                // 1 day === 86400 seconds
                await redis.keepData({ key: computeKey(process.env.NODE_ENV, CacheKeys.Banks), value: { data: banks.data, pagination: banks.pagination } }, (20 * 86400));

            }

        } catch (err) {

            console.log(colors.red.inverse(`${err}`))

        }

    }




}