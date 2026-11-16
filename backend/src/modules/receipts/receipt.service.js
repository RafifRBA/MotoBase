import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { env } from "../../config/env.js";
import ApiError from "../../utils/api-error.js";
import logger from "../../utils/logger.js";
import { Customer } from "../customers/customer.model.js";
import { Vehicle } from "../vehicles/vehicle.model.js";
import { ServiceOrder } from "../service-orders/service-order.model.js";
import { generateReceiptPdf, receiptSnapshot, rupiah } from "./receipt.pdf.js";

export const prepareReceiptEmail = async (order) => {
    const [customer, vehicle] = await Promise.all([
        Customer.findById(order.customerId),
        Vehicle.findById(order.vehicleId),
    ]);
    const reason = !customer?.email
        ? "missing_email"
        : !env.EMAIL_ENABLED
          ? "email_disabled"
          : null;
    return {
        status: reason ? "skipped" : "pending",
        reason,
        attempts: 0,
        nextAttemptAt: reason ? null : new Date(),
        leaseUntil: null,
        claimId: null,
        sentAt: null,
        recipient: customer?.email ?? null,
        snapshot: receiptSnapshot(order, customer, vehicle),
    };
};

export const retryReceiptEmail = async (id) => {
    const order = await ServiceOrder.findById(id);
    if (!order) throw new ApiError(404, "SERVICE_ORDER_NOT_FOUND", "Servis tidak ditemukan");
    if (!["SELESAI", "DIAMBIL"].includes(order.currentStatus)) {
        throw new ApiError(
            409,
            "ORDER_NOT_READY_FOR_RECEIPT",
            "Nota hanya tersedia setelah servis selesai",
        );
    }
    const receiptEmail = await prepareReceiptEmail(order);
    if (receiptEmail.reason === "missing_email")
        throw new ApiError(409, "CUSTOMER_EMAIL_REQUIRED", "Isi surel pelanggan terlebih dahulu");
    if (receiptEmail.reason === "email_disabled")
        throw new ApiError(503, "EMAIL_DISABLED", "Pengiriman surel belum dikonfigurasi");
    const updated = await ServiceOrder.findOneAndUpdate(
        {
            _id: id,
            currentStatus: { $in: ["SELESAI", "DIAMBIL"] },
            "receiptEmail.status": { $nin: ["pending", "processing"] },
        },
        { $set: { receiptEmail } },
        { returnDocument: "after" },
    );
    if (!updated)
        throw new ApiError(409, "RECEIPT_ALREADY_QUEUED", "Nota sudah dalam antrean pengiriman");
    return updated;
};

let transport;
const getTransport = () =>
    (transport ??= nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
    }));

export const sendReceiptEmail = async (job) => {
    const s = job.snapshot;
    const paid = s.paymentStatus === "DIBAYAR";
    await getTransport().sendMail({
        from: env.EMAIL_FROM,
        to: job.recipient,
        subject: `Nota servis ${s.orderNumber} - MotoBase`,
        text: `Halo ${s.customerName},\n\nServis kendaraan Anda telah selesai.\nNomor: ${s.orderNumber}\nTotal: ${rupiah(s.grandTotal)}\nStatus pembayaran: ${paid ? "Lunas" : "Belum dibayar"}\n\nNota servis terlampir. Terima kasih.\nMotoBase`,
        attachments: [
            {
                filename: `Nota-${s.orderNumber}.pdf`,
                content: await generateReceiptPdf(s),
                contentType: "application/pdf",
            },
        ],
    });
};

// A lease lets a different worker recover a job after a process crash.
// SMTP is at-least-once: a crash after provider acceptance can cause a duplicate.
export const processReceiptEmail = async (send = sendReceiptEmail, now = new Date()) => {
    const claimId = randomUUID();
    const order = await ServiceOrder.findOneAndUpdate(
        {
            $or: [
                {
                    "receiptEmail.status": { $in: ["pending", "failed"] },
                    "receiptEmail.attempts": { $lt: 5 },
                    "receiptEmail.nextAttemptAt": { $lte: now },
                },
                { "receiptEmail.status": "processing", "receiptEmail.leaseUntil": { $lte: now } },
            ],
        },
        {
            $set: {
                "receiptEmail.status": "processing",
                "receiptEmail.claimId": claimId,
                "receiptEmail.leaseUntil": new Date(now.getTime() + 300000),
            },
            $inc: { "receiptEmail.attempts": 1 },
        },
        { returnDocument: "after", sort: { "receiptEmail.nextAttemptAt": 1 } },
    );
    if (!order) return false;
    const filter = { _id: order._id, "receiptEmail.claimId": claimId };
    try {
        await send(order.receiptEmail);
        await ServiceOrder.updateOne(filter, {
            $set: {
                "receiptEmail.status": "sent",
                "receiptEmail.reason": null,
                "receiptEmail.sentAt": new Date(),
                "receiptEmail.leaseUntil": null,
                "receiptEmail.nextAttemptAt": null,
            },
        });
    } catch {
        // Provider errors can contain credentials/recipient details. Keep only a safe code.
        await ServiceOrder.updateOne(filter, {
            $set: {
                "receiptEmail.status": "failed",
                "receiptEmail.reason": "delivery_failed",
                "receiptEmail.leaseUntil": null,
                "receiptEmail.nextAttemptAt": new Date(
                    now.getTime() + Math.min(3600000, 60000 * 2 ** order.receiptEmail.attempts),
                ),
            },
        });
        logger.warn(
            { orderId: order.id, attempts: order.receiptEmail.attempts },
            "Pengiriman nota gagal; akan dicoba ulang",
        );
    }
    return true;
};

export const startReceiptWorker = () => {
    if (!env.EMAIL_ENABLED) return;
    let busy = false;
    const tick = async () => {
        if (busy) return;
        busy = true;
        try {
            for (let count = 0; count < 10 && (await processReceiptEmail()); count += 1) {
                /* drain bounded batch */
            }
        } catch {
            logger.error("Worker nota gagal mengakses database");
        } finally {
            busy = false;
        }
    };
    void tick();
    const timer = setInterval(tick, 10000);
    timer.unref();
};
