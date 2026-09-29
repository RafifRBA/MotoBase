import mongoose from "mongoose";
import z from "zod";

import { connectDB } from "../src/config/db.js";
import { hashPassword } from "../src/modules/auth/password.js";
import { RefreshToken } from "../src/modules/auth/refresh-token.model.js";
import { User } from "../src/modules/users/user.model.js";

// Sama seperti seed-owner: variabel dibaca dari environment saat dijalankan,
// bukan dari .env, supaya password tidak tertinggal di file mana pun.
const schema = z.object({
    RESET_EMAIL: z.string().trim().pipe(z.email()),
    RESET_PASSWORD: z
        .string()
        .min(8, "Password minimal 8 karakter")
        .refine((v) => Buffer.byteLength(v, "utf8") <= 72, "Password maksimal 72 byte"),
});

async function resetPassword() {
    try {
        const input = schema.parse({
            RESET_EMAIL: process.env.RESET_EMAIL,
            RESET_PASSWORD: process.env.RESET_PASSWORD,
        });

        await connectDB();

        const user = await User.findOne({ email: input.RESET_EMAIL });
        if (!user) {
            console.error(`User dengan email ${input.RESET_EMAIL} tidak ditemukan.`);
            await mongoose.disconnect();
            process.exit(1);
        }

        user.passwordHash = await hashPassword(input.RESET_PASSWORD);
        await user.save();

        // Semua sesi lama dicabut: kalau password diganti karena dicurigai
        // bocor, perangkat yang masih login harus ikut terputus.
        const { modifiedCount } = await RefreshToken.updateMany(
            { userId: user._id, revokedAt: null },
            { $set: { revokedAt: new Date() } },
        );

        console.log(`Password ${user.email} (${user.role}) berhasil diganti.`);
        console.log(`${modifiedCount} sesi lama dicabut.`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("Input tidak valid:");
            error.issues.forEach((issue) =>
                console.error(`   - ${issue.path.join(".")}: ${issue.message}`),
            );
        } else {
            console.error(`Terjadi kesalahan: ${error.message}`);
        }

        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
        process.exit(1);
    }
}

resetPassword();
