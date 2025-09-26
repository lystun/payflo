import { Transform, TransformCallback } from 'stream';

interface ITransform{
    delimiter: string,
    headers: Array<string>
}

const BREAKLINE_SYMBOL = '\n';
const CARRIAGE_RETURN_SYMBOL = '\r';
const INDEX_NOT_FOUND = -1;

class CsvTransform extends Transform {

    public delimiter: string;
    public headers: Array<string>;
    private breakIndex: number;
    private buffer: Buffer;

    constructor(d: Partial<ITransform>){

        super()

        this.delimiter = d.delimiter ? d.delimiter : ',',
        this.headers = d.headers ? d.headers : [],
        this.breakIndex = 0;
        this.buffer = Buffer.alloc(0)

    }

    private * updateBuffer(chunk: any){

        let counter: number = 0;

        /*
            This ensures if we get a chunk that is not completed,
            and doesn't have a breakline, it will concat the previous buffer
        */
        this.buffer = Buffer.concat([this.buffer, chunk]);

        while(this.breakIndex !== INDEX_NOT_FOUND){

            this.breakIndex = this.buffer.indexOf(Buffer.from(BREAKLINE_SYMBOL))

            /*
                Break the loop if index is not found
            */
            if(this.breakIndex === INDEX_NOT_FOUND){ break; }

            const nextIndex = this.breakIndex + BREAKLINE_SYMBOL.length;
            const line = this.buffer.subarray(0, nextIndex)
            const lineData = line.toString();

            /*
                remove from the main buffer, the data we already
                processed.
            */
            this.buffer = this.buffer.subarray(nextIndex)

            /*
                If tis an empty line, ignore this line
            */
            if(lineData === BREAKLINE_SYMBOL){ continue; }

            const jsonLine = [];
            const headers = Array.from(this.headers);

            for(const item of lineData.split(this.delimiter)){

                const shift = headers.shift()
                const key = shift === undefined ? `field${counter+1}` : shift

                let value;
                
                if(item.includes('http://') || item.includes('https://')){
                    const u = new URL(item);
                    value = encodeURI(u.toString());
                }else{
                    value = item;
                }

                const val = value.replace(BREAKLINE_SYMBOL, "").replace(CARRIAGE_RETURN_SYMBOL,"");

                if(key === value){ break }

                jsonLine.push(`"${key}":"${val.toString()}"`)
            }

            if(!jsonLine.length){ continue; }

            const jsonData = jsonLine.join(`${this.delimiter}`)

            counter++;

            // yield Buffer.from('{'.concat(jsonData).concat('}').concat(BREAKLINE_SYMBOL));
            yield Buffer.from(jsonData.concat(BREAKLINE_SYMBOL));

        }

    }

    public _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
        
        for(const item of this.updateBuffer(chunk)){
            this.push(item)
        }
        callback()

    }

    public _final(callback: (error?: Error | null | undefined) => void): void {

        /*
            When it finishes processing,
            this.push(null) on the readable side.
            or .end()
        */

        if(!this.buffer.length) { 
            return callback() 
        }

        for(const item of this.updateBuffer(Buffer.from(BREAKLINE_SYMBOL))){
            this.push(item)
        }

        
        callback()
        
    }

}

export default CsvTransform;