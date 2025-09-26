import { seedCategories } from './category.seed.';
import { seedBrackets } from './bracket.seed';
import { deleteCached } from './system.seed';
import { seedTags } from './tag.seed';

export const seedData = async (): Promise<void> => {

    await deleteCached()
    await seedCategories();
    await seedBrackets()
    await seedTags()

}