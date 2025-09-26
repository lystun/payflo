import { parse } from 'dotenv';
import { CreateDeviceDTO } from '../dtos/device.dto';
import Device from '../models/Device.model';
import { IResult } from '../utils/types.util'
import userAgent from 'express-useragent';
import deviceDetector from 'node-device-detector';
import { dateToday } from '@btffamily/vacepay';

class DeviceService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name createDevice
     * @param data 
     * @returns 
     */
    public async createDevice(data: CreateDeviceDTO): Promise<IResult>{

        const detector = new deviceDetector({
			clientIndexes: true,
			deviceIndexes: true,
			deviceAliasCode: false,
		})

        let result: IResult = { error: false, message: '', code: 200, data: null };
        const { source, user } = data;

        const exist = await Device.findOne({ user: user._id, source: source });

        let agent = userAgent.parse(source);
        let parsed = detector.detect(source);

        if(exist){

            exist.version = agent.version;
            exist.isMobile = agent.isMobile;
            exist.isDesktop = agent.isDesktop;
            exist.os.version = parsed.os ? parsed.os.version : exist.os.version;
            exist.client.version = parsed.client ? parsed.client.version : exist.client.version;
            exist.login = dateToday(Date.now()).ISO;
            await exist.save();

            result.data = exist;

        }else{

            const device = await Device.create({
                platform: agent.platform,
                source: agent.source,
                isMobile: agent.isMobile,
                isDesktop: agent.isDesktop,
                browser: agent.browser,
                version: agent.version,
                os: {
                    name: parsed.os ? parsed.os.name : '',
                    platform: parsed.os ? parsed.os.platform : '',
                    shortName: parsed.os ? parsed.os.short_name : '',
                    version: parsed.os ? parsed.os.version : '',
                },
                client: {
                    name: parsed.client ? parsed.client.name : '',
                    shortName: parsed.client ? parsed.client.short_name : '',
                    type: parsed.client ? parsed.client.type : '',
                    version: parsed.client ? parsed.client.version : '',
                },
                details: {
                    id: parsed.device ? parsed.device.id : '',
                    brand: parsed.device ? parsed.device.brand : '',
                    code: parsed.device ? parsed.device.code : '',
                    model: parsed.device ? parsed.device.model : '',
                    type: parsed.device ? parsed.device.type : '',
                },
                user: user._id,
                login: dateToday(Date.now()).ISO
            });

            user.devices.push(device._id);
            await user.save();

            result.data = device;

        }

        return result;

    }

}

export default new DeviceService();