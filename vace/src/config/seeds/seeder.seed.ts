import { Request } from 'express'
import User from '../../models/User.model'
import colors from 'colors';

import { cacheUsers } from './user.seed'
import { seedProviders } from './provider.seed'
import { createVacepayBaniWallet, scriptTransaction } from './vace.seed'


export const seedData = async (): Promise<void> => {

    await seedProviders();
    await createVacepayBaniWallet();
    await scriptTransaction()

}
