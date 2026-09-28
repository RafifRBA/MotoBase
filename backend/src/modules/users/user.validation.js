import { z } from "zod";

import { emailSchema, passwordSchema } from "../auth/auth.validation.js";
import { paginationSchema } from "../../utils/pagination.js";
import { normalizePhone } from "../../utils/phone.js";
import { ROLES } from "./user.model.js";

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "ID tidak valid");

export const phoneSchema = z
    .string()
    .transform((value) => normalizePhone(value))
    .refine((value) => value !== null, "Nomor telepon tidak valid");

// Role internal saja. CUSTOMER dibuat lewat registrasi pelanggan (Tahap 7),
// bukan lewat endpoint ini.
const STAFF_ROLES = [ROLES.ADMIN, ROLES.MECHANIC, ROLES.OWNER];

export const listUsersSchema = {
    query: paginationSchema.extend({
        role: z.enum(STAFF_ROLES).optional(),
        isActive: z.enum(["true", "false"]).optional(),
        search: z.string().trim().min(1).max(100).optional(),
    }),
};

export const userIdSchema = { params: z.object({ id: objectIdSchema }) };

export const createUserSchema = {
    body: z.object({
        name: z.string().trim().min(1).max(100),
        email: emailSchema,
        phone: phoneSchema.optional(),
        password: passwordSchema,
        role: z.enum(STAFF_ROLES),
    }),
};

export const updateUserSchema = {
    params: z.object({ id: objectIdSchema }),
    // Field yang boleh diubah ditulis eksplisit (SPEC 24: hindari mass
    // assignment). role dan password sengaja TIDAK ada di sini.
    body: z
        .object({
            name: z.string().trim().min(1).max(100).optional(),
            email: emailSchema.optional(),
            phone: phoneSchema.optional(),
        })
        .refine((body) => Object.keys(body).length > 0, "Tidak ada field yang diubah"),
};

export const updateUserStatusSchema = {
    params: z.object({ id: objectIdSchema }),
    body: z.object({ isActive: z.boolean() }),
};
