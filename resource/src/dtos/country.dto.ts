export interface MappedCountryDTO{
    name: string;
    countryCode: string;
    code3: string;
    capital: string;
    region: string;
    subregion: string;
    currencyCode: string;
    currencyImage: string;
    phoneCode: string;
    flag: string;
    states: Array<{
        code: string,
        name: string
    }>;
    timezones: Array<{
        name: string,
        displayName: string,
        label: string,
        countries: Array<string>,
        utcOffset: number | string
        utcOffsetStr: number | string
    }>
    createdAt: string;
    updatedAt: string;

}