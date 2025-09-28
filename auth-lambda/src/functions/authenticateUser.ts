import {
    AdminInitiateAuthCommand,
    AuthenticationResultType,
    CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

export async function authenticateUser(
    userId: string,
    client: CognitoIdentityProviderClient,
): Promise<AuthenticationResultType> {
    console.log('Starting authentication...');

    try {
        const initAuthCommand = new AdminInitiateAuthCommand({
            UserPoolId: process.env.USER_POOL_ID,
            ClientId: process.env.CLIENT_ID,
            AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
            AuthParameters: {
                USERNAME: userId,
                PASSWORD: process.env.USER_PASSWORD as string,
            },
        });
        const initAuthCommandResponse = await client.send(initAuthCommand);

        if (!initAuthCommandResponse.AuthenticationResult) {
            throw new Error('Authentication result is missing');
        }

        console.log('Authentication completed successfully. Tokens generated:');

        if (initAuthCommandResponse.AuthenticationResult.IdToken) {
            console.log('IdToken:', initAuthCommandResponse.AuthenticationResult.IdToken.substring(0, 50) + '...');
        }
        if (initAuthCommandResponse.AuthenticationResult.RefreshToken) {
            console.log(
                'RefreshToken:',
                initAuthCommandResponse.AuthenticationResult.RefreshToken.substring(0, 50) + '...',
            );
        }

        return initAuthCommandResponse.AuthenticationResult;
    } catch (error: unknown) {
        console.error('Error during authentication:', error);
        throw new Error('User authentication failed');
    }
}
