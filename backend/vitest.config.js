import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.js"],
        // Menyalakan MongoDB di memori butuh waktu pada run pertama.
        hookTimeout: 120000,
        testTimeout: 30000,
        // Diset sebelum .env dibaca, dan dotenv tidak menimpa variabel yang
        // sudah ada. MONGODB_URI sengaja diisi alamat palsu supaya tes tidak
        // mungkin menyentuh Atlas; tes selalu memakai database di memori.
        env: {
            NODE_ENV: "test",
            LOG_LEVEL: "fatal",
            MONGODB_URI: "mongodb://tes-harus-pakai-memory-server.invalid/motobase",
            JWT_ACCESS_SECRET: "secret-access-khusus-tes-minimal-32-karakter",
            JWT_REFRESH_SECRET: "secret-refresh-khusus-tes-minimal-32-karakter",
            BCRYPT_SALT_ROUNDS: "10",
        },
    },
});
