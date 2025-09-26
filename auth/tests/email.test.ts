import request from 'supertest';
import app from '../src/config/app.config';
import { expect, describe, test } from '@jest/globals';

let authToken: string = '', userId: string = '', resp: any;

describe('Email Implementations', () => {

    // login test case
    test('logs in user successfully', async () => {

        const loginData = {
            email: 'hello@checkaam.com',
            password: '#_chkAdmin1@'
        }

        const resp = await request(app)
        .post('/api/identity/v1/auth/login')
        .set('Accept', 'application/json')
        .set('Content-Type',  'application/json')
        .set('lg',  'en')
        .set('ch',  'web')
        .send(loginData)
        .expect(200);

        authToken = resp.body.token.toString();
        userId = resp.body.data._id;

        expect(resp.body.token).toBeDefined();
        expect(resp.body.status).toEqual(200);

    });

    // send welcome email test case
    test('sends welcome email successfully', async () => {

        const data = {
            email: 'hello@checkaam.com',
            callbackUrl: 'store.checkaam.com'
        }

        const resp = await request(app)
        .post(`/api/identity/v1/emails/welcome/${userId}`)
        .set('Accept', 'application/json')
        .set('Content-Type',  'application/json')
        .set('lg',  'en')
        .set('ch',  'web')
        .send(data)
        .expect(200);

        expect(resp.body.error).toBe(false);
        expect(resp.body.message).toEqual("successful");

    });

    // send activate email test case
    // test('sends activation email successfully', async () => {

    //     const data = {
    //         email: 'hello@checkaam.com',
    //         callbackUrl: 'store.checkaam.com'
    //     }

    //     const loginData = {
    //         email: 'hello@checkaam.com',
    //         password: '#_chkAdmin1@'
    //     }

    //     const respAuth = await request(app)
    //     .post('/api/identity/v1/auth/login')
    //     .set('Accept', 'application/json')
    //     .set('Content-Type',  'application/json')
    //     .set('lg',  'en')
    //     .set('ch',  'web')
    //     .send(loginData)
    //     .expect(200);

    //     try {
            
    //         resp = await request(app)
    //         .post(`/api/identity/v1/emails/activate/${respAuth.body.data._id}`)
    //         .set('Accept', 'application/json')
    //         .set('Authorization',  `Bearer ${respAuth.body.token}`)
    //         .set('Content-Type',  'application/json')
    //         .set('lg',  'en')
    //         .set('ch',  'web')
    //         .send(data)
    //         .expect(200);

    //     } catch (err: any) {
    //         console.log(err);
    //     }

    //     expect(resp.body.error).toBe(false);
    //     expect(resp.body.message).toEqual("successful");

    // });

});