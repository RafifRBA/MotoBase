import request from "supertest";

import app from "../../src/app.js";
import { signAccessToken } from "../../src/modules/auth/token.js";
import { ROLES } from "../../src/modules/users/user.model.js";
import { createUser } from "./factories.js";

// Membuat user dengan role tertentu lalu mengembalikan pembungkus supertest
// yang otomatis menyertakan header Authorization.
export const asRole = async (role = ROLES.ADMIN) => {
    const user = await createUser({ role });
    const token = signAccessToken(user);

    const withAuth = (method) => (url) =>
        request(app)[method](url).set("Authorization", `Bearer ${token}`);

    return {
        user,
        token,
        get: withAuth("get"),
        post: withAuth("post"),
        patch: withAuth("patch"),
        delete: withAuth("delete"),
    };
};

export { app, request };
