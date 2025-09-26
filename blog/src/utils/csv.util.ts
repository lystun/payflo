import csv2j from 'csvtojson'

export const parseToJson = async (path: any) => {

    let result: any;

    const parsed = await csv2j().fromFile(path)

    if(parsed.length > 0){
        result = parsed;
    }else{
        result = [];
    }

    return result;

}