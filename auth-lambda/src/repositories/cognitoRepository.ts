import {
    AdminCreateUserCommand,
    AdminGetUserCommand,
    AdminInitiateAuthCommand,
    AdminSetUserPasswordCommand,
    CognitoIdentityProviderClient,
    ListUsersCommand,
    AttributeType,
} from '@aws-sdk/client-cognito-identity-provider';
import { AppError } from '../utils/responseUtils';

export interface CognitoUser {
    username: string;
    name: string;
    email?: string;
    cpf?: string;
    userType: 'authenticated' | 'anonymous';
}

export interface AuthTokens {
    idToken: string;
    refreshToken: string;
}

export class CognitoRepository {
    constructor(private client: CognitoIdentityProviderClient) {}

    /**
     * Verifica se um usuário existe no Cognito pelo username
     */
    async userExists(username: string): Promise<boolean> {
        try {
            await this.client.send(
                new AdminGetUserCommand({
                    UserPoolId: process.env.USER_POOL_ID,
                    Username: username,
                }),
            );
            return true;
        } catch (error: unknown) {
            const err = error as Error;
            if (err.name === 'UserNotFoundException') {
                return false;
            }
            throw error;
        }
    }

    /**
     * Busca usuário pelo CPF (atributo customizado)
     */
    async findUserByCPF(cpf: string): Promise<CognitoUser | undefined | null> {
        try {
            const userByUsername = await this.getUserByUsername(cpf);

            if (userByUsername && userByUsername.cpf === cpf) {
                console.log('User found by username');
                return userByUsername;
            }
        } catch (error) {
            console.error('Error finding user by CPF:', error);
            return null;
        }
    }

    /**
     * Busca usuário pelo email
     */
    async findUserByEmail(email: string): Promise<CognitoUser | null> {
        try {
            const command = new ListUsersCommand({
                UserPoolId: process.env.USER_POOL_ID,
                Filter: `"email" = "${email}"`,
                Limit: 1,
            });

            const response = await this.client.send(command);

            if (!response.Users || response.Users.length === 0) {
                return null;
            }

            for (const user of response.Users) {
                const mappedUser = this.mapCognitoUserToUser(user.Username || '', user.Attributes || []);
                if (mappedUser.email === email) {
                    return mappedUser;
                }
            }

            return null;
        } catch (error) {
            console.error('Error finding user by email:', error);
            return null;
        }
    }

    /**
     * Busca usuário pelo username
     */
    async getUserByUsername(username: string): Promise<CognitoUser | null> {
        try {
            const command = new AdminGetUserCommand({
                UserPoolId: process.env.USER_POOL_ID,
                Username: username,
            });

            const response = await this.client.send(command);
            return this.mapCognitoUserToUser(username, response.UserAttributes || []);
        } catch (error: unknown) {
            const err = error as Error;
            if (err.name === 'UserNotFoundException') {
                return null;
            }
            console.error('Error getting user:', error);
            throw new AppError(500, 'COGNITO_ERROR', 'Error retrieving user');
        }
    }

    /**
     * Cria um novo usuário no Cognito
     */
    async createUser(user: CognitoUser): Promise<string> {
        try {
            const attributes: AttributeType[] = [
                { Name: 'name', Value: user.name },
                { Name: 'custom:user_type', Value: user.userType },
            ];

            if (user.email) {
                attributes.push({ Name: 'email', Value: user.email });
                attributes.push({ Name: 'email_verified', Value: 'true' });
            }

            if (user.cpf) {
                attributes.push({ Name: 'custom:cpf', Value: user.cpf });
            }

            const createCommand = new AdminCreateUserCommand({
                UserPoolId: process.env.USER_POOL_ID,
                Username: user.username,
                TemporaryPassword: process.env.USER_PASSWORD,
                MessageAction: 'SUPPRESS',
                UserAttributes: attributes,
            });

            const response = await this.client.send(createCommand);

            await this.client.send(
                new AdminSetUserPasswordCommand({
                    UserPoolId: process.env.USER_POOL_ID,
                    Username: user.username,
                    Password: process.env.USER_PASSWORD,
                    Permanent: true,
                }),
            );

            const sub = response.User?.Attributes?.find((attr: AttributeType) => attr.Name === 'sub')?.Value;
            console.log(`User created in Cognito: ${user.username} (sub: ${sub})`);

            return sub || user.username;
        } catch (error: unknown) {
            const err = error as Error & { code?: string };
            console.error('Error creating user in Cognito:', error);

            if (err.name === 'UsernameExistsException') {
                throw new AppError(409, 'USER_EXISTS', 'User already exists');
            }

            throw new AppError(500, 'COGNITO_ERROR', 'Error creating user', err.message);
        }
    }

    /**
     * Autentica um usuário e retorna os tokens
     */
    async authenticateUser(username: string): Promise<AuthTokens> {
        try {
            const command = new AdminInitiateAuthCommand({
                UserPoolId: process.env.USER_POOL_ID,
                ClientId: process.env.CLIENT_ID,
                AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
                AuthParameters: {
                    USERNAME: username,
                    PASSWORD: process.env.USER_PASSWORD as string,
                },
            });

            const response = await this.client.send(command);

            if (!response.AuthenticationResult) {
                throw new AppError(500, 'AUTHENTICATION_FAILED', 'Authentication result is missing');
            }

            return {
                idToken: response.AuthenticationResult.IdToken || '',
                refreshToken: response.AuthenticationResult.RefreshToken || '',
            };
        } catch (error: unknown) {
            const err = error as Error & { code?: string };
            console.error('Error authenticating user:', error);

            if (err.name === 'UserNotFoundException') {
                throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
            }

            if (err.name === 'NotAuthorizedException') {
                throw new AppError(401, 'AUTHENTICATION_FAILED', 'Invalid credentials');
            }

            throw new AppError(500, 'AUTHENTICATION_FAILED', 'Authentication failed', err.message);
        }
    }

    /**
     * Mapeia atributos do Cognito para o formato interno
     */
    private mapCognitoUserToUser(username: string, attributes: AttributeType[]): CognitoUser {
        const getAttribute = (name: string): string | undefined => {
            return attributes.find((attr) => attr.Name === name)?.Value;
        };

        return {
            username,
            name: getAttribute('name') || '',
            email: getAttribute('email'),
            cpf: getAttribute('custom:cpf'),
            userType: (getAttribute('custom:user_type') as 'authenticated' | 'anonymous') || 'authenticated',
        };
    }
}
