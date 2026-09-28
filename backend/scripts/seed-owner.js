import mongoose from "mongoose";
import z from "zod";
import { User, ROLES } from "../src/modules/users/user.model.js";
import { hashPassword } from "../src/modules/auth/password.js";
import { connectDB } from "../src/config/db.js";

const seedSchema = z.object({
    SEED_OWNER_NAME: z.string().trim().min(1),

    SEED_OWNER_EMAIL: z.string().trim().pipe(z.email()),

    SEED_OWNER_PASSWORD: z
        .string()
        .min(8)
        .refine((val) => Buffer.byteLength(val, "utf8") <= 72, {
            message: "Password terlalu panjang! Batas maksimum adalah 72byte",
        }),
});

async function runSeed() {
    try {
        const envData = seedSchema.parse({
            SEED_OWNER_NAME: process.env.SEED_OWNER_NAME,
            SEED_OWNER_EMAIL: process.env.SEED_OWNER_EMAIL,
            SEED_OWNER_PASSWORD: process.env.SEED_OWNER_PASSWORD,
        });

        await connectDB();

        const isOwnerExist = await User.exists({ role: ROLES.OWNER });
        if (isOwnerExist) {
            console.log("OWNER sudah ada. Tidak ada user yang dibuat.");
            await mongoose.disconnect();
            process.exit(0);
        }

        const securePassword = await hashPassword(envData.SEED_OWNER_PASSWORD);
        const owner = await User.create({
            name: envData.SEED_OWNER_NAME,
            email: envData.SEED_OWNER_EMAIL,
            passwordHash: securePassword,
            role: ROLES.OWNER,
            isActive: true,
        });

        console.log(`OWNER berhasil dibuat: ${owner.email}`);
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("Gagal Validasi Argumen:");
            error.issues.forEach((issue) =>
                console.error(`   - ${issue.path.join(".")}: ${issue.message}`),
            );
        } else {
            console.error(`Terjadi kesalahan sistem internal: ${error.message}`);
        }

        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        process.exit(1);
    }
}

runSeed();
