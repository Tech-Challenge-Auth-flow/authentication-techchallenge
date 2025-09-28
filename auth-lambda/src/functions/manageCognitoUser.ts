import {
    AdminCreateUserCommand,
    AdminGetUserCommand,
    AdminGetUserResponse,
    AdminSetUserPasswordCommand,
    CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { UserData } from '../types';

export async function manageCognitoUser(
    userData: UserData,
    client: CognitoIdentityProviderClient,
): Promise<AdminGetUserResponse | void> {
    try {
        console.log('Checking if user exists in Cognito...');

        const command = new AdminGetUserCommand({
            UserPoolId: process.env.USER_POOL_ID,
            Username: userData.id,
        });

        const existingUser = await client.send(command);

        console.log(
            'User already exists in Cognito:',
            existingUser.UserAttributes?.find((attr) => attr.Name === 'sub')?.Value,
        );

        return existingUser;
    } catch (error: unknown) {
        const err = error as Error;
        if (err.name === 'UserNotFoundException') {
            console.log('Creating new user in Cognito...');

            const attributes = [
                { Name: 'name', Value: userData.name },
                { Name: 'custom:user_type', Value: userData.type },
            ];

            if (userData.mail) {
                attributes.push({ Name: 'email', Value: userData.mail });
            }

            if (userData.type === 'authenticated' && userData.id !== userData.name) {
                attributes.push({ Name: 'custom:cpf', Value: userData.id });
            }

            const createUserCommand = new AdminCreateUserCommand({
                UserPoolId: process.env.USER_POOL_ID,
                Username: userData.id,
                TemporaryPassword: process.env.USER_PASSWORD,
                MessageAction: 'SUPPRESS',
                UserAttributes: attributes,
            });

            const response = await client.send(createUserCommand);

            console.log(
                'User created in Cognito with sub:',
                response.User?.Attributes?.find((attr) => attr.Name === 'sub')?.Value,
            );

            const setUserPasswordCommand = new AdminSetUserPasswordCommand({
                UserPoolId: process.env.USER_POOL_ID,
                Username: userData.id,
                Password: process.env.USER_PASSWORD,
                Permanent: true,
            });

            await client.send(setUserPasswordCommand);

            console.log('Permanent password set');
        } else {
            console.error('Unexpected error when checking user in Cognito:', error);
            throw err;
        }
    }
}
