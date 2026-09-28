import { describe, expect, it } from "vitest";

import { maskEmail } from "../../src/utils/mask.js";

describe("maskEmail", () => {
    it("menyisakan dua huruf pertama dan domain", () => {
        expect(maskEmail("kasir@lajujaya.id")).toBe("ka***@lajujaya.id");
    });

    it("local part pendek tetap tersamarkan", () => {
        expect(maskEmail("a@x.com")).toBe("a*@x.com");
    });

    it("input yang bukan email tidak membocorkan apa pun", () => {
        expect(maskEmail("bukan-email")).toBe("***");
        expect(maskEmail(null)).toBe("***");
    });
});
