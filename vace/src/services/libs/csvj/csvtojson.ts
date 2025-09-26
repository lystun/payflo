import { Transform, Duplex, PassThrough, TransformCallback } from 'stream';
import fs, { createReadStream, createWriteStream } from 'fs';
import CsvTransform from './transform';
import { EventEmitter } from 'events'
import { IFileUpload } from '../../../utils/types.util';

interface ICsvOptions{
    delimiter: string,
    headers: Array<string>,
    to: string,
    size: number
}

const MILLI_SECOND = 1000;
const MINUTE = 60;


class CsvToJSON {

    public time: number;
    public startAt: any;
    public endAt: any;
    public parsed: Array<any>;

    private passthrough: PassThrough;
    private reporter: PassThrough;
    private event: EventEmitter;
    private consumed: number = 0;

    constructor(){
        this.time = 0;
        this.parsed = []

        this.passthrough = new PassThrough()
        this.reporter = new PassThrough()
        this.event = new EventEmitter()
    }

    /**
     * @name unlinkFile
     * @description delete the temp folder/file created while processing data
     * @param type 
     * @param path 
     * 
     * @returns {void} void
     */
    private async unlinkFile(type: string, path: string): Promise<void>{

        if(type === 'file' && fs.existsSync(path)){
            fs.rmSync(path);
        }

        if(type === 'folder' && fs.existsSync(path)){
            fs.rmSync(path, { recursive: true, force: true });
        }

    }

    private async delFolder(path:string): Promise<void>{
        
        const split = path.split('tmp');
        const folder = `${split[0]}tmp`
        await this.unlinkFile('folder', folder);

    }

    /**
     * @name createTempFile
     * @description create csv file on server and return path to file
     * @param file 
     * @param options
     * 
     * @returns {string} string
     */
    public async createTempFile(file: IFileUpload, options: { path: string }): Promise<string>{

        const time = new Date().getTime();
        let buffer = Buffer.from(file.data);

        if(!fs.existsSync(options.path)){
            fs.mkdirSync(options.path, { recursive: true })
        }

        let filepath = `${options.path}/tmp-${time}.csv`;
        fs.writeFileSync(filepath, buffer);

        return filepath;

    }

    /**
     * @name downloadFile
     * @description read csv file and write it to a local file on server
     * @param path 
     * @param name 
     * @param dest 
     * 
     * @returns {void} void
     */
    public async downloadFile(path: string, name: string, dest: string): Promise<void>{

        const duplex = Duplex.from({
            readable: createReadStream(path)
        })

        duplex
        .pipe(createWriteStream(`${dest}/${name}`))
        .on('finish', () => {

            const split = path.split('tmp');
            const folder = `${split[0]}tmp`
            this.unlinkFile('folder', folder)
            
        })

    }

    /**
     * @name fromFile
     * @description read csv file and transform the data into JSON
     * @param path 
     * @param options
     *  
     * @returns {any} Array<{}>
     */
    public async fromFile(path: string, options: Partial<ICsvOptions>): Promise<any>{

        if(!options.headers || options.headers.length <= 0){

            await this.delFolder(path)
            throw new Error('csv headers is required.')

        }

        const csvTransform = new CsvTransform({ delimiter: options.delimiter, headers: options.headers });

        const duplex = Duplex.from({
            readable: createReadStream(path)
        })

        /*
            Create NDJSON with transform
        */
        const processData = new Transform({

            transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback){

                /*
                    Append {..} to represent in a JSON
                    data format, then parse data into JSON
                */
                const chunkStr = `{${chunk.toString()}}`;

                const data = JSON.parse(chunkStr)
                const result = JSON.stringify({ ...data }).concat(',\n')

                return callback(null, result)

            }

        })

        /*
            parse the data with JSON and store in an 
            array at runtime. Return {this.parsed} in function.
        */
        this.passthrough.on('data', (chunk: any) => {

            /*
                Append {..} to represent in a JSON
                data format, then parse data into JSON
            */
            const chunkStr = `{${chunk.toString()}}`;

            const data = JSON.parse(chunkStr);
            this.parsed.push(data);

        })

        /*
            Reporter.
            Use the PassThrough stream to report progress
            by logging it to the console.
            TODO come back to this
        */
        this.reporter.on('data', (chunk: any) => {

            this.consumed = this.consumed + parseInt(chunk.length);
            const psize = (options.size || 0 / 1e6);
            const pconz = (this.consumed / 1e6);

            const per = (pconz / psize) * 100;

            console.log(`progress: ${per.toFixed(2)}%`)

        })

        this.startAt = Date.now();

        duplex
        .pipe(csvTransform)
        .pipe(this.passthrough)
        .pipe(processData)
        .pipe(createWriteStream(`${options.to && options.to !== '' ? options.to : './parsed.ndjson'}`))
        .on('finish', async () => {

            // delete tmp folder
            const split = path.split('tmp');
            const folder = `${split[0]}tmp`
            await this.unlinkFile('folder', folder);

            /*
                Output.
                Delete the parsed NDJSON file if the {to} field is not specified or empty
            */
            if(!options.to || (options.to && options.to === '')){
                await this.unlinkFile('file', './parsed.ndjson')
            }
            
            /*
                Event.
                Use the Node event emitter to get the parsed data
            */
            this.event.emit('JSONData', this.parsed)

            const secs: any = Math.round( (Date.now() - this.startAt) / MILLI_SECOND).toFixed(2);
            this.endAt = secs > MILLI_SECOND ? `${secs / MINUTE}m` : `${secs}s`;

            console.log(`csv parse took: ${this.endAt} and finished with success`);

        })

        /*
            return a new promise in order to access the 
            emitted data from EventEmitter.
        */
        return new Promise((resolve, reject) => {
                
            this.event.on('JSONData', (data: Array<any>) => {

                if(data && data.length > 0){
                    this.parsed = data;
                    resolve(data)
                }else{
                    reject()
                }

            });

        })

    }

}

export default new CsvToJSON()