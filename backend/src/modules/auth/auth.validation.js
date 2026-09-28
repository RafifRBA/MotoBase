import { z } from "zod";

import { normalizePhone } from "../../utils/phone.js";

// trim dulu lewat .pipe, baru formatnya diperiksa. Tanpa pipe, spasi di ujung
// membuat email yang sebenarnya benar jadi ditolak.
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

// bcrypt hanya memakai 72 byte pertama; sisanya diabaikan diam-diam.
export const passwordSchema = z
    .string()
    .min(8, "Password minimal 8 karakter")
    .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password maksimal 72 byte");

export const loginSchema = {
    body: z.object({
        email: emailSchema,
        // Saat login password tidak dicek panjang minimalnya: aturan panjang
        // hanya berlaku saat membuat akun. Batas atas tetap ada supaya bcrypt
        // tidak dibebani string raksasa.
        password: z.string().min(1, "Password wajib diisi").max(200),
    }),
};

export const registerCustomerSchema = {
    body: z.object({
        name: z.string().trim().min(1).max(100),
        phone: z
            .string()
            .transform((value) => normalizePhone(value))
            .refine((value) => value !== null, "Nomor telepon tidak valid"),
        email: emailSchema.optional(),
        password: passwordSchema,
    }),
};
