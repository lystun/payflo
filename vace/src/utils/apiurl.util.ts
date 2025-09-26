class APIUrl {

    constructor(){}

    public stagingWeb = process.env.STAGING_WEB_APP_URL || 'https://staging-web.vacepay.com';
    public stagingAdmin = process.env.ADMIN_APP_URL || 'https://staging-manage.vacepay.com';

}

export default new APIUrl();