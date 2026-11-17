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

describe("receipt email via Brevo HTTPS API", () => {
    const job = {
        recipient: "customer@example.test",
        snapshot: {
            orderNumber: "SRV-20261116-0002",
            customerName: "Rafif",
            vehicle: "Honda Vario",
            paymentStatus: "DIBAYAR",
            paymentMethod: "TUNAI",
            serviceCost: 50000,
            partsSubtotal: 0,
            grandTotal: 50000,
            parts: [],
        },
    };

    it("posts sender, recipient and PDF attachment to Brevo", async () => {
        env.BREVO_API_KEY = "test-key";
        env.EMAIL_FROM = "MotoBase <workshop@example.test>";
        const fetchMock = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValue(new Response("{}", { status: 201 }));
        try {
            await sendReceiptEmail(job);
            const [url, init] = fetchMock.mock.calls.at(-1);
            const body = JSON.parse(init.body);
            expect(url).toBe("https://api.brevo.com/v3/smtp/email");
            expect(init.headers["api-key"]).toBe("test-key");
            expect(body.sender).toEqual({ name: "MotoBase", email: "workshop@example.test" });
            expect(body.to).toEqual([{ email: "customer@example.test" }]);
            expect(body.attachment[0].name).toBe("Nota-SRV-20261116-0002.pdf");
            expect(
                Buffer.from(body.attachment[0].content, "base64").subarray(0, 5).toString(),
            ).toBe("%PDF-");
        } finally {
            fetchMock.mockRestore();
            delete env.BREVO_API_KEY;
        }
    });

    it("fails with a safe code when Brevo rejects the request", async () => {
        env.BREVO_API_KEY = "bad-key";
        env.EMAIL_FROM = "workshop@example.test";
        const fetchMock = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValue(new Response('{"message":"Key not found"}', { status: 401 }));
        try {
            await expect(sendReceiptEmail(job)).rejects.toMatchObject({
                code: "BREVO_HTTP_ERROR",
                responseCode: 401,
            });
        } finally {
            fetchMock.mockRestore();
            delete env.BREVO_API_KEY;
        }
    });
});
