import { IDateToday, dateToday } from "@btffamily/vacepay";
import { LogRequestDTO } from "../dtos/system.dto";
import colors from 'colors'
import ENV from "./env.util";

class Logger{

    private today: IDateToday

    constructor(){
        this.today = dateToday(new Date());
    }

    public log(message: string, data?: LogRequestDTO){

        const dtb = `${this.today.year}/${this.today.month}/${this.today.day}: `;

        if(ENV.isDev() || ENV.isStaging()){

            if(data && data.type){
    
                if(data.type === 'info'){

                    console.log(colors.blue(message));

                    if(data && data.className){
                        console.log(`${data.className} - ${dtb}`)
                    }

                }
    
                if(data.type === 'warning'){

                    console.log(colors.yellow(message));

                    if(data && data.className){
                        console.log(`${data.className} - ${dtb}`)
                    }

                }
    
                if(data.type === 'error'){

                    console.log(colors.red(message));

                    if(data && data.className){
                        console.log(`${data.className} - ${dtb}`)
                    }

                }
    
                if(data.type === 'success'){

                    console.log(colors.green(message));

                    if(data && data.className){
                        console.log(`${data.className} - ${dtb}`)
                    }

                }
    
                if(data.type === 'any'){

                    console.log(colors.white(message));

                    if(data && data.className){
                        console.log(`${data.className} - ${dtb}`)
                    }

                }
    
            }else{
                console.log(message);
            }

        }


    }

}

export default new Logger();