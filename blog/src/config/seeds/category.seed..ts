import fs from 'fs';
import colors from 'colors';

import Category from '../../models/Category.model';

// read in clouds.json files
const categories = JSON.parse(
    fs.readFileSync(`${__dirname.split('config')[0]}_data/categories.json`, 'utf-8')
)

export const seedCategories = async () => {
    try {
        // fetch all Category data in the table
        const c = await Category.find({});
        if(c && c.length > 0) return;

        const seed = await Category.create(categories)

        if(seed){
            console.log(colors.green.inverse('categories seeded successfully.'));
        }

    } catch (err) {
        console.log(colors.red.inverse(`${err}`));
    }

}