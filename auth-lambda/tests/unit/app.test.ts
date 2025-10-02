import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { lambdaHandler } from '../../app';

jest.mock('@aws-sdk/client-cognito-identity-provider');
jest.mock('../../src/repositories/cognitoRepository');
jest.mock('../../src/services/userService');
jest.mock('../../src/handlers/registerHandler');
jest.mock('../../src/handlers/loginHandler');

describe('Lambda Handler', () => {
    const mockEvent: APIGatewayProxyEventV2 = {
        version: '2.0',
        routeKey: 'POST /login',
        rawPath: '/login',
        rawQueryString: '',
        headers: {},
        body: '',
        isBase64Encoded: false,
        requestContext: {
            accountId: '123456789012',
            apiId: '1234',
            stage: 'test',
            requestId: 'test-request-id',
            routeKey: 'POST /login',
            domainName: 'test.execute-api.us-east-1.amazonaws.com',
            domainPrefix: 'test',
            time: '09/Apr/2015:12:34:56 +0000',
            timeEpoch: 1428582896000,
            http: {
                method: 'POST',
                path: '/login',
                protocol: 'HTTP/1.1',
                sourceIp: '127.0.0.1',
                userAgent: 'Custom User Agent String',
            },
        },
    };

    beforeEach(() => {
        process.env.USER_POOL_ID = 'test-pool-id';
        process.env.CLIENT_ID = 'test-client-id';
        process.env.USER_PASSWORD = 'TestPassword123!';
    });

    afterEach(() => {
        delete process.env.USER_POOL_ID;
        delete process.env.CLIENT_ID;
        delete process.env.USER_PASSWORD;
    });

    it('should return 500 when USER_POOL_ID is missing', async () => {
        delete process.env.USER_POOL_ID;

        const event = {
            ...mockEvent,
            body: JSON.stringify({ name: 'Test User' }),
        };

        const result = (await lambdaHandler(event)) as { statusCode: number; body: string };

        expect(result.statusCode).toBe(500);
    });

    it('should return 500 when CLIENT_ID is missing', async () => {
        delete process.env.CLIENT_ID;

        const event = {
            ...mockEvent,
            body: JSON.stringify({ name: 'Test User' }),
        };

        const result = (await lambdaHandler(event)) as { statusCode: number; body: string };

        expect(result.statusCode).toBe(500);
    });

    it('should return 400 when name is missing for anonymous user', async () => {
        const event = {
            ...mockEvent,
            body: JSON.stringify({}),
        };

        const result = (await lambdaHandler(event)) as { statusCode: number; body: string };

        expect(result.statusCode).toBe(400);
    });

    it('should return 500 for invalid JSON', async () => {
        const event = {
            ...mockEvent,
            body: 'invalid json',
        };

        const result = (await lambdaHandler(event)) as { statusCode: number; body: string };

        expect(result.statusCode).toBe(500);
    });

    it('should return 200 for valid authenticated user', async () => {
        const event = {
            ...mockEvent,
            body: JSON.stringify({
                cpf: '12345678901',
                name: 'João Silva',
                mail: 'joao@example.com',
            }),
        };

        const result = (await lambdaHandler(event)) as { statusCode: number; body: string };

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.tokens).toBeDefined();
    });

    it('should return 200 for valid anonymous user', async () => {
        const event = {
            ...mockEvent,
            body: JSON.stringify({
                name: 'Anonymous User',
            }),
        };

        const result = (await lambdaHandler(event)) as { statusCode: number; body: string };

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.tokens).toBeDefined();
    });
});
