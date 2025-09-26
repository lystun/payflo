import fs from 'fs';
import colors from 'colors';

import Tag from '../../models/Tag.model';

// read in clouds.json files
const tags = JSON.parse(
    fs.readFileSync(`${__dirname.split('config')[0]}_data/tags.json`, 'utf-8')
)

export const seedTags = async () => {
    try {
        // fetch all Category data in the table
        const c = await Tag.find({});
        if(c && c.length > 0) return;

        const seed = await Tag.create(tags)

        if(seed){
            console.log(colors.green.inverse('tags seeded successfully.'));
        }

    } catch (err) {
        console.log(colors.red.inverse(`${err}`));
    }

}