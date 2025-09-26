import fs from 'fs'
import colors from 'colors'
import { advanced } from '../../utils/result.util'
import { computeKey } from '../../utils/cache.util'
import redis from '../../middleware/redis.mw'

import Role from '../../models/Role.model'
import Permission from '../../models/Permission.model'
import { Random, enumToArray } from '@btffamily/vacepay'
import { PermissionType } from '../../utils/enums.util'
import AuthService from '../../services/auth.service'
import permissionService from '../../services/permission.service'

// read in the JSON file
const permissions: Array<any> = JSON.parse(
    fs.readFileSync(`${__dirname.split('config')[0]}_data/permissions.json`, 'utf-8')
)

export const seedPermissions = async (): Promise<void> => {

    const actions = enumToArray(PermissionType, 'values-only')
    .map((m) => { return { label: m, description: permissionService.describePermission(m) } });

    let seeded = 0;

    try {

        const permi = await Permission.countDocuments(); 
        
        if(permi <= 0){

            for(let i = 0; i < permissions.length; i++){

                let item = permissions[i];

                await Permission.create({
                    name: item.name,
                    code: Random.randomCode(8,true).toUpperCase(),
                    entity: item.entity,
                    actions: actions
                });

                seeded += 1;

            }

        }

        if(seeded > 0){
            console.log(colors.green.inverse('Permissions seeded successfully'))
        }
        
    } catch (err) {

        console.log(colors.red.inverse(`${err}`))
        
    }

}

export const cachePermissions = async (type: string = 'd') : Promise<void> => {


}