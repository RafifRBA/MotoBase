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

// Sama dengan form kendaraan staf, tanpa customerId: pemilik selalu akun yang login.
export const createOwnVehicleSchema = {
    body: createVehicleSchema.body.omit({ customerId: true }),
};
