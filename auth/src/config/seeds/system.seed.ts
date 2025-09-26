import fs from 'fs'
import colors from 'colors'

import System from '../../models/System.model'

export const setupConfiguration = async (): Promise<void> => {

    try {

        const system = await System.findOne({ email: process.env.SUPERADMIN_EMAIL });

        if(!system){

            await System.create({
                notifications: {
                    sms: false,
                    email: true,
                    push: true
                },
                email: process.env.SUPERADMIN_EMAIL
            })
        }
        
    } catch (err) {

        console.log(colors.red.inverse(`${err}`))
        
    }

}