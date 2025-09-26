import { arrayIncludes, dateToday, isString } from '@btffamily/vacepay';
import { credentials, deleteGcFile, uploadBase64File } from '../utils/google.util'
import { IFileUpload, IResult, IUploadProgress } from '../utils/types.util'
import { Storage, File, CreateWriteStreamOptions } from '@google-cloud/storage'
import { EventEmitter } from 'node:events'
import fs, { createReadStream, createWriteStream } from 'node:fs'
import { PassThrough, Transform, Duplex } from 'node:stream'
import SystemService from './system.service';
import { computeKey } from '../utils/cache.util';
import REDIS from '../middleware/redis.mw';
import EventService from './event.service';
import { IBufferToGCSDTO, ICombineToGCSDTO } from '../dtos/storage.dto';

class StorageService extends EventEmitter {

    public result: IResult;
    public _event: EventEmitter;

    constructor () {

        super()

        this.result = { error: false, message: '', data: null }
        this._event = new EventEmitter();
        this.setMaxListeners(80000); // se event max listeners
    }

    public async uploadGcpFile(data: any, filename: string, type: string = 'base64'): Promise<IResult> {

        const allowed = ['base64', 'filedata'];

        // crash the app if proper type is not set
        if(!arrayIncludes(allowed, type)){
            this.result.error = true;
            this.result.message = 'upload data type is invalid';
            this.result.data = null;
        }

        if(type === 'base64'){

            if(!isString(data)){

                this.result.error = true;
                this.result.message = 'data must be a string';
                this.result.data = null;

                return this.result;

            } 
            
            const mime = data.split(';base64')[0].split(':')[1];

            if(!mime || mime === '') {

                this.result.error = true;
                this.result.message = 'data is is expected to be base64 string'
                this.result.data = null;

                return this.result;
            }

            // upload file
            const fileData = {
                file: data,
                filename: `${filename}`,
                mimeType: mime
            }

            const gData = await uploadBase64File(fileData);

            this.result.error = false;
            this.result.message = ''
            this.result.data = gData;

        }

        return this.result;

    }

    /**
     * 
     * @param filename 
     * @returns 
     */
     public async deleteGcpFile(filename: string): Promise<IResult>{

        if(filename === ''){
            this.result.error = true;
            this.result.message = 'file name is required for file deletion'
        }else{

            await deleteGcFile(filename);

        }

        return this.result;

    }

    /**
     * @name getCredentitals
     * @returns bucketName, key, storage{class}
     */
    public async getCredentitals(): Promise<{ bucketName: string, key: string, storage: Storage }>{
        return credentials()
    }

    /**
     * 
     * @param id 
     * @param data 
     */
    private cacheProgress(id: string, data: IUploadProgress): void{

        const progress = {
            key: computeKey(process.env.NODE_ENV, `${id}`),
            value: { data: data }
        }

        REDIS.keepData(progress, parseInt('540000')) // expires in 150 hours

    }

    /**
     * @name bufferFileToGCS
     * @description Upload {stream} local file to GCS
     * @param file 
     * @param options 
     * @returns 
     */
    public async bufferFileToGCS(file: IFileUpload, options: IBufferToGCSDTO): Promise<{ publicUrl: string, metadata: any }>{

        const eventManager = new EventService(); // generate new event

        const allowed = ['pdf','zip', 'video', 'audio'];

        let result: { publicUrl: string, metadata: any } = { publicUrl: '', metadata: null }
        let testChunk: number = 0, consumedChunk: number = 0, sizeConsumed: number = 0, percentageConsumed: number = 0;
        const { resource } = options

        if(fs.existsSync(file.path) && arrayIncludes(allowed, options.type)){

            let bufferArray: Array<Buffer> = [];

            const { bucketName, storage } = await this.getCredentitals();
            const [bucketExist] = await storage.bucket(bucketName).exists();

            if(!bucketExist){
                await storage.createBucket(bucketName);
            }

            // create {cloud} file referance
		    const bucketFile = storage.bucket(bucketName).file(options.filename);

            // create the stream
            const progress = new PassThrough();
            const duplex = Duplex.from({
                readable: createReadStream(file.path)
            })

            /*
                Report upload progress.
                This is handled using the {PassThrough} stream.
                Calculates percentage uploaded {on-demand} and
                sends data to client using node EventEmitter.
            */
            progress.on('data', async (chunk) => {

                consumedChunk = consumedChunk + parseInt(chunk.length);
                sizeConsumed = (consumedChunk / 1e6);

                percentageConsumed = (sizeConsumed / file.parsedSize) * 100;

                if(process.env.NODE_ENV === 'development'){
                    console.log(`progress: ${percentageConsumed.toFixed(2)}%`);
                }

                const up: IUploadProgress = {
                    id: resource._id,
                    progress: percentageConsumed,
                    consumed: sizeConsumed,
                    size: file.parsedSize,
                    completed: false
                }

                // save progress to cache
                this.cacheProgress(resource._id, up);
                
                // emit event
                this.emit(`${options.eventKey}`, up)

            })

            /*
                {_transform} is a Transform stream that 
                captures all the buffer of the video uploaded and 
                store them in an array
            */
            const _transform = new Transform({

                transform(chunk, enc, callback){

                    const buffer = Buffer.from(chunk);
                    bufferArray.push(buffer);
                    testChunk = chunk.length;
                    callback(null, chunk)

                }

            })

            duplex
            .pipe(_transform)
            .pipe(progress)
            .on('finish', async () => {

                // {GCS} bucket file options
                const bucketOptions = {
                    metadata:{
                        contentType: file.mime,
                        cacheControl: 'no-cache'
                    },
                    public: true,
                    resumable: false,
                    validation: false
                }

                // get all buffers captured.
			    const buffer = Buffer.concat(bufferArray);

                // upload to {GCS} using bucket file created
                bucketFile.createWriteStream(bucketOptions)
                .on('finish', async () => {

                    // delete the temporary file
                    await SystemService.unlinkFile('file',file.path);

                    // create public url
                    const publicUrl = `https://storage.googleapis.com/${bucketName}/${options.filename}`;
                    result.publicUrl = bucketFile.publicUrl();

                    // get metadata
                    const [metadata] = await bucketFile.getMetadata();
                    result.metadata = metadata;

                    // report progress
                    const up: IUploadProgress = {
                        id: resource._id,
                        progress: percentageConsumed,
                        consumed: sizeConsumed,
                        size: file.parsedSize,
                        completed: true
                    }

                    // save progress to cache
                    this.cacheProgress(resource._id, up);

                    // trigger event that will create notification for {DONE}
                    eventManager.emit(`${options.eventKey}`, up)
        
                    // emit event
                    this.emit(`${options.eventKey}`, up)


                }).end(buffer);

            })

            // listen to even triggered for {DONE}
            eventManager.on(`${options.eventKey}`, (data) => {
                // create notification here
            })

        }

        return result;

    }

    /**
     * @name bufferStreamToGCS
     * @description Upload file ( as Buffer ) to GCS
     * @param file 
     * @param options 
     * @returns 
     */
    public async bufferStreamToGCS(file: IFileUpload, options: IBufferToGCSDTO): Promise<{ publicUrl: string, metadata: any }>{

        const eventManager = new EventService(); // generate new event

        const allowed = ['pdf','zip', 'video', 'audio'];

        let result: { publicUrl: string, metadata: any } = { publicUrl: '', metadata: null }
        let consumedChunk: number = 0, sizeConsumed: number = 0, percentageConsumed: number = 0;
        const { resource } = options

        if(arrayIncludes(allowed, options.type)){

            let buffer = Buffer.from(file.data)
            let bufferArray: Array<Buffer> = [];

            const { bucketName, storage } = await this.getCredentitals();
            const [bucketExist] = await storage.bucket(bucketName).exists();

            if(!bucketExist){
                await storage.createBucket(bucketName);
            }

            // create {cloud} file referance
		    const bucketFile = storage.bucket(bucketName).file(options.filename);

            // create the stream
            const progress = new PassThrough();
            const duplex = Duplex.from({
                readable: buffer // pass the buffer here
            })

            /*
                Report upload progress.
                This is handled using the {PassThrough} stream.
                Calculates percentage uploaded {on-demand} and
                sends data to client using node EventEmitter.
            */
            progress.on('data', async (chunk) => {

                consumedChunk = consumedChunk + parseInt(chunk.length);
                sizeConsumed = (consumedChunk / 1e6);

                percentageConsumed = (sizeConsumed / file.parsedSize) * 100;

                if(process.env.NODE_ENV === 'development'){
                    console.log(`progress: ${percentageConsumed.toFixed(2)}%`);
                }

                const up: IUploadProgress = {
                    id: resource._id,
                    progress: percentageConsumed,
                    consumed: sizeConsumed,
                    size: file.parsedSize,
                    completed: false
                }

                // save progress to cache
                this.cacheProgress(resource._id, up);
                
                // emit event
                this.emit(`${options.eventKey}`, up);

            })

            /*
                {_transform} is a Transform stream that 
                captures all the buffer of the video uploaded and 
                store them in an array
            */
            const _transform = new Transform({

                transform(chunk, enc, callback){

                    const buffer = Buffer.from(chunk);
                    bufferArray.push(buffer);
                    callback(null, chunk)

                }

            })

            duplex
            .pipe(_transform)
            .pipe(progress)
            .on('end', async () => {

                // {GCS} bucket file options
                const bucketOptions = {
                    metadata:{
                        contentType: file.mime,
                        cacheControl: 'no-cache'
                    },
                    public: true,
                    resumable: false,
                    validation: false
                }

                // get all buffers captured.
			    const allBuffers = Buffer.concat(bufferArray);

                // upload to {GCS} using bucket file created
                bucketFile.createWriteStream(bucketOptions)
                .on('finish', async () => {

                    // delete the temporary file
                    await SystemService.unlinkFile('file',file.path);

                    // create public url
                    result.publicUrl = bucketFile.publicUrl();

                    // get metadata
                    const [metadata] = await bucketFile.getMetadata();
                    result.metadata = metadata;

                    // report progress
                    const up: IUploadProgress = {
                        id: resource._id,
                        progress: percentageConsumed,
                        consumed: sizeConsumed,
                        size: file.parsedSize,
                        completed: true
                    }

                    // save progress to cache
                    this.cacheProgress(resource._id, up);

                    // trigger event that will create notification for {DONE}
                    eventManager.emit(`${options.eventKey}`, up)
        
                    // emit event
                    this.emit(`${options.eventKey}`, up);

                }).end(allBuffers);

            })

            // listen to even triggered for {DONE}
            eventManager.on(`${options.eventKey}`, (data) => {
                /*
                    Create notification here.
                    use NATS to communicate through to Auth service
                */
            })

        }

        return result;

    }

    /**
     * @name bufferPartsToGCS
     * @description Upload file PARTS ( as Buffer ) to GCS. This usually would involve running another function to combine all parts on GCS
     * @see 
     * @param file 
     * @param options 
     * @returns 
     */
    public async bufferPartsToGCS(file: IFileUpload, options: IBufferToGCSDTO): Promise<{ publicUrl: string, metadata: any }>{

        const eventManager = new EventService(); // generate new event

        const allowed = ['pdf','zip', 'video', 'audio'];

        let result: { publicUrl: string, metadata: any } = { publicUrl: '', metadata: null }
        const { resource } = options;


        if(arrayIncludes(allowed, options.type)){

            const { bucketName, storage } = await this.getCredentitals();
            const [bucketExist] = await storage.bucket(bucketName).exists();

            if(!bucketExist){
                await storage.createBucket(bucketName);
            }

            // create {cloud} file referance
            const bucketFile = storage.bucket(bucketName).file(options.filename);

            let buffer = Buffer.from(file.data)
            let bufferArray: Array<Buffer> = [buffer];

            // {GCS} bucket file options
            const bucketOptions: CreateWriteStreamOptions = {
                metadata:{
                    contentType: file.mime,
                    cacheControl: 'no-cache'
                },
                public: true,
                resumable: false,
                validation: false
            }

            // get all buffers captured.
            const allBuffers = Buffer.concat(bufferArray);

            // upload to {GCS} using bucket file created
            bucketFile.createWriteStream(bucketOptions)
            .on('finish', async () => {

                // delete the temporary file
                await SystemService.unlinkFile('file', file.path);

                result.publicUrl = bucketFile.publicUrl();

                // get metadata
                const [metadata] = await bucketFile.getMetadata();
                result.metadata = metadata;

                // save url to resource {asset}
                // if(options.resourceType === 'asset'){

                //     const asset: IAssetFile = resource.file;

                //     asset.name = options.filename,
                //     asset.originalName = file.name.split(' ').join('_'),
                //     asset.size = file.size,
                //     asset.sizeMB = file.parsedSize,
                //     asset.mime = file.mime;
                //     asset.partInc = resource.file.partInc + 1;
                //     asset.parts.push(bucketFile.publicUrl());
                //     asset.duration = file.dur;

                //     resource.file = asset;
                //     await resource.save();

                // }

                // if(options.resourceType === 'lesson' && options.type === 'video'){

                //     const gen = SystemService.UIID(1);
                //     let video: ILessonVideo = resource.video;

                //     video.label = resource.video.label === '' ? `VID${gen.toString()}` : resource.video.label;
                //     video.url = '';
                //     video.size = file.size;
                //     video.sizeMB = file.parsedSize;
                //     video.name = file.name;
                //     video.dur = file.dur;
                //     video.partInc = resource.video.partInc + 1;
                //     video.parts.push(bucketFile.publicUrl());

                //     resource.video = video;
                //     await resource.save();

                // }

                // if(options.resourceType === 'lesson' && options.type === 'audio'){

                //     const gen = SystemService.UIID(1);
                //     let audio: ILessonAudio = resource.audio;

                //     audio.label = resource.audio.label === '' ? `AUD${gen.toString()}` : resource.audio.label;
                //     audio.url = '';
                //     audio.size = file.size;
                //     audio.sizeMB = file.parsedSize;
                //     audio.name = file.name;
                //     audio.dur = file.dur;
                //     audio.partInc = resource.audio.partInc + 1;
                //     audio.parts.push(bucketFile.publicUrl());

                //     resource.audio = audio;
                //     await resource.save();

                // }

                // trigger event that will create notification for {DONE}
                eventManager.emit(`${options.eventKey}`, resource)
    
                // emit event
                this.emit(`${options.eventKey}`, resource);

            }).end(allBuffers);

            // listen to even triggered for {DONE}
            eventManager.on(`${options.eventKey}`, (data) => {
                // console.log(`uploaded ${options.resourceType} ${resource.code}`);
            })

        }

        return result;

    }

    /**
     * @name combineBufferToGCS
     * @description Combine already uploaded file PARTS in GCS to a single file and convert to the right file type.
     * @param parts 
     * @param options 
     * @returns 
     */
    public async combineBufferToGCS(parts: Array<string>, options: ICombineToGCSDTO): Promise<{ publicUrl: string, metadata: any }>{

        const eventManager = new EventService(); // generate new event

        const allowed = ['pdf','zip', 'video', 'audio'];

        let result: { publicUrl: string, metadata: any } = { publicUrl: '', metadata: null }
        const { resource } = options;


        if(arrayIncludes(allowed, options.type)){

            let bufferArray: Array<Buffer> = [];

            const { bucketName, storage } = await this.getCredentitals();
            const [bucketExist] = await storage.bucket(bucketName).exists();

            if(!bucketExist){
                await storage.createBucket(bucketName);
            }

            // create {cloud} file referance
            const bucket = storage.bucket(bucketName);
            const bucketFile = storage.bucket(bucketName).file(options.filename);
            const combinedFile = storage.bucket(bucketName).file(`${options.type}_comb_${resource.code}`);
            const sources = await this.getPartFilenames(parts);

            // get the file names

            bucket.combine(sources, combinedFile)
            .then(async (resp) => {

                const newBucketFile: File = resp[0];
                const apiResponse = resp[1];

                /*
                    Report upload progress.
                    This is handled using the {PassThrough} stream.
                    Calculates percentage uploaded {on-demand} and
                    also helps stream trigger {end} event
                */
                const progress = new PassThrough();
                progress.on('data', async (chunk) => {
                    let newBuffer = Buffer.from(chunk)
                })
    
                /*
                    {_transform} is a Transform stream that 
                    captures all the buffer of the video uploaded and 
                    store them in an array
                */
                const _transform = new Transform({
    
                    transform(chunk, enc, callback){
                        const buffer = Buffer.from(chunk);
                        bufferArray.push(buffer);
                        callback(null, chunk)
    
                    }
    
                })
    
                newBucketFile.createReadStream()
                .pipe(_transform)
                .pipe(progress)
                .on('end', async () => {
    
                    // console.log('started final upload')
    
                    // {GCS} bucket file options
                    const bucketOptions = {
                        metadata:{
                            contentType: options.mimetype,
                            cacheControl: 'no-cache'
                        },
                        public: true,
                        resumable: false,
                        validation: false
                    }
    
                    const allBuffers = Buffer.concat(bufferArray); // get all buffers from {_transform}
    
                    bucketFile.createWriteStream(bucketOptions)
                    .on('finish', async() => {

                        // save resources data
                        // if(options.resourceType === 'asset'){

                        //     resource.url = bucketFile.publicUrl()
                        //     resource.file.name = options.filename;
                        //     resource.file.partInc = 0;
                        //     resource.file.parts = [];
                        //     resource.file.mime = options.mimetype;
                        //     resource.file.uploadedAt = dateToday().ISO;
                        //     await resource.save()

                        // }
    
                        // if(options.resourceType === 'lesson' && options.type === 'video'){

                        //     resource.video.url = bucketFile.publicUrl();
                        //     resource.video.partInc = 0;
                        //     resource.video.parts = [];
                        //     resource.video.uploadedAt = dateToday().ISO;
                        //     await resource.save();

                        // }

                        // if(options.resourceType === 'lesson' && options.type === 'audio'){

                        //     resource.audio.url = bucketFile.publicUrl();
                        //     resource.audio.partInc = 0;
                        //     resource.audio.parts = [];
                        //     resource.video.uploadedAt = dateToday().ISO;
                        //     await resource.save();

                        // }

                        result.publicUrl = bucketFile.publicUrl();
                        result.metadata = await bucketFile.getMetadata();

                        // delete all {chunk} PARTS
                        await this.deleteFileParts(parts);

                        // delete the SINGLE combined file
                        await this.deleteGcpFile(`${options.type}_comb_${resource.code}`);
    
                        // emit event
                        this.emit(`${options.eventKey}`, resource);
    
                    }).end(allBuffers)
    
    
                })
    
                // listen to even triggered for {DONE}
                eventManager.on(options.eventKey, (data) => {
    
                    /*
                        Create notification here.
                        use NATS to communicate through to Auth service
                    */
    
                    console.log(`uploaded ${options.resourceType} ${resource.code} done`);
    
                })


            })

        }

        return result;

    }

    /**
     * @name deleteFileParts
     * @param parts 
     */
    private async deleteFileParts(parts: Array<string>): Promise<void>{

        const sources = await this.getPartFilenames(parts);

        if(sources.length > 0){

            for(let i = 0; i < sources.length; i++){
                await this.deleteGcpFile(sources[i]);
            }

        }

    }

    /**
     * @name getPartFilenames
     * @param parts 
     * @returns 
     */
    private async getPartFilenames(parts: Array<string>): Promise<Array<string>> {

        let temp: Array<string> = [];
    
        parts.forEach((x) => {
            const split = x.split('/');
            temp.push(split[split.length - 1]);
        })
    
        return temp;
    
    }

}

export default new StorageService();