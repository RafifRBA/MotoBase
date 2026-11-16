import nodemailer from "nodemailer";
import { afterAll, describe, expect, it, vi } from "vitest";
import { env } from "../../src/config/env.js";
import { sendReceiptEmail } from "../../src/modules/receipts/receipt.service.js";

// Exercise actual MIME generation without contacting a provider or sending mail.
const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
vi.spyOn(nodemailer, "createTransport").mockReturnValue(transport);
const send = vi.spyOn(transport, "sendMail");
afterAll(() => vi.restoreAllMocks());

describe("receipt email transport", () => {
    it.each(["BELUM_DIBAYAR", "DIBAYAR"])(
        "attaches a PDF and accurately labels %s",
        async (paymentStatus) => {
            env.EMAIL_FROM = "MotoBase <workshop@example.test>";
            await sendReceiptEmail({
                recipient: "customer@example.test",
                snapshot: {
                    orderNumber: "SRV-20261116-0001",
                    customerName: "Rafif",
                    vehicle: "Honda Vario",
                    paymentStatus,
                    paymentMethod: paymentStatus === "DIBAYAR" ? "TUNAI" : null,
                    serviceCost: 50000,
                    partsSubtotal: 0,
                    grandTotal: 50000,
                    parts: [],
                },
            });
            const message = send.mock.calls.at(-1)[0];
            expect(message.to).toBe("customer@example.test");
            expect(message.text).toContain(
                paymentStatus === "DIBAYAR"
                    ? "Status pembayaran: Lunas"
                    : "Status pembayaran: Belum dibayar",
            );
            expect(message.attachments[0].content.subarray(0, 5).toString()).toBe("%PDF-");
            const result = await send.mock.results.at(-1).value;
            expect(result.message.toString()).toContain("application/pdf");
            expect(result.message.toString()).toContain("Nota-SRV-20261116-0001.pdf");
        },
    );
});
