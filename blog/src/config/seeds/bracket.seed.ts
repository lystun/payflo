import fs from 'fs';
import colors from 'colors';

import Bracket from '../../models/Bracket.model';

// read in clouds.json files
const categories = JSON.parse(
    fs.readFileSync(`${__dirname.split('config')[0]}_data/brackets.json`, 'utf-8')
)

export const seedBrackets = async () => {
    try {
        // fetch all Category data in the table
        const c = await Bracket.find({});
        if(c && c.length > 0) return;

        const seed = await Bracket.create(categories)

        if(seed){
            console.log(colors.green.inverse('brackets seeded successfully.'));
        }

    } catch (err) {
        console.log(colors.red.inverse(`${err}`));
    }

}