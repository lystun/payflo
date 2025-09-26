import { Response } from 'express';


class Notification{

    public response: Response;

    constructor(response: Response){

        if(!response){
            console.log(`notification response object is required`);
            process.exit();
        }

        this.response = response;

    }

    public async push(data: any): Promise<void>{
        
        const _data = `data: ${JSON.stringify(data)}\n\n`;
        this.response.write(_data);

        this.response.end();

    }

}


export default Notification;