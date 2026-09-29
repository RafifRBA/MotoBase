import { z } from "zod";

import { paginationSchema } from "../../utils/pagination.js";
import { emailSchema } from "../auth/auth.validation.js";
import { objectIdSchema, phoneSchema } from "../users/user.validation.js";

export const customerIdSchema = { params: z.object({ id: objectIdSchema }) };

export const listCustomersSchema = {
    query: paginationSchema.extend({
        search: z.string().trim().min(1).max(100).optional(),
    }),
};

export const createCustomerSchema = {
    body: z.object({
        name: z.string().trim().min(1).max(100),
        phone: phoneSchema,
        email: emailSchema.optional(),
        address: z.string().trim().max(500).optional(),
        notes: z.string().trim().max(1000).optional(),
    }),
};

export const updateCustomerSchema = {
    params: z.object({ id: objectIdSchema }),
    body: z
        .object({
            name: z.string().trim().min(1).max(100).optional(),
            phone: phoneSchema.optional(),
            email: emailSchema.optional(),
            address: z.string().trim().max(500).optional(),
            notes: z.string().trim().max(1000).optional(),
        })
        .refine((body) => Object.keys(body).length > 0, "Tidak ada field yang diubah"),
};

export const customerOrdersSchema = {
    params: z.object({ id: objectIdSchema }),
    query: paginationSchema,
};
