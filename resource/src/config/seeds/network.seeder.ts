import fs from 'fs';
import colors from 'colors';
import Network from '../../models/Network.model';

// read in the seed file
const data = JSON.parse(
	fs.readFileSync(`${__dirname.split('config')[0]}_data/networks.json`, 'utf-8')
);

export const seedNetworks = async () => {

    try {

        const rs = await Network.find();
        if (rs && rs.length > 0) return;

        const seed = await Network.create(data);

        if(seed){
            console.log(colors.green.inverse('Networks seeded successfully.'));
        }

    } catch (err) {
        console.log(colors.red.inverse(`${err}`));
    }

}