import ErrorResponse from "./error.util";

class ENV {

    constructor(){

        // if(!process.env.APP_ENV){
        //     throw new ErrorResponse('Env Error', 500, ['APP_ENV environment variable is not defined']);
        // }

        // if(!process.env.NODE_ENV){
        //     throw new ErrorResponse('Env Error', 500, ['NODE_ENV environment variable is not defined']);
        // }

        // if(!process.env.PORT){
        //     throw new ErrorResponse('Env Error', 500, ['PORT environment variable is not defined']);
        // }

    }

    /**
     * @name isStaging
     * @description determine if app is in staging mode
     * @returns {boolean} boolean
     */
    public isStaging(): boolean {
        let result: boolean = process.env.APP_ENV === 'staging' ? true :false;
        return result
    }

    /**
     * @name isProduction
     * @description determine if app is in production mode
     * @returns {boolean} boolean
     */
    public isProduction(): boolean {
        let result: boolean = process.env.APP_ENV === 'production' ? true :false;
        return result
    }

    /**
     * @name isDev
     * @description determine if app is in development mode
     * @returns {boolean} boolean
     */
    public isDev(): boolean {
        let result: boolean = process.env.APP_ENV === 'development' ? true :false;
        return result
    }

}

export default new ENV();