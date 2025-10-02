import { describe, it, expect } from '@jest/globals';
import { UserValidator } from '../../src/validators/userValidator';
import { AppError } from '../../src/utils/responseUtils';

describe('UserValidator', () => {
    describe('validateCPF', () => {
        it('should validate a correct CPF', () => {
            const validCPF = '11144477735';
            expect(() => UserValidator.validateCPF(validCPF)).not.toThrow();
        });

        it('should throw error for CPF with wrong length', () => {
            const invalidCPF = '123456789';
            expect(() => UserValidator.validateCPF(invalidCPF)).toThrow(AppError);
            expect(() => UserValidator.validateCPF(invalidCPF)).toThrow('CPF must have exactly 11 digits');
        });

        it('should throw error for CPF with all equal digits', () => {
            const invalidCPF = '11111111111';
            expect(() => UserValidator.validateCPF(invalidCPF)).toThrow(AppError);
            expect(() => UserValidator.validateCPF(invalidCPF)).toThrow('CPF cannot have all equal digits');
        });

        it('should throw error for empty CPF', () => {
            expect(() => UserValidator.validateCPF('')).toThrow(AppError);
            expect(() => UserValidator.validateCPF('')).toThrow('CPF is required');
        });

        it('should throw error for CPF with invalid verification digits', () => {
            const invalidCPF = '12345678901'; // Dígitos verificadores incorretos
            expect(() => UserValidator.validateCPF(invalidCPF)).toThrow(AppError);
            expect(() => UserValidator.validateCPF(invalidCPF)).toThrow('Invalid CPF verification digits');
        });
    });

    describe('validateEmail', () => {
        it('should validate a correct email', () => {
            const validEmail = 'test@example.com';
            expect(() => UserValidator.validateEmail(validEmail)).not.toThrow();
        });

        it('should throw error for invalid email format', () => {
            const invalidEmail = 'invalid-email';
            expect(() => UserValidator.validateEmail(invalidEmail)).toThrow(AppError);
            expect(() => UserValidator.validateEmail(invalidEmail)).toThrow('Invalid email format');
        });

        it('should throw error for empty email', () => {
            expect(() => UserValidator.validateEmail('')).toThrow(AppError);
            expect(() => UserValidator.validateEmail('')).toThrow('Email is required');
        });

        it('should throw error for email that is too long', () => {
            const longEmail = 'a'.repeat(250) + '@example.com';
            expect(() => UserValidator.validateEmail(longEmail)).toThrow(AppError);
            expect(() => UserValidator.validateEmail(longEmail)).toThrow('Email is too long');
        });
    });

    describe('validateName', () => {
        it('should validate a correct name', () => {
            const validName = 'João da Silva';
            expect(() => UserValidator.validateName(validName)).not.toThrow();
        });

        it('should throw error for empty name', () => {
            expect(() => UserValidator.validateName('')).toThrow(AppError);
            expect(() => UserValidator.validateName('')).toThrow('Name is required');
        });

        it('should throw error for name that is too short', () => {
            const shortName = 'A';
            expect(() => UserValidator.validateName(shortName)).toThrow(AppError);
            expect(() => UserValidator.validateName(shortName)).toThrow('Name must have at least 2 characters');
        });

        it('should throw error for name that is too long', () => {
            const longName = 'A'.repeat(101);
            expect(() => UserValidator.validateName(longName)).toThrow(AppError);
            expect(() => UserValidator.validateName(longName)).toThrow('Name is too long');
        });
    });

    describe('sanitization methods', () => {
        it('should sanitize CPF correctly', () => {
            expect(UserValidator.sanitizeCPF('123.456.789-01')).toBe('12345678901');
            expect(UserValidator.sanitizeCPF('123 456 789 01')).toBe('12345678901');
        });

        it('should sanitize email correctly', () => {
            expect(UserValidator.sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
        });

        it('should sanitize name correctly', () => {
            expect(UserValidator.sanitizeName('  João   da   Silva  ')).toBe('João da Silva');
        });
    });
});
