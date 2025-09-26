import { seedBanks, cacheBanks, createPlatformCodes, syncProvidersId } from './bank.seed';
import { seedCountry, cacheCountries } from './country.seed';
import { seedLanguages, cacheLanguages } from './language.seeder';
import { seedCoins, cacheCoins } from './coin.seeder';
import { seedTimezones, cacheTimezones } from './timezone.seed'
import { seedNetworks } from './network.seeder'

export const seedData = async () => {

    await seedCountry();
    await seedBanks();
    await seedLanguages();
    await seedCoins();
    await seedTimezones();
    await seedNetworks();

    // cache
    await cacheCountries('d');
    await cacheBanks('d');
    await cacheLanguages('d');
    await cacheCoins('d');
    await cacheTimezones('d')

}

export default seedData;