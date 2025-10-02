import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { UserService, RegisterUserRequest } from '../services/userService';
import { createSuccessResponse, createErrorResponse, AppError } from '../utils/responseUtils';

export class RegisterHandler {
    constructor(private userService: UserService) {}

    async handle(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
        console.log('Starting user registration process...');

        try {
            if (!event.body) {
                return createErrorResponse(400, 'MISSING_BODY', 'Request body is required');
            }

            const body: RegisterUserRequest = JSON.parse(event.body);
            const { name, cpf, email } = body;

            console.log('Registration request received for:', {
                name,
                cpf: cpf ? `***${cpf.slice(-4)}` : null,
                email: email ? `***@${email.split('@')[1]}` : null,
            });

            if (!name || !cpf || !email) {
                return createErrorResponse(
                    400,
                    'MISSING_PARAMETERS',
                    'Name, CPF, and email are required for registration',
                );
            }

            const result = await this.userService.registerUser({ name, cpf, email });

            console.log('User registration completed successfully');

            return createSuccessResponse(201, result);
        } catch (error) {
            console.error('Error in registration process:', error);

            if (error instanceof AppError) {
                return createErrorResponse(error.statusCode, error.code, error.message, error.details);
            }

            const err = error as Error;
            return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error during registration', err.message);
        }
    }
}
