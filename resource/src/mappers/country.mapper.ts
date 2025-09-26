import { MappedCountryDTO } from "../dtos/country.dto";
import { ICountryDoc, IResult } from "../utils/types.util";

class CountryMapper{

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name mapCountryStates
     * @param data 
     * @returns 
     */
    public async mapCountryStates(data: Array<any>): Promise<Array<{ code: string, name: string }>>{

        let result: Array<{ code: string, name: string }> = [];

        for(let i = 0; i < data.length; i++){

            let state = {
                code: data[i].code,
                name: data[i].name
            }

            result.push(state)

        }

        return result;

    }

    /**
     * @name mapCountryTimezones
     * @param data 
     * @returns 
     */
    public async mapCountryTimezones(data: Array<any>): Promise<Array<any>>{

        let result: Array<any> = [];

        for(let i = 0; i < data.length; i++){

            let timezone = {
                name: data[i].name,
                displayName: data[i].displayName,
                label: data[i].label,
                countries: data[i].countries,
                utcOffset: data[i].utcOffset,
                utcOffsetStr: data[i].utcOffsetStr
            }

            result.push(timezone)

        }

        return result;

    }

    /**
     * @name mapCountryData
     * @param data 
     * @returns 
     */
    public async mapCountryData(data: ICountryDoc): Promise<MappedCountryDTO>{

        let states = data.states && data.states.length > 0 ? await this.mapCountryStates(data.states) : [];
        let timezones = data.timezones && data.timezones.length > 0 ? await this.mapCountryTimezones(data.timezones) : [];

        let result: MappedCountryDTO = {
            name: data.name,
            countryCode: data.code2,
            code3: data.code3,
            capital: data.capital,
            region: data.region,
            subregion: data.subregion,
            currencyCode: data.currencyCode,
            currencyImage: data.currencyImage,
            phoneCode: data.phoneCode,
            flag: data.flag,
            states: states,
            timezones: timezones,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        }

        return result;

    }

    /**
     * @name mapCountryList
     * @param data 
     * @returns 
     */
    public async mapCountryList(data: Array<ICountryDoc>): Promise<Array<MappedCountryDTO>>{

        let result: Array<MappedCountryDTO> = [];

        for(let i = 0; i < data.length; i++){

            let country = data[i];
            let mapped = await this.mapCountryData(country);

            result.push(mapped);

        }

        return result;

    }

}

export default new CountryMapper()