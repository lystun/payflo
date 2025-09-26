import { Request } from 'express'
import Role from '../../models/Role.model'
import User from '../../models/User.model'
import colors from 'colors';

import { seedRoles, cacheRoles } from './role.seed'
import { seedUsers } from './user.seed'
import { seedPermissions} from './permission.seed'
import { setupConfiguration } from './system.seed'
import UserService from '../../services/user.service';
import UserRepository from '../../repositories/user.repository';
import Permission from '../../models/Permission.model';
import { IUserPermission } from '../../utils/types.util';

// role functions
const attachSuperRole = async (): Promise<void> => {

    const superadmin = await UserRepository.findByEmailSelectKey(process.env.SUPERADMIN_EMAIL!);
    const role = await Role.findOne({ name: 'superadmin' });

    if (superadmin && role) {

        const _hasrole = await superadmin.hasRole('superadmin', superadmin.roles);

        if (!_hasrole) {

            superadmin.roles.push(role._id);
            await superadmin.save();

            // encrypt superadmin password
            await UserService.encryptUserPassword(superadmin, superadmin.savedPassword);

            console.log(colors.magenta.inverse('Superadmin role attached successfully'));

        }

        // generate API key
        if (superadmin.apiKey && (!superadmin.apiKey.secret && !superadmin.apiKey.token)) {
            await UserService.generateAPIKey(superadmin);
        }

        // seed permissions
        if(!superadmin.permissions || superadmin.permissions.length <= 0){

            let permitList: Array<IUserPermission> = []
            const permissions = await Permission.find({});

            if(permissions.length > 0){

                for(let i = 0; i < permissions.length; i++){

                    let permit = permissions[i];
                    let labels = permit.actions.map((x) => x.label)
                    permitList.push({
                        entity: permit.entity,
                        actions: labels
                    })

                }
                superadmin.permissions = permitList;
                await superadmin.save();
                console.log(colors.magenta.inverse('Superadmin permissions attached successfully'));

            }
        }


    }

}

export const seedData = async (): Promise<void> => {

    await seedRoles();
    await cacheRoles('d');
    await seedPermissions()
    await seedUsers();

    // attach superadmin role
    await attachSuperRole();

    // steup configuration
    await setupConfiguration();

}
