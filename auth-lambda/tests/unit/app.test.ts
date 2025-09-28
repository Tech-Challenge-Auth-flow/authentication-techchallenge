import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { lambdaHandler } from '../../app';

jest.mock('@aws-sdk/client-cognito-identity-provider');
jest.mock('../../src/functions/manageCognitoUser', () => ({
    manageCognitoUser: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../src/functions/authenticateUser', () => ({
    authenticateUser: jest.fn().mockResolvedValue({
        AccessToken: 'test-access-token',
        IdToken: 'test-id-token',
        RefreshToken: 'test-refresh-token',
    }),
}));

describe('Lambda Handler', () => {
    const mockEvent: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        body: '',
        headers: {},
        isBase64Encoded: false,
        multiValueHeaders: {},
        multiValueQueryStringParameters: {},
        path: '/login',
        pathParameters: {},
        queryStringParameters: {},
        requestContext: {
            accountId: '123456789012',
            apiId: '1234',
            authorizer: {},
            httpMethod: 'POST',
            identity: {
                accessKey: '',
                accountId: '',
                apiKey: '',
                apiKeyId: '',
                caller: '',
                clientCert: {
                    clientCertPem: '',
                    issuerDN: '',
                    serialNumber: '',
                    subjectDN: '',
                    validity: { notAfter: '', notBefore: '' },
                },
                cognitoAuthenticationProvider: '',
                cognitoAuthenticationType: '',
                cognitoIdentityId: '',
                cognitoIdentityPoolId: '',
                principalOrgId: '',
                sourceIp: '',
                user: '',
                userAgent: '',
                userArn: '',
            },
            path: '/login',
            protocol: 'HTTP/1.1',
            requestId: 'test-request-id',
            requestTimeEpoch: 1428582896000,
            resourceId: '123456',
            resourcePath: '/login',
            stage: 'test',
        },
        resource: '',
        stageVariables: {},
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

        const result: APIGatewayProxyResult = await lambdaHandler(event);

        expect(result.statusCode).toBe(500);
    });

    it('should return 500 when CLIENT_ID is missing', async () => {
        delete process.env.CLIENT_ID;

        const event = {
            ...mockEvent,
            body: JSON.stringify({ name: 'Test User' }),
        };

        const result: APIGatewayProxyResult = await lambdaHandler(event);

        expect(result.statusCode).toBe(500);
    });

    it('should return 400 when name is missing for anonymous user', async () => {
        const event = {
            ...mockEvent,
            body: JSON.stringify({}),
        };

        const result: APIGatewayProxyResult = await lambdaHandler(event);

        expect(result.statusCode).toBe(400);
    });

    it('should return 500 for invalid JSON', async () => {
        const event = {
            ...mockEvent,
            body: 'invalid json',
        };

        const result: APIGatewayProxyResult = await lambdaHandler(event);

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

        const result: APIGatewayProxyResult = await lambdaHandler(event);

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

        const result: APIGatewayProxyResult = await lambdaHandler(event);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.tokens).toBeDefined();
    });
});
