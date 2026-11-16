import { z } from "zod";

import { paginationSchema } from "../../utils/pagination.js";
import { emailSchema, passwordSchema } from "../auth/auth.validation.js";
import { phoneSchema } from "../users/user.validation.js";
import { createVehicleSchema } from "../vehicles/vehicle.validation.js";

export const registerCustomerSchema = {
    body: z.object({
        name: z.string().trim().min(2).max(100),
        email: emailSchema,
        phone: phoneSchema,
        password: passwordSchema,
    }),
};

export const listOwnSchema = { query: paginationSchema };

// Hanya data yang memang milik pelanggan. Email adalah identitas login, dan
// catatan (notes) adalah catatan pribadi staf, jadi keduanya tidak bisa diubah di sini.
export const updateProfileSchema = {
    body: z
        .object({
            name: z.string().trim().min(2).max(100).optional(),
            phone: phoneSchema.optional(),
            // String kosong berarti mengosongkan alamat.
            address: z.string().trim().max(500).optional(),
        })
        .refine((body) => Object.keys(body).length > 0, "Tidak ada field yang diubah"),
};

// Sama dengan form kendaraan staf, tanpa customerId: pemilik selalu akun yang login.
export const createOwnVehicleSchema = {
    body: createVehicleSchema.body.omit({ customerId: true }),
};
