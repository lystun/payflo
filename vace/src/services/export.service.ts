import { IExportResult, IResult } from '../utils/types.util'
import * as csvParse from 'csv';
import appRootPath from 'app-root-path'
import fsExtra, { createWriteStream, writeFileSync, createReadStream } from 'fs-extra';
import { Random, strIncludes } from '@btffamily/vacepay';
import StorageService from './storage.service';
import { IExportToCSVDTO } from '../dtos/export.dto';

class ExportService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name exportToCSV
     * @param data 
     * @returns 
     */
    public async exportToCSV(data: IExportToCSVDTO): Promise<IExportResult> {

        let result: IExportResult = {
            filename: '',
            filepath: '',
            content: null,
            data: [],
            gcs: {
                publicUrl: ''
            }
        }
        const { content, deleteFile, upload } = data;

        // create the export path
        const filename = `export_${Random.randomNum(8)}.csv`
        const filepath = `${appRootPath.path}/src/_data/${filename}`;
        await fsExtra.writeFileSync(filepath, '');

        // create write stream
        const writeStream = createWriteStream(filepath);
        const stringifier = csvParse.stringify({ header: true });

        // add data to stringifier
        for (let i = 0; i < content.length; i++) {
            await stringifier.write(content[i]);
        }

        // write to stream and save to file
        await stringifier.pipe(writeStream);

        // upload file if upload is enabled
        if (upload.enabled) {

            if (upload.cloud === 'gcs') {

                const uploadFile = await StorageService.uploadGcpFile(filepath, `export_${Random.randomNum(8)}.csv`, 'csv');

                if (!uploadFile.error && uploadFile.data.publicUrl) {
                    result.gcs.publicUrl = uploadFile.data.publicUrl
                }

            }

        }

        // capture result data
        if (fsExtra.existsSync(filepath)) {
            result.filename = filename;
            result.filepath = filepath;
            result.data = content;
        }

        return result;

    }

    /**
     * @name readCSVFile
     * @param filepath 
     * @returns 
     */
    public async readCSVFile(filepath: string): Promise<Array<any>> {

        let csvData: Array<any> = [];

        if (fsExtra.existsSync(filepath)) {

            // read the file
            createReadStream(filepath)
                .pipe(csvParse.parse({ delimiter: ',', from_line: 1 }))
                .on('data', async (row) => {
                    await csvData.push(row); // capture the data on each row
                });

        }

        return csvData;

    }

    /**
     * @name arrayToCSV
     * @param data 
     * @returns 
     */
    public async arrayToCSV(data: Array<any>): Promise<string> {

        let result: string = '';
        let csvData: Array<any> = [];

        /* Get headers as every csv data format 
        has header (head means column name)
        so objects key is nothing but column name 
        for csv data using Object.key() function.
        We fetch key of object as column name for 
        csv */
        const headers = Object.keys(data[0]);

        // turn headers to uppercase
        const headersFormatted = headers.map((x) => {
            if(strIncludes(x.toString(), '_')){
                return x.split('_').join(' ').toUpperCase();
            }else {
                return x.toUpperCase()
            }
        });

        /* 
            Using push() method we push fetched 
           data into csvRows[] array 
        */
        csvData.push(headersFormatted.join(','));

        // Loop to get value of each objects key
        for (const row of data) {
            const values = headers.map(header => {
                const val = row[header]
                return `"${val}"`;
            });

            // To add, separator between each value
            csvData.push(values.join(','));
        }

        /* To add new line for each objects values
           and this return statement array csvRows
           to this function.*/
        result = csvData.join('\n');

        return result;

    }

}

export default new ExportService();