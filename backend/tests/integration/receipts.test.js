import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../../src/config/env.js";
import { Customer } from "../../src/modules/customers/customer.model.js";
import { ServiceOrder } from "../../src/modules/service-orders/service-order.model.js";
import { processReceiptEmail } from "../../src/modules/receipts/receipt.service.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../helpers/db.js";
import { advanceTo, createOrder, seedWorkshop } from "../helpers/seed.js";

beforeAll(connectTestDB);
beforeEach(() => {
    env.EMAIL_ENABLED = true;
});
afterEach(async () => {
    env.EMAIL_ENABLED = false;
    await clearTestDB();
});
afterAll(disconnectTestDB);

const complete = async ({ email = "customer@example.test", enabled = true } = {}) => {
    const context = await seedWorkshop();
    if (email) await Customer.updateOne({ _id: context.customer.id }, { email });
    const order = await createOrder(context.admin, {
        ...context,
        serviceCost: 50000,
        internalNotes: "SECRET INTERNAL NOTE",
    });
    env.EMAIL_ENABLED = enabled;
    await advanceTo(context.admin, order.id, "SELESAI");
    return { ...context, order };
};

describe("Nota servis", () => {
    it("concurrent completion records only one transition and email", async () => {
        const context = await seedWorkshop();
        await Customer.updateOne({ _id: context.customer.id }, { email: "customer@example.test" });
        const order = await createOrder(context.admin, context);
        await advanceTo(context.admin, order.id, "DIKERJAKAN");
        const results = await Promise.all(
            Array.from({ length: 4 }, () =>
                context.admin
                    .patch(`/api/v1/service-orders/${order.id}/status`)
                    .send({ status: "SELESAI" }),
            ),
        );
        expect(results.filter((result) => result.status === 200)).toHaveLength(1);
        expect(results.filter((result) => result.status === 409)).toHaveLength(3);
        const stored = await ServiceOrder.findById(order.id);
        expect(stored.statusHistory.filter((entry) => entry.to === "SELESAI")).toHaveLength(1);
        expect(stored.receiptEmail.status).toBe("pending");
    });

    it("completion persists one private snapshot and a pending email", async () => {
        const { admin, order } = await complete();
        const stored = await ServiceOrder.findById(order.id);
        expect(stored.receiptEmail.status).toBe("pending");
        expect(stored.receiptEmail.snapshot.grandTotal).toBe(50000);
        expect(stored.receiptEmail.snapshot.paymentStatus).toBe("BELUM_DIBAYAR");
        expect(JSON.stringify(stored.receiptEmail.snapshot)).not.toContain("SECRET INTERNAL NOTE");
        const response = await admin.get(`/api/v1/service-orders/${order.id}`);
        expect(response.body.data.receiptEmail.status).toBe("pending");
        expect(JSON.stringify(response.body.data.receiptEmail)).not.toMatch(
            /snapshot|recipient|claimId/,
        );
        const duplicate = await admin
            .patch(`/api/v1/service-orders/${order.id}/status`)
            .send({ status: "SELESAI" });
        expect(duplicate.status).toBe(409);
    });

    it.each([
        { email: null, reason: "missing_email" },
        { enabled: false, reason: "email_disabled" },
    ])("does not block completion when $reason", async (options) => {
        const { order } = await complete(options);
        const stored = await ServiceOrder.findById(order.id);
        expect(stored.currentStatus).toBe("SELESAI");
        expect(stored.receiptEmail.status).toBe("skipped");
        expect(stored.receiptEmail.reason).toBe(options.reason);
    });

    it("two workers claim only one delivery and sent jobs are not sent again", async () => {
        await complete();
        const send = vi.fn().mockResolvedValue(undefined);
        await Promise.all([processReceiptEmail(send), processReceiptEmail(send)]);
        await processReceiptEmail(send);
        expect(send).toHaveBeenCalledTimes(1);
        expect(await ServiceOrder.countDocuments({ "receiptEmail.status": "sent" })).toBe(1);
    });

    it("delivery failure preserves service status and can retry later", async () => {
        const { order } = await complete();
        const now = new Date();
        await processReceiptEmail(
            vi.fn().mockRejectedValue(new Error("SMTP credentials secret")),
            now,
        );
        const failed = await ServiceOrder.findById(order.id);
        expect(failed.currentStatus).toBe("SELESAI");
        expect(failed.receiptEmail.status).toBe("failed");
        expect(JSON.stringify(failed.receiptEmail)).not.toContain("SMTP credentials secret");
        const send = vi.fn().mockResolvedValue(undefined);
        expect(await processReceiptEmail(send, now)).toBe(false);
        await processReceiptEmail(send, failed.receiptEmail.nextAttemptAt);
        expect(send).toHaveBeenCalledTimes(1);
        expect((await ServiceOrder.findById(order.id)).receiptEmail.status).toBe("sent");
    });

    it("recovers expired worker leases and stops automatic retries after five failures", async () => {
        const { order } = await complete();
        await ServiceOrder.updateOne(
            { _id: order.id },
            {
                $set: {
                    "receiptEmail.status": "processing",
                    "receiptEmail.leaseUntil": new Date(0),
                    "receiptEmail.attempts": 4,
                },
            },
        );
        await processReceiptEmail(vi.fn().mockRejectedValue(new Error("offline")));
        const stored = await ServiceOrder.findById(order.id);
        expect(stored.receiptEmail.attempts).toBe(5);
        expect(await processReceiptEmail(vi.fn(), new Date(Date.now() + 86400000))).toBe(false);
    });

    it("admin can resend after adding a missing email, and pending replays are rejected", async () => {
        const { admin, mechanic, customer, order } = await complete({ email: null });
        const url = `/api/v1/service-orders/${order.id}/resend-receipt`;
        expect((await mechanic.post(url)).status).toBe(403);
        expect((await admin.post(url)).body.error.code).toBe("CUSTOMER_EMAIL_REQUIRED");
        await Customer.updateOne({ _id: customer.id }, { email: "new@example.test" });
        expect((await admin.post(url)).status).toBe(202);
        expect((await admin.post(url)).body.error.code).toBe("RECEIPT_ALREADY_QUEUED");
        expect((await ServiceOrder.findById(order.id)).receiptEmail.recipient).toBe(
            "new@example.test",
        );
    });

    it("resend after payment snapshots the paid amounts and does not leak into public tracking", async () => {
        const { admin, order } = await complete();
        await processReceiptEmail(vi.fn().mockResolvedValue(undefined));
        await admin.post(`/api/v1/service-orders/${order.id}/payment`).send({ method: "TUNAI" });
        expect((await admin.post(`/api/v1/service-orders/${order.id}/resend-receipt`)).status).toBe(
            202,
        );
        expect((await ServiceOrder.findById(order.id)).receiptEmail.snapshot.paymentStatus).toBe(
            "DIBAYAR",
        );
        const { app, request } = await import("../helpers/api.js");
        const tracking = await request(app).get(
            `/api/v1/public/service-orders/track/${order.trackingToken}`,
        );
        expect(JSON.stringify(tracking.body)).not.toMatch(
            /receiptEmail|customer@example.test|SECRET INTERNAL NOTE/,
        );
    });

    it("rejects sending before completion and while email is disabled", async () => {
        const context = await seedWorkshop();
        const order = await createOrder(context.admin, context);
        const url = `/api/v1/service-orders/${order.id}/resend-receipt`;
        expect((await context.admin.post(url)).body.error.code).toBe("ORDER_NOT_READY_FOR_RECEIPT");
        await Customer.updateOne({ _id: context.customer.id }, { email: "customer@example.test" });
        env.EMAIL_ENABLED = false;
        await advanceTo(context.admin, order.id, "SELESAI");
        expect((await context.admin.post(url)).body.error.code).toBe("EMAIL_DISABLED");
    });
});
