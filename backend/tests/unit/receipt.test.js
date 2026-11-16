import { describe, expect, it } from "vitest";
import { generateReceiptPdf, receiptSnapshot } from "../../src/modules/receipts/receipt.pdf.js";

describe("receipt PDF", () => {
    it("uses an allowlist and renders long orders into a valid PDF", async () => {
        const snapshot = receiptSnapshot(
            {
                orderNumber: "SRV-20261116-0001",
                serviceCost: 50000,
                partsSubtotal: 2500000,
                grandTotal: 2550000,
                paymentStatus: "BELUM_DIBAYAR",
                internalNotes: "never expose this",
                usedParts: Array.from({ length: 100 }, () => ({
                    name: "Busi NGK",
                    quantity: 1,
                    unitPrice: 25000,
                    subtotal: 25000,
                    purchasePrice: 18000,
                })),
            },
            { name: "Pelanggan", phone: "secret phone" },
            { licensePlate: "AB 1234 XY" },
        );
        expect(JSON.stringify(snapshot)).not.toMatch(
            /purchasePrice|internalNotes|phone|never expose/,
        );
        const pdf = await generateReceiptPdf(snapshot);
        expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
        expect(pdf.length).toBeGreaterThan(5000);
    });
});
