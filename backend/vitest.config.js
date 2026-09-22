import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.js"],
        // Diset sebelum .env dibaca, dan dotenv tidak menimpa variabel yang
        // sudah ada. Jadi log request tidak membanjiri output tes.
        env: {
            NODE_ENV: "test",
            LOG_LEVEL: "fatal",
        },
    },
});
