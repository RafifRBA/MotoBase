import bcryptjs from "bcryptjs";
import { env } from "../../config/env.js";

export const hashPassword = (plain) =>
    bcryptjs.hash(plain, env.BCRYPT_SALT_ROUNDS);

export const verifyPassword = (plain, hash) =>
    bcryptjs.compare(plain, hash);
