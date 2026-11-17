import PDFDocument from "pdfkit";
import { fileURLToPath } from "node:url";

// Salinan logo ada di backend/assets agar ikut ter-deploy (folder brand/ ada di luar backend).
const logo = fileURLToPath(new URL("../../../assets/receipt-logo.png", import.meta.url));
// Only explicitly selected customer-facing fields enter this snapshot.
export const receiptSnapshot = (order, customer, vehicle) => ({
    orderNumber: order.orderNumber,
    customerName: customer?.name ?? "Pelanggan",
    vehicle: [vehicle?.licensePlate, vehicle?.brand, vehicle?.model].filter(Boolean).join(" / "),
    completedAt: order.completedAt,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    paidAt: order.paidAt,
    serviceCost: order.serviceCost,
    partsSubtotal: order.partsSubtotal,
    grandTotal: order.grandTotal,
    parts: order.usedParts.map((p) => ({
        name: p.name,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        subtotal: p.subtotal,
    })),
});

export const rupiah = (amount) => `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
const date = (value) =>
    value ? new Date(value).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB" : "-";

export const generateReceiptPdf = (snapshot) =>
    new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: "A4",
            margin: 48,
            info: { Title: `Nota ${snapshot.orderNumber}`, Author: "MotoBase" },
        });
        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        doc.image(logo, 48, 48, { width: 175 });
        doc.y = 108;
        doc.fillColor("#D54D0A").fontSize(13).text("NOTA SERVIS");
        doc.moveDown().fillColor("#181B20").font("Helvetica").fontSize(10);
        doc.text(`Nomor: ${snapshot.orderNumber}`);
        doc.text(`Pelanggan: ${snapshot.customerName}`);
        doc.text(`Kendaraan: ${snapshot.vehicle || "-"}`);
        doc.text(`Selesai: ${date(snapshot.completedAt)}`);
        doc.moveDown();
        const paid = snapshot.paymentStatus === "DIBAYAR";
        doc.font("Helvetica-Bold").text(paid ? "LUNAS" : "BELUM DIBAYAR - bukan bukti pembayaran");
        if (paid)
            doc.font("Helvetica").text(
                `Metode: ${snapshot.paymentMethod ?? "-"} | Dibayar: ${date(snapshot.paidAt)}`,
            );
        doc.moveDown();

        const header = () => {
            doc.font("Helvetica-Bold").fontSize(10).text("Rincian suku cadang");
            doc.moveDown(0.5);
        };
        header();
        if (!snapshot.parts.length) doc.font("Helvetica").text("Tidak ada suku cadang.");
        for (const part of snapshot.parts) {
            doc.font("Helvetica").fontSize(10);
            const text = `${part.name}\n${part.quantity} x ${rupiah(part.unitPrice)} = ${rupiah(part.subtotal)}`;
            const height = doc.heightOfString(text, { width: 490 }) + 12;
            if (doc.y + height > 730) {
                doc.addPage();
                header();
            }
            doc.text(text, { width: 490 }).moveDown(0.7);
        }
        if (doc.y > 620) doc.addPage();
        doc.moveDown()
            .font("Helvetica")
            .text(`Biaya jasa: ${rupiah(snapshot.serviceCost)}`);
        doc.text(`Suku cadang: ${rupiah(snapshot.partsSubtotal)}`);
        doc.moveDown(0.5)
            .font("Helvetica-Bold")
            .fontSize(15)
            .text(`TOTAL: ${rupiah(snapshot.grandTotal)}`);
        doc.moveDown()
            .font("Helvetica")
            .fontSize(9)
            .fillColor("#526071")
            .text("Terima kasih telah mempercayakan servis kendaraan Anda kepada kami.");
        doc.end();
    });
