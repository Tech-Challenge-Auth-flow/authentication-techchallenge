import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UserService, RegisterUserRequest, LoginRequest } from '../../src/services/userService';
import { CognitoRepository } from '../../src/repositories/cognitoRepository';
import { AppError } from '../../src/utils/responseUtils';

const mockCognitoRepository = {
    findUserByCPF: jest.fn(),
    findUserByEmail: jest.fn(),
    createUser: jest.fn(),
    authenticateUser: jest.fn(),
} as unknown as jest.Mocked<CognitoRepository>;

describe('UserService', () => {
    let userService: UserService;

    beforeEach(() => {
        jest.clearAllMocks();
        userService = new UserService(mockCognitoRepository);
    });

    describe('registerUser', () => {
        const validRegisterRequest: RegisterUserRequest = {
            name: 'João da Silva',
            cpf: '11144477735',
            email: 'joao@example.com',
        };

        it('should register a new user successfully', async () => {
            mockCognitoRepository.findUserByCPF.mockResolvedValue(null);
            mockCognitoRepository.findUserByEmail.mockResolvedValue(null);
            mockCognitoRepository.createUser.mockResolvedValue('11144477735');

            const result = await userService.registerUser(validRegisterRequest);

            expect(result).toEqual({
                message: 'User registered successfully',
                userId: '11144477735',
            });

            expect(mockCognitoRepository.findUserByCPF).toHaveBeenCalledWith('11144477735');
            expect(mockCognitoRepository.findUserByEmail).toHaveBeenCalledWith('joao@example.com');
            expect(mockCognitoRepository.createUser).toHaveBeenCalledWith({
                username: '11144477735',
                name: 'João da Silva',
                email: 'joao@example.com',
                cpf: '11144477735',
                userType: 'authenticated',
            });
        });

        it('should throw error if CPF already exists', async () => {
            mockCognitoRepository.findUserByCPF.mockResolvedValue({
                username: '11144477735',
                name: 'Existing User',
                cpf: '11144477735',
                userType: 'authenticated',
            });

            await expect(userService.registerUser(validRegisterRequest)).rejects.toThrow(AppError);
            await expect(userService.registerUser(validRegisterRequest)).rejects.toThrow('CPF already registered');
        });

        it('should throw error if email already exists', async () => {
            mockCognitoRepository.findUserByCPF.mockResolvedValue(null);
            mockCognitoRepository.findUserByEmail.mockResolvedValue({
                username: 'other-user',
                name: 'Other User',
                email: 'joao@example.com',
                userType: 'authenticated',
            });

            await expect(userService.registerUser(validRegisterRequest)).rejects.toThrow(AppError);
            await expect(userService.registerUser(validRegisterRequest)).rejects.toThrow('Email already registered');
        });
    });

    describe('loginRegisteredUser', () => {
        it('should login a registered user successfully', async () => {
            const cpf = '11144477735';
            const mockUser = {
                username: '11144477735',
                name: 'João da Silva',
                cpf: '11144477735',
                email: 'joao@example.com',
                userType: 'authenticated' as const,
            };

            const mockTokens = {
                idToken: 'mock-id-token',
                refreshToken: 'mock-refresh-token',
            };

            mockCognitoRepository.findUserByCPF.mockResolvedValue(mockUser);
            mockCognitoRepository.authenticateUser.mockResolvedValue(mockTokens);

            const result = await userService.loginRegisteredUser(cpf);

            expect(result).toEqual({
                tokens: mockTokens,
                user: {
                    id: '11144477735',
                    name: 'João da Silva',
                    type: 'authenticated',
                },
            });
        });

        it('should throw error if user not found', async () => {
            mockCognitoRepository.findUserByCPF.mockResolvedValue(null);

            await expect(userService.loginRegisteredUser('11144477735')).rejects.toThrow(AppError);
            await expect(userService.loginRegisteredUser('11144477735')).rejects.toThrow('User not found');
        });
    });

    describe('loginAnonymousUser', () => {
        it('should login an anonymous user successfully', async () => {
            const name = 'Usuario Anonimo';
            const mockTokens = {
                idToken: 'mock-id-token',
                refreshToken: 'mock-refresh-token',
            };

            mockCognitoRepository.createUser.mockResolvedValue('mock-uuid');
            mockCognitoRepository.authenticateUser.mockResolvedValue(mockTokens);

            const result = await userService.loginAnonymousUser(name);

            expect(result.tokens).toEqual(mockTokens);
            expect(result.user.name).toBe('Usuario Anonimo');
            expect(result.user.type).toBe('anonymous');
            expect(result.user.id).toBeDefined();
        });
    });

    describe('determineUserType', () => {
        it('should return "registered" for CPF only', () => {
            const request: LoginRequest = { cpf: '11144477735' };
            expect(userService.determineUserType(request)).toBe('registered');
        });

        it('should return "anonymous" for name only', () => {
            const request: LoginRequest = { name: 'Usuario Anonimo' };
            expect(userService.determineUserType(request)).toBe('anonymous');
        });

        it('should throw error for both CPF and name', () => {
            const request: LoginRequest = { cpf: '11144477735', name: 'Usuario' };
            expect(() => userService.determineUserType(request)).toThrow(AppError);
        });

        it('should throw error for neither CPF nor name', () => {
            const request: LoginRequest = {};
            expect(() => userService.determineUserType(request)).toThrow(AppError);
        });
    });
});
