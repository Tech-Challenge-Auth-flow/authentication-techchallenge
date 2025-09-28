import {
    AdminGetUserCommand,
    AdminCreateUserCommand,
    AdminSetUserPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { manageCognitoUser } from '../../src/functions/manageCognitoUser';
import { UserData, UserType } from '../../src/types';

jest.mock('@aws-sdk/client-cognito-identity-provider');

describe('manageCognitoUser', () => {
    let mockClient: any;
    let mockSend: jest.Mock;

    beforeEach(() => {
        process.env.USER_POOL_ID = 'test-pool-id';
        process.env.USER_PASSWORD = 'TestPassword123!';
        mockSend = jest.fn();
        mockClient = {
            send: mockSend,
        };
        jest.clearAllMocks();
    });

    afterEach(() => {
        delete process.env.USER_POOL_ID;
        delete process.env.USER_PASSWORD;
    });

    it('should return existing user when found', async () => {
        const mockUserResponse = {
            UserAttributes: [{ Name: 'sub', Value: 'test-sub-id' }],
            Username: 'test-user',
        };

        mockSend.mockResolvedValue(mockUserResponse);

        const userData: UserData = {
            id: 'test-user',
            name: 'Test User',
            mail: 'test@example.com',
            type: UserType.Authenticated,
        };

        const result = await manageCognitoUser(userData, mockClient);

        expect(result).toEqual(mockUserResponse);
        expect(mockSend).toHaveBeenCalledWith(expect.any(AdminGetUserCommand));
    });

    it('should create new user when not found', async () => {
        const userNotFoundError = new Error('User not found');
        userNotFoundError.name = 'UserNotFoundException';

        const createUserResponse = {
            User: {
                Attributes: [{ Name: 'sub', Value: 'new-user-sub' }],
            },
        };

        mockSend
            .mockRejectedValueOnce(userNotFoundError)
            .mockResolvedValueOnce(createUserResponse)
            .mockResolvedValueOnce({});

        const userData: UserData = {
            id: 'new-user',
            name: 'New User',
            mail: 'new@example.com',
            type: UserType.Authenticated,
        };

        await manageCognitoUser(userData, mockClient);

        expect(mockSend).toHaveBeenCalledTimes(3);
        expect(mockSend).toHaveBeenNthCalledWith(1, expect.any(AdminGetUserCommand));
        expect(mockSend).toHaveBeenNthCalledWith(2, expect.any(AdminCreateUserCommand));
        expect(mockSend).toHaveBeenNthCalledWith(3, expect.any(AdminSetUserPasswordCommand));
    });

    it('should create anonymous user correctly', async () => {
        const userNotFoundError = new Error('User not found');
        userNotFoundError.name = 'UserNotFoundException';

        const createUserResponse = {
            User: {
                Attributes: [{ Name: 'sub', Value: 'anon-user-sub' }],
            },
        };

        mockSend
            .mockRejectedValueOnce(userNotFoundError)
            .mockResolvedValueOnce(createUserResponse)
            .mockResolvedValueOnce({});

        const userData: UserData = {
            id: 'anon_123',
            name: 'Anonymous User',
            mail: null,
            type: UserType.Anonymous,
        };

        await manageCognitoUser(userData, mockClient);

        expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('should throw error for unexpected errors', async () => {
        const unexpectedError = new Error('Unexpected error');
        unexpectedError.name = 'InternalError';

        mockSend.mockRejectedValue(unexpectedError);

        const userData: UserData = {
            id: 'error-user',
            name: 'Error User',
            mail: 'error@example.com',
            type: UserType.Authenticated,
        };

        await expect(manageCognitoUser(userData, mockClient)).rejects.toThrow('Unexpected error');
    });
});
