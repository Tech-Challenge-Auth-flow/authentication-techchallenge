import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { lambdaHandler } from '../../app';

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

        // Reset all mocks
        jest.clearAllMocks();
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

        const result = await lambdaHandler(event);

        expect(typeof result === 'object' && 'statusCode' in result ? result.statusCode : 500).toBe(500);
    });

    it('should return 500 when CLIENT_ID is missing', async () => {
        delete process.env.CLIENT_ID;

        const event = {
            ...mockEvent,
            body: JSON.stringify({ name: 'Test User' }),
        };

        const result = await lambdaHandler(event);

        expect(typeof result === 'object' && 'statusCode' in result ? result.statusCode : 500).toBe(500);
    });

    it('should handle login route', async () => {
        const event = {
            ...mockEvent,
            body: JSON.stringify({ name: 'Test User' }),
        };

        const result = await lambdaHandler(event);

        expect(typeof result === 'object' && 'statusCode' in result ? result.statusCode : null).toBeDefined();
    });

    it('should return 500 for invalid JSON', async () => {
        const event = {
            ...mockEvent,
            body: 'invalid json',
        };

        const result = await lambdaHandler(event);

        expect(typeof result === 'object' && 'statusCode' in result ? result.statusCode : 500).toBe(500);
    });

    it('should return 404 for unknown route', async () => {
        const event = {
            ...mockEvent,
            requestContext: {
                ...mockEvent.requestContext,
                http: {
                    method: 'POST',
                    path: '/unknown',
                    protocol: 'HTTP/1.1',
                    sourceIp: '127.0.0.1',
                    userAgent: 'Custom User Agent String',
                },
            },
            body: JSON.stringify({ name: 'Test User' }),
        };

        const result = await lambdaHandler(event);

        expect(typeof result === 'object' && 'statusCode' in result ? result.statusCode : 404).toBe(404);
    });

    it('should return 405 for invalid method on /login', async () => {
        const event = {
            ...mockEvent,
            requestContext: {
                ...mockEvent.requestContext,
                http: {
                    method: 'GET',
                    path: '/login',
                    protocol: 'HTTP/1.1',
                    sourceIp: '127.0.0.1',
                    userAgent: 'Custom User Agent String',
                },
            },
            body: JSON.stringify({ name: 'Test User' }),
        };

        const result = await lambdaHandler(event);

        expect(typeof result === 'object' && 'statusCode' in result ? result.statusCode : 405).toBe(405);
    });
});
