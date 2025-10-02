import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoRepository } from './src/repositories/cognitoRepository';
import { UserService } from './src/services/userService';
import { RegisterHandler } from './src/handlers/registerHandler';
import { LoginHandler } from './src/handlers/loginHandler';
import { createErrorResponse } from './src/utils/responseUtils';

/**
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 */

export const lambdaHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const cognitoClient = new CognitoIdentityProviderClient();
    const cognitoRepository = new CognitoRepository(cognitoClient);
    const userService = new UserService(cognitoRepository);
    const registerHandler = new RegisterHandler(userService);
    const loginHandler = new LoginHandler(userService);

    console.log('Lambda handler started', {
        httpMethod: event.requestContext.http.method,
        path: event.requestContext.http.path,
    });

    if (!process.env.USER_POOL_ID || !process.env.CLIENT_ID || !process.env.USER_PASSWORD) {
        console.error('Missing required environment variables:', {
            USER_POOL_ID: !!process.env.USER_POOL_ID,
            CLIENT_ID: !!process.env.CLIENT_ID,
            USER_PASSWORD: !!process.env.USER_PASSWORD,
        });
        return createErrorResponse(500, 'CONFIG_ERROR', 'Server configuration error');
    }

    try {
        const path = event.requestContext.http.path;
        console.log(`Processing ${event.requestContext.http.method} request`);

        switch (path) {
            case '/register':
                if (event.requestContext.http.method !== 'POST') {
                    return createErrorResponse(
                        405,
                        'METHOD_NOT_ALLOWED',
                        'Only POST method is allowed for registration',
                    );
                }
                return await registerHandler.handle(event);

            case '/login':
                if (event.requestContext.http.method !== 'POST') {
                    return createErrorResponse(405, 'METHOD_NOT_ALLOWED', 'Only POST method is allowed for login');
                }
                return await loginHandler.handle(event);

            default:
                return createErrorResponse(404, 'ROUTE_NOT_FOUND', `Route not found: ${path}`);
        }
    } catch (error) {
        const err = error as Error;
        console.error('Unhandled error in lambda handler:', error);

        return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error', err.message);
    }
};
