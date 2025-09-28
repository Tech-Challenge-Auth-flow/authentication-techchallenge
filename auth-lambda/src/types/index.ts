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

export { UserData, RequestBody, UserType };
