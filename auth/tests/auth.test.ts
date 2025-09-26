import request from 'supertest';
import app from '../src/config/app.config';
import { expect, describe, test } from '@jest/globals';

let authToken: string = '';

describe('Auth :: Login', () => {

    // trigger admin login test case
    test('logs in superadmin successfully', async () => {

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

        expect(resp.body.token).toBeDefined();
        expect(resp.body.status).toEqual(200);

    });

    // admin login wrong email test case
    test('detects wrong email at login', async () => {

        const loginData = {
            email: 'admin@checkaam.com',
            password: '#_chkAdmin1@'
        }

        const resp = await request(app)
        .post('/api/identity/v1/auth/login')
        .set('Accept', 'application/json')
        .set('Content-Type',  'application/json')
        .set('lg',  'en')
        .set('ch',  'web')
        .send(loginData)
        .expect(403);

        expect(resp.body.errors.length).toEqual(1);

    });

    // admin login wrong password test case
    test('detects wrong password at login', async () => {

        const loginData = {
            email: 'hello@checkaam.com',
            password: '/_chkAdmin89'
        }

        const resp = await request(app)
        .post('/api/identity/v1/auth/login')
        .set('Accept', 'application/json')
        .set('Content-Type',  'application/json')
        .set('lg',  'en')
        .set('ch',  'web')
        .send(loginData)
        .expect(403);

        expect(resp.body.error).toBe(true);
        expect(resp.body.errors.length).toEqual(1);

    });

});