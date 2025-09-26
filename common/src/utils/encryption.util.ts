import { isObject } from './functions.util';
import crypto, { createCipheriv, createDecipheriv, Hash } from 'crypto';

interface IResult{
    error: boolean, 
    message: string, 
    code?: number, 
    vector: string,
    data: any
}

class Encryption {

    constructor(){}

    /**
     * @name getAlgorithm
     * @description Get encryption/decryption algorithm 
     * @param type 
     * @returns {string} see string
     */
    public getAlgorithm(type?: string){

        if(type){
            return type
        }else{
            return 'aes-256-cbc'
        }
    }

    /**
     * @name deriveKeyFromPassword
     * @description Derive 256 bit encryption key from password, using salt and iterations -> 32 bytes
     * @param password 
     * @param salt 
     * @param iterations 
     * @returns 
     */
    public deriveKeyFromPassword(password: string): string{
        let key = crypto.createHash('sha512').update(password).digest('hex').substring(0, 32);
        return key;
    }

    /**
     * @name encryptAESGCM
     * @description Encrypt data using AES-GCM algorithm with preferred password
     * @param data 
     * @param password 
     * @returns {IResult} see IResult
     */
    public encryptAESGCM(data: any, password: string): IResult {

        let result: IResult = { error: false, message: '', code: 200, vector: '', data: null }

        try {
            
            if(isObject(data)){
                data = JSON.stringify(data);
            }
    
            let IV = crypto.randomBytes(16);

            let cipher = crypto.createCipheriv(this.getAlgorithm(), this.deriveKeyFromPassword(password), IV);
            let encrypted = cipher.update(data);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
    
            result = {
                error: false,
                message: 'encryption successful',
                vector: IV.toString('hex'),
                data: encrypted.toString('hex')
            }

        } catch (error) {

            console.log(error)

            result= {
                error: true,
                message: 'could not encrypt data',
                data: null,
                vector: ''
            }
            
        }

        return result;

    }

    /**
     * @name decryptAESGCM
     * @description Encrypt data using AES-GCM algorithm with encrypted password
     * @param cipher 
     * @param password 
     * @returns {IResult} see IResult
     */
    public decryptAESGCM(encrypted: any, vector: string, password: string): IResult{

        let result: IResult = { error: false, message: '', vector: '', code: 200, data: null }

        try {

            let IV = Buffer.from(vector, 'hex');
            let encryptedText = Buffer.from(encrypted, 'hex');
            let decipher = crypto.createDecipheriv(this.getAlgorithm(), this.deriveKeyFromPassword(password), IV);
            let decrypted = decipher.update(encryptedText);
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            result = {
                error: false,
                message: 'decryption successful',
                data: decrypted.toString(),
                vector: IV.toString('hex')
            }
            
        } catch (error) {

            console.log(error)

            result= {
                error: true,
                message: 'could not decrypt data',
                data: null,
                vector: ''
            }

        }

        return result;
    }

}

export default new Encryption()