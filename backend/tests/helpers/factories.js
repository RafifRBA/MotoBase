import { hashPassword } from "../../src/modules/auth/password.js";
import { ROLES, User } from "../../src/modules/users/user.model.js";

export const DEFAULT_PASSWORD = "RahasiaKuat123";

let counter = 0;

export const createUser = async ({
    name = "Pengguna Tes",
    email,
    role = ROLES.ADMIN,
    isActive = true,
    password = DEFAULT_PASSWORD,
} = {}) => {
    counter += 1;

    return User.create({
        name,
        email: email ?? `user${counter}@lajujaya.test`,
        role,
        isActive,
        passwordHash: await hashPassword(password),
    });
};
