export interface BankProviderDTO{
    name: string,
    code: string | number,
    listCode?: string,
    bankName: string,
    bankId: string,
    providers: Array<any>
}