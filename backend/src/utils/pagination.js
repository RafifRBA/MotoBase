import { z } from "zod";

// Dipakai semua endpoint daftar. limit dibatasi 100 supaya tidak ada yang bisa
// meminta 1.000.000 dokumen sekaligus.
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const toSkip = ({ page, limit }) => (page - 1) * limit;

export const buildMeta = ({ page, limit, total }) => ({
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
});

// Input pencarian dari pengguna dipakai di regex MongoDB, jadi karakter khusus
// harus dilucuti. Tanpa ini, input seperti "(((((" bisa membuat query berat.
export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
