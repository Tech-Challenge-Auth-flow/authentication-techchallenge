import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { lambdaHandler } from '../../app';

jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
    CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({
        send: jest.fn(),
    })),
    AdminGetUserCommand: jest.fn(),
    AdminCreateUserCommand: jest.fn(),
    AdminSetUserPasswordCommand: jest.fn(),
    AdminInitiateAuthCommand: jest.fn(),
}));

describe('Lambda Handler - Basic Tests', () => {
    const mockEvent = {
        version: '2.0',
        routeKey: 'POST /login',
        rawPath: '/login',
        rawQueryString: '',
        headers: {},
        body: '{}',
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

    it('should return error response when USER_POOL_ID is missing', async () => {
        delete process.env.USER_POOL_ID;

        const result = (await lambdaHandler(mockEvent)) as { statusCode: number; body: string };

        expect(result.statusCode).toBe(500);
    });

    it('should handle unknown route', async () => {
        const eventWithUnknownRoute = {
            ...mockEvent,
            requestContext: {
                ...mockEvent.requestContext,
                http: {
                    ...mockEvent.requestContext.http,
                    path: '/unknown',
                },
            },
        };

        const result = (await lambdaHandler(eventWithUnknownRoute)) as { statusCode: number; body: string };

        expect(result.statusCode).toBe(404);
    });
});
