import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
    { ignores: ["node_modules/**", "coverage/**"] },
    {
        files: ["**/*.{js,mjs,cjs}"],
        plugins: { js },
        extends: ["js/recommended"],
        languageOptions: { globals: globals.node },
        rules: {
            // Parameter berawalan _ boleh tidak dipakai. Berguna untuk `next` di
            // error handler, yang wajib ada supaya Express mengenalinya.
            "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
        },
    },
    {
        files: ["tests/**/*.js"],
        languageOptions: { globals: { ...globals.node, ...globals.vitest } },
    },
]);
