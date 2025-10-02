import { AppError } from '../utils/responseUtils';

export class UserValidator {
    /**
     * Valida um CPF brasileiro (11 dígitos)
     * @param cpf CPF sem máscara (apenas números)
     * @returns true se válido
     * @throws AppError se inválido
     */
    static validateCPF(cpf: string): boolean {
        if (!cpf) {
            throw new AppError(400, 'INVALID_CPF', 'CPF is required');
        }

        const cleanCPF = cpf.replace(/\D/g, '');

        if (cleanCPF.length !== 11) {
            throw new AppError(400, 'INVALID_CPF', 'CPF must have exactly 11 digits');
        }

        // Verifica se todos os dígitos são iguais
        if (/^(\d)\1{10}$/.test(cleanCPF)) {
            throw new AppError(400, 'INVALID_CPF', 'CPF cannot have all equal digits');
        }

        let sum = 0;
        let remainder;

        for (let i = 1; i <= 9; i++) {
            sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
        }
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cleanCPF.substring(9, 10))) {
            throw new AppError(400, 'INVALID_CPF', 'Invalid CPF verification digits');
        }

        sum = 0;
        for (let i = 1; i <= 10; i++) {
            sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
        }
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cleanCPF.substring(10, 11))) {
            throw new AppError(400, 'INVALID_CPF', 'Invalid CPF verification digits');
        }

        return true;
    }

    /**
     * Valida um endereço de e-mail
     * @param email Email a ser validado
     * @returns true se válido
     * @throws AppError se inválido
     */
    static validateEmail(email: string): boolean {
        if (!email) {
            throw new AppError(400, 'INVALID_EMAIL', 'Email is required');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            throw new AppError(400, 'INVALID_EMAIL', 'Invalid email format');
        }

        if (email.length > 254) {
            throw new AppError(400, 'INVALID_EMAIL', 'Email is too long');
        }

        return true;
    }

    /**
     * Valida um nome
     * @param name Nome a ser validado
     * @returns true se válido
     * @throws AppError se inválido
     */
    static validateName(name: string): boolean {
        if (!name || name.trim().length === 0) {
            throw new AppError(400, 'INVALID_NAME', 'Name is required');
        }

        if (name.length < 2) {
            throw new AppError(400, 'INVALID_NAME', 'Name must have at least 2 characters');
        }

        if (name.length > 100) {
            throw new AppError(400, 'INVALID_NAME', 'Name is too long (max 100 characters)');
        }

        return true;
    }

    /**
     * Sanitiza CPF removendo caracteres não numéricos
     * @param cpf CPF com ou sem máscara
     * @returns CPF apenas com números
     */
    static sanitizeCPF(cpf: string): string {
        return cpf.replace(/\D/g, '');
    }

    /**
     * Sanitiza email removendo espaços
     * @param email Email a ser sanitizado
     * @returns Email sem espaços e em lowercase
     */
    static sanitizeEmail(email: string): string {
        return email.trim().toLowerCase();
    }

    /**
     * Sanitiza nome removendo espaços extras
     * @param name Nome a ser sanitizado
     * @returns Nome sem espaços extras
     */
    static sanitizeName(name: string): string {
        return name.trim().replace(/\s+/g, ' ');
    }
}
