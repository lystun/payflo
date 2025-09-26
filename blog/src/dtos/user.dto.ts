export interface DecodeAPIKeyDTO{
    apikey: string,
    type: 'secret' | 'public'
}