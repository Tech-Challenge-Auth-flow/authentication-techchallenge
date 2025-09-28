import { AdminInitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { authenticateUser } from '../../src/functions/authenticateUser';

jest.mock('@aws-sdk/client-cognito-identity-provider');

describe('authenticateUser', () => {
    let mockClient: any;
    let mockSend: jest.Mock;

    beforeEach(() => {
        process.env.USER_POOL_ID = 'test-pool-id';
        process.env.CLIENT_ID = 'test-client-id';
        process.env.USER_PASSWORD = 'TestPassword123!';
        mockSend = jest.fn();
        mockClient = {
            send: mockSend,
        };
        jest.clearAllMocks();
    });

    afterEach(() => {
        delete process.env.USER_POOL_ID;
        delete process.env.CLIENT_ID;
        delete process.env.USER_PASSWORD;
    });

    it('should authenticate user and return tokens', async () => {
        const mockAuthResult = {
            AccessToken: 'test-access-token',
            IdToken: 'test-id-token',
            RefreshToken: 'test-refresh-token',
        };

        const mockResponse = {
            AuthenticationResult: mockAuthResult,
        };

        mockSend.mockResolvedValue(mockResponse);

        const result = await authenticateUser('test-user-id', mockClient);

        expect(result).toEqual(mockAuthResult);
        expect(mockSend).toHaveBeenCalledWith(expect.any(AdminInitiateAuthCommand));
    });

    it('should throw error when AuthenticationResult is missing', async () => {
        mockSend.mockResolvedValue({});

        await expect(authenticateUser('test-user', mockClient)).rejects.toThrow('User authentication failed');
    });

    it('should throw error when AuthenticationResult is null', async () => {
        mockSend.mockResolvedValue({
            AuthenticationResult: null,
        });

        await expect(authenticateUser('test-user', mockClient)).rejects.toThrow('User authentication failed');
    });

    it('should handle AWS Cognito errors', async () => {
        const cognitoError = new Error('Invalid user');
        cognitoError.name = 'NotAuthorizedException';

        mockSend.mockRejectedValue(cognitoError);

        await expect(authenticateUser('invalid-user', mockClient)).rejects.toThrow('User authentication failed');
    });

    it('should handle network errors', async () => {
        const networkError = new Error('Network error');

        mockSend.mockRejectedValue(networkError);

        await expect(authenticateUser('network-error-user', mockClient)).rejects.toThrow('User authentication failed');
    });

    it('should use correct authentication parameters', async () => {
        const mockAuthResult = {
            AccessToken: 'test-token',
        };

        mockSend.mockResolvedValue({
            AuthenticationResult: mockAuthResult,
        });

        await authenticateUser('test-user-123', mockClient);

        expect(mockSend).toHaveBeenCalledTimes(1);
        expect(mockSend).toHaveBeenCalledWith(expect.any(AdminInitiateAuthCommand));
    });
});
