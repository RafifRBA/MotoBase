import { describe, expect, it } from "vitest";

import { maskPhone, normalizePhone } from "../../src/utils/phone.js";

describe("normalizePhone", () => {
    it.each([
        ["081234567890", "6281234567890"],
        ["+6281234567890", "6281234567890"],
        ["6281234567890", "6281234567890"],
        ["81234567890", "6281234567890"],
        ["0812-3456-7890", "6281234567890"],
        ["+62 812 3456 7890", "6281234567890"],
        ["(0812) 3456.7890", "6281234567890"],
    ])("%s menjadi %s", (input, expected) => {
        expect(normalizePhone(input)).toBe(expected);
    });

    it.each([
        ["", "string kosong"],
        ["abcdefghij", "huruf"],
        ["0812", "terlalu pendek"],
        ["081234567890123456", "terlalu panjang"],
        ["12345678901", "awalan tidak dikenal"],
        [null, "null"],
        [undefined, "undefined"],
        [6281234567890, "angka, bukan string"],
    ])("menolak %s (%s)", (input) => {
        expect(normalizePhone(input)).toBeNull();
    });
});

describe("maskPhone", () => {
    it("menyisakan awalan dan 3 digit terakhir", () => {
        expect(maskPhone("6281234567890")).toBe("6281******890");
    });

    it("input tidak wajar tetap aman", () => {
        expect(maskPhone(null)).toBe("***");
        expect(maskPhone("62")).toBe("***");
    });
});
