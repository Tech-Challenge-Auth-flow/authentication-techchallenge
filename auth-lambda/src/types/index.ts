type UserData = {
    id: string;
    name: string;
    mail: string | null;
    type: UserType;
};

type RequestBody = {
    cpf?: string;
    name: string;
    mail?: string;
};

enum UserType {
    Authenticated = 'authenticated',
    Anonymous = 'anonymous',
}

export interface RegisterRequest {
    name: string;
    cpf: string;
    email: string;
}

export interface LoginRequest {
    cpf?: string;
    name?: string;
}

export interface AuthTokens {
    idToken: string;
    refreshToken: string;
}

export interface User {
    id: string;
    name: string;
    email?: string;
    cpf?: string;
    type: 'authenticated' | 'anonymous';
}

export interface RegisterResponse {
    message: string;
    userId: string;
}

export interface LoginResponse {
    tokens: AuthTokens;
    user: User;
}

export interface ErrorResponse {
    error: string;
    code: string;
    details?: string;
}

export { UserData, RequestBody, UserType };
