import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { RequestBody, UserData, UserType } from './src/types';
import { authenticateUser } from './src/functions/authenticateUser';
import { manageCognitoUser } from './src/functions/manageCognitoUser';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

const cognitoClient = new CognitoIdentityProviderClient();

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Starting login process...');

    if (!process.env.USER_POOL_ID || !process.env.CLIENT_ID) {
        console.error('Missing required environment variables');
        return createResponse(500, { message: 'Server configuration error' });
    }

    try {
        const body: RequestBody = JSON.parse(event.body as string);

        const { cpf, name, mail } = body;

        console.log('Received data:', {
            cpf: cpf ? `****${cpf.substring(cpf.length - 4)}` : null,
            name,
            mail: mail ? `****@${mail.split('@')[1]}` : null,
        });

        let userData: UserData;

        if (cpf) {
            console.log('Processing identified user...');

            userData = {
                id: cpf,
                name,
                mail: mail || null,
                type: UserType.Authenticated,
            };

            console.log('Identified user data prepared');
        } else {
            console.log('Processing anonymous user...');

            if (!name) {
                return createResponse(400, { message: 'Name is required for anonymous users' });
            }

            const temporaryId = uuidv4();

            userData = {
                id: temporaryId,
                name,
                mail: null,
                type: UserType.Anonymous,
            };

            console.log('Anonymous user created:', temporaryId);
        }

        console.log('Managing user in Cognito...');
        await manageCognitoUser(userData, cognitoClient);

        console.log('Generating JWT tokens...');
        const tokens = await authenticateUser(userData.id, cognitoClient);

        console.log('Login completed successfully for:', userData.name);

        return createResponse(200, {
            tokens: {
                idToken: tokens.IdToken || '',
                refreshToken: tokens.RefreshToken || '',
            },
        });
    } catch (error) {
        const err = error as Error & { code?: string };
        console.error('Error in login process:', error);

        return createResponse(500, {
            error: 'Internal server error during login',
            code: err?.code || 'UNKNOWN_ERROR',
        });
    }

    function createResponse(statusCode: number, data: unknown): APIGatewayProxyResult {
        return {
            statusCode: statusCode,
            body: JSON.stringify(data),
        };
    }
};
