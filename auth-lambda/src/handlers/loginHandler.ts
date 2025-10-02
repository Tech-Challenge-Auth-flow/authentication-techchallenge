import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { UserService, LoginRequest } from '../services/userService';
import { createSuccessResponse, createErrorResponse, AppError } from '../utils/responseUtils';

export class LoginHandler {
    constructor(private userService: UserService) {}

    async handle(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
        console.log('Starting user login process...');

        try {
            if (!event.body) {
                return createErrorResponse(400, 'MISSING_BODY', 'Request body is required');
            }

            const body: LoginRequest = JSON.parse(event.body);
            const { cpf, name } = body;

            console.log('Login request received:', {
                cpf: cpf ? `***${cpf.slice(-4)}` : null,
                name: name || null,
            });

            const userType = this.userService.determineUserType(body);

            let result;
            if (userType === 'registered') {
                result = await this.userService.loginRegisteredUser(cpf!);
            } else {
                result = await this.userService.loginAnonymousUser(name!);
            }

            console.log(`${userType} user login completed successfully`);

            return createSuccessResponse(200, result);
        } catch (error) {
            console.error('Error in login process:', error);

            if (error instanceof AppError) {
                return createErrorResponse(error.statusCode, error.code, error.message, error.details);
            }

            const err = error as Error;
            return createErrorResponse(500, 'INTERNAL_ERROR', 'Internal server error during login', err.message);
        }
    }
}
