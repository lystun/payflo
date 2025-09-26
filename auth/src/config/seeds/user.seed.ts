import fs from 'fs'
import colors from 'colors'

import User from '../../models/User.model'
import UserService from '../../services/user.service'

// read in the JSON file
const users: Array<any> = JSON.parse(
    fs.readFileSync(`${__dirname.split('config')[0]}_data/users.json`, 'utf-8')
)

export const seedUsers = async (): Promise<void> => {

    try {

        let saved: number = 0;
        const usersCount = await User.countDocuments(); 

        if(usersCount <= 0){

            for(let i = 0; i < users.length; i++){

                let data = users[i];
                let user = await User.create(data);
                saved += 1;

            }

            if(saved > 0){
                console.log(colors.green.inverse('Users seeded successfully'))
            }

        };

        
        
    } catch (err) {

        console.log(colors.red.inverse(`${err}`))
        
    }

}