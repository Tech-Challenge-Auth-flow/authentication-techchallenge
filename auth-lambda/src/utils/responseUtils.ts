import { APIGatewayProxyResultV2 } from 'aws-lambda';

export function createSuccessResponse(statusCode: number, data: unknown): APIGatewayProxyResultV2 {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        body: JSON.stringify(data),
    };
}

export function createErrorResponse(
    statusCode: number,
    errorCode: string,
    message: string,
    details?: string,
): APIGatewayProxyResultV2 {
    const responseBody: any = {
        error: message,
        code: errorCode,
    };

    if (details) {
        responseBody.details = details;
    }

    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        body: JSON.stringify(responseBody),
    };
}

export class AppError extends Error {
    constructor(public statusCode: number, public code: string, message: string, public details?: string) {
        super(message);
        this.name = 'AppError';
    }
}
