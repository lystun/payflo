class ErrorResponse extends Error {

    public message: any;
    public statusCode: number = 0;
    public errors: Array<string> | Array<number> = []

    constructor(message: any, statusCode: number, errors: Array<string> | Array<number>){
        super(message)
        this.statusCode = statusCode;
        this.errors = errors;
    }

}

export default ErrorResponse;