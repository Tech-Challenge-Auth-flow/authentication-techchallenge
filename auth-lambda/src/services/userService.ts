import { v4 as uuidv4 } from 'uuid';
import { CognitoRepository, CognitoUser, AuthTokens } from '../repositories/cognitoRepository';
import { UserValidator } from '../validators/userValidator';
import { AppError } from '../utils/responseUtils';

export interface RegisterUserRequest {
    name: string;
    cpf: string;
    email: string;
}

export interface RegisterUserResponse {
    message: string;
    userId: string;
}

export interface LoginRequest {
    cpf?: string;
    name?: string;
}

export interface LoginResponse {
    tokens: AuthTokens;
    user: {
        id: string;
        name: string;
        type: 'authenticated' | 'anonymous';
    };
}

export class UserService {
    constructor(private cognitoRepository: CognitoRepository) {}

    /**
     * Registra um novo usuário autenticado
     */
    async registerUser(request: RegisterUserRequest): Promise<RegisterUserResponse> {
        const { name, cpf, email } = request;

        UserValidator.validateName(name);
        UserValidator.validateCPF(cpf);
        UserValidator.validateEmail(email);

        const sanitizedName = UserValidator.sanitizeName(name);
        const sanitizedCPF = UserValidator.sanitizeCPF(cpf);
        const sanitizedEmail = UserValidator.sanitizeEmail(email);

        console.log(`Checking CPF uniqueness for: ***${sanitizedCPF.slice(-4)}`);
        const existingUserByCPF = await this.cognitoRepository.findUserByCPF(sanitizedCPF);
        if (existingUserByCPF) {
            console.log(`CPF already exists: ***${sanitizedCPF.slice(-4)}`);
            throw new AppError(409, 'DUPLICATE_CPF', 'CPF already registered');
        }
        console.log(`CPF is unique: ***${sanitizedCPF.slice(-4)}`);

        console.log(`Checking email uniqueness for: ***@${sanitizedEmail.split('@')[1]}`);
        const existingUserByEmail = await this.cognitoRepository.findUserByEmail(sanitizedEmail);
        if (existingUserByEmail) {
            throw new AppError(409, 'DUPLICATE_EMAIL', 'Email already registered');
        }
        console.log(`Email is unique: ***@${sanitizedEmail.split('@')[1]}`);

        const newUser: CognitoUser = {
            username: sanitizedCPF,
            name: sanitizedName,
            email: sanitizedEmail,
            cpf: sanitizedCPF,
            userType: 'authenticated',
        };
        console.log(`Creating user in Cognito: ${sanitizedName}`);

        try {
            await this.cognitoRepository.createUser(newUser);
            console.log(`User registered successfully: ${sanitizedName} (CPF: ***${sanitizedCPF.slice(-4)})`);

            return {
                message: 'User registered successfully',
                userId: sanitizedCPF,
            };
        } catch (error) {
            console.error('Error registering user:', error);
            throw error;
        }
    }

    /**
     * Realiza login de usuário registrado (com CPF)
     */
    async loginRegisteredUser(cpf: string): Promise<LoginResponse> {
        UserValidator.validateCPF(cpf);
        const sanitizedCPF = UserValidator.sanitizeCPF(cpf);

        const user = await this.cognitoRepository.findUserByCPF(sanitizedCPF);
        if (!user) {
            throw new AppError(404, 'USER_NOT_FOUND', 'User not found with provided CPF');
        }

        const tokens = await this.cognitoRepository.authenticateUser(user.username);
        console.log(`Registered user logged in: ${user.name} (CPF: ***${sanitizedCPF.slice(-4)})`);

        return {
            tokens,
            user: {
                id: sanitizedCPF,
                name: user.name,
                type: 'authenticated',
            },
        };
    }

    /**
     * Realiza login de usuário anônimo (apenas com nome)
     */
    async loginAnonymousUser(name: string): Promise<LoginResponse> {
        UserValidator.validateName(name);
        const sanitizedName = UserValidator.sanitizeName(name);

        const anonymousId = uuidv4();

        const anonymousUser: CognitoUser = {
            username: anonymousId,
            name: sanitizedName,
            userType: 'anonymous',
        };

        try {
            await this.cognitoRepository.createUser(anonymousUser);
            const tokens = await this.cognitoRepository.authenticateUser(anonymousId);
            console.log(`Anonymous user logged in: ${sanitizedName} (ID: ${anonymousId})`);

            return {
                tokens,
                user: {
                    id: anonymousId,
                    name: sanitizedName,
                    type: 'anonymous',
                },
            };
        } catch (error) {
            console.error('Error creating anonymous user:', error);
            throw error;
        }
    }

    /**
     * Determina o tipo de usuário baseado nos parâmetros de entrada
     */
    determineUserType(request: LoginRequest): 'registered' | 'anonymous' {
        const { cpf, name } = request;

        if (cpf && !name) {
            return 'registered';
        }

        if (!cpf && name) {
            return 'anonymous';
        }

        if (cpf && name) {
            throw new AppError(
                400,
                'INVALID_INPUT',
                'Please provide either CPF for registered user login or name for anonymous user login, not both',
            );
        }

        throw new AppError(400, 'MISSING_PARAMETERS', 'Please provide either CPF or name');
    }
}
