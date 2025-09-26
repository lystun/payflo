import { arrayIncludes } from '@btffamily/vacepay';
import { auth } from '@googleapis/calendar';
import { IDiscordCreds, IFacebookCreds, IGoogleCreds, IResult } from '../utils/types.util';
import Axios, { AxiosError, AxiosResponse } from 'axios';
import { PermissionType } from '../utils/enums.util';

const GOOGLE_SCOPES = "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

class AuthService {

    public result: IResult;
    private brand: string;
    private params: any;
    private authClient: any;
    private authUrl: any;

    constructor (type: string = 'google', url: string) {
        this.result = { error: false, message: '', data: null }
        this.brand = type;

        if(type === 'google'){

            if(!process.env.GOOGLE_OAUTH2_CLIENTID || !process.env.GOOGLE_OAUTH2_CLIENT_SECRET){
                throw new Error('GOOGLE_CLIENTID and/or GOOGLE_CLIENT_SECRET nust be defined as env variables')
            }

            this.authClient = new auth.OAuth2(
                process.env.GOOGLE_OAUTH2_CLIENTID,
                process.env.GOOGLE_OAUTH2_CLIENT_SECRET,
                url
            )

            this.params = {
                client_id: process.env.GOOGLE_OAUTH2_CLIENTID,
                redirect_uri: url,
                scope: GOOGLE_SCOPES,
                response_type: 'code',
                access_type: 'offline',
                prompt: 'consent'
            }

            // this.oauthurl = `https://accounts.google.com/o/oauth2/v2/auth?${JSON.stringify(this.params)}`
        }

        if(type === 'discord'){

            if(!process.env.DISCORD_OAUTH2_CLIENTID || !process.env.DISCORD_OAUTH2_CLIENT_SECRET){
                throw new Error('DISCORD_CLIENTID and/or DISCORD_CLIENT_SECRET nust be defined as env variables')
            }

            this.params = {
                client_id: process.env.DISCORD_OAUTH2_CLIENTID,
                client_secret: process.env.DISCORD_OAUTH2_CLIENT_SECRET,
                redirect_uri: url,
                scope: 'identify email',
                grant_type: 'authorization_code',
            }

        }

        if(type === 'facebook'){

            if(!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET){
                throw new Error('FACEBOOK_APP_ID and/or FACEBOOK_APP_SECRET nust be defined as env variables')
            }

            this.params = {
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                redirect_uri: url,
                scope: 'i'
            }

            // BACKEND: https://graph.facebook.com/v16.0/oauth/access_token
            // FRONTEND: https://graph.facebook.com/v16.0/oauth/access_token?

        }
    }


    /**
     * @name getAuthUrl
     * @returns 
     */
    public getAuthUrl(): string{

        let url: string = '';

        if(this.brand === 'google'){

            url = this.authClient.generateAuthUrl({
                response_type: 'code',
                access_type: 'offline',
                prompt: 'consent',
                scope: GOOGLE_SCOPES,
            })

        }

        return url;

    }

    /**
     * @name getGoogleCredentials
     * @param code 
     * @returns 
     */
    public async getGoogleCredentials(code: string): Promise<{ creds: IGoogleCreds, result: IResult }>{

        const creds: IGoogleCreds = {
            accessToken: '',
            refreshToken: '',
            tokenType: '',
            idToken: '',
            expiryDate: '',
            scope: ''
        }

        await this.authClient.getToken(code)
        .then((resp: any) => {

            const { access_token, refresh_token, token_type, id_token, expiry_date } = resp.tokens;
            
            creds.accessToken = access_token;
            creds.refreshToken = refresh_token;
            creds.tokenType = token_type;
            creds.idToken = id_token;
            creds.expiryDate = expiry_date;
            creds.scope = GOOGLE_SCOPES;

            this.result.error = false;

        }).catch((err: any) => {

            this.result.error = true;
            this.result.message = `could not get ${this.brand} credentials`,
            this.result.data = err.response.data;

        })

        return { creds: creds, result: this.result }

    }

    /**
     * @name getGoogleUserData
     * @param token 
     */
    public async getGoogleUserData(token: string): Promise<IResult>{

        if(token){

            const url = `https://www.googleapis.com/oauth2/v2/userinfo`;
            await Axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
            .then((resp: AxiosResponse) => {

                this.result.error = false;
                this.result.message = `successful`,
                this.result.data = resp.data;

                // sample resp = {
                //		id: "118131675562348919040",
                // 		email: "agbeleyeoluwatobi@gmail.com",
                // 		verified_email: true,
                // 		name: "Oluwatobi Agbeleye",
                //		given_name: "Oluwatobi",
                // 		family_name: "Agbeleye",
                // 		picture: "https://lh3.googleusercontent.com/a/AGNmyxaKzHF7igKLJx_IQVtOHooR_vc1oN_jZnpmEvJl=s96-c",
                // 		locale: "en"
                // }

            }).catch((err: AxiosError) => {

                this.result.error = true;
                this.result.message = `could not get ${this.brand} credentials`,
                this.result.data = err.response?.data;

            })

        } else {

            this.result.error = true;
            this.result.message = `invalid token`,
            this.result.data = null;

        }

        return this.result;
    }

    /**
     * @name getDiscordCredentials
     * @param code 
     * @returns 
     */
    public async getDiscordCredentials(code: string): Promise<{ creds: IDiscordCreds, result: IResult }>{

        const creds: IDiscordCreds = {
            accessToken: '',
            refreshToken: '',
            tokenType: '',
            expiryDate: '',
            scope: ''
        }

        await console.log(this.params.redirect_uri)

        const body = new URLSearchParams();
        body.append("client_id", process.env.DISCORD_OAUTH2_CLIENTID || '')
        body.append("client_secret", process.env.DISCORD_OAUTH2_CLIENT_SECRET || '')
        body.append("redirect_uri", this.params.redirect_uri)
        body.append("scope", 'identify email')
        body.append("grant_type", 'authorization_code')
        body.append("code", code)

        await Axios.post(`https://discord.com/api/oauth2/token`, body, { headers: { ContentType: 'application/x-www-form-urlencoded' } })
        .then((resp: AxiosResponse) => {

            const { access_token, refresh_token, token_type, expires_in } = resp.data;

            creds.accessToken = access_token;
            creds.refreshToken = refresh_token;
            creds.tokenType = token_type;
            creds.expiryDate = expires_in;
            creds.scope = 'identify email';

            this.result.error = false;

        }).catch((err: AxiosError) => {

            this.result.error = true;
            this.result.message = `could not get ${this.brand} credentials`,
            this.result.data = err.response?.data;

        })

        return { creds: creds, result: this.result }

    }

    /**
     * 
     * @param token 
     * @param type 
     * @returns 
     */
    public async getDiscordUserData(token: string, type: string): Promise<IResult>{

        if(token){

            const url = `https://discord.com/api/users/@me`;
            await Axios.get(url, { headers: { Authorization: `${type} ${token}` } })
            .then((resp: AxiosResponse) => {

                this.result.error = false;
                this.result.message = `successful`,
                this.result.data = resp.data;

                // {
                //     id: '925343910530777110',
                //     username: 'concreap',
                //     display_name: null,
                //     avatar: null,
                //     avatar_decoration: null,
                //     discriminator: '0678',
                //     public_flags: 0,
                //     flags: 0,
                //     banner: null,
                //     banner_color: null,
                //     accent_color: null,
                //     locale: 'en-GB',
                //     mfa_enabled: false,
                //     premium_type: 0,
                //     email: 'hello@concreap.com',
                //     verified: true
                //   }

            }).catch((err: AxiosError) => {

                this.result.error = true;
                this.result.message = `could not get ${this.brand} credentials`,
                this.result.data = err.response?.data;

            })

        } else {

            this.result.error = true;
            this.result.message = `invalid token`,
            this.result.data = null;

        }

        return this.result;
    }

    /**
     * @name getFacebookCredentials
     * @param code 
     * @returns 
     */
    public async getFacebookCredentials(code: string): Promise<{ creds: IFacebookCreds, result: IResult }>{

        const creds: IFacebookCreds = {
            accessToken: '',
            refreshToken: '',
            tokenType: '',
            expiryDate: '',
            scope: ''
        }

        const data = {
            client_id: this.params.client_id,
            client_secret: this.params.client_secret,
            redirect_uri: this.params.redirect_uri,
            scope: 'email public_profile',
            code: code
        }

        await Axios.get(`https://graph.facebook.com/v16.0/oauth/access_token`, { params: { ...data } })
        .then((resp: AxiosResponse) => {

            const { access_token, token_type, expires_in } = resp.data;

            creds.accessToken = access_token;
            creds.refreshToken = '';
            creds.tokenType = token_type;
            creds.expiryDate = expires_in;
            creds.scope = 'email public_profile';

            this.result.error = false;

        }).catch((err: AxiosError) => {

            this.result.error = true;
            this.result.message = `could not get ${this.brand} credentials`,
            this.result.data = err.response?.data;

        })

        return { creds: creds, result: this.result }

    }

    /**
     * @name getFacebookUserData
     * @param token 
     * @returns 
     */
    public async getFacebookUserData(token: string): Promise<IResult>{

        const fields = ['id', 'email', 'first_name', 'last_name', 'picture', 'name'];

        if(token){

            const url = `https://graph.facebook.com/me`;
            await Axios.get(url, { params: { fields: fields.join(','), access_token: token } })
            .then((resp: AxiosResponse) => {

                this.result.error = false;
                this.result.message = `successful`,
                this.result.data = resp.data;

                console.log(resp.data)

            }).catch((err: AxiosError) => {

                this.result.error = true;
                this.result.message = `could not get ${this.brand} credentials`,
                this.result.data = err.response?.data;

            })

        } else {

            this.result.error = true;
            this.result.message = `invalid token`,
            this.result.data = null;

        }

        return this.result;
    }

}

export default AuthService;