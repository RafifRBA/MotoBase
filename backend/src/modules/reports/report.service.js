import { ServiceOrder } from "../service-orders/service-order.model.js";
import { ORDER_STATUS } from "../service-orders/service-order.status.js";
import { SparePart } from "../spare-parts/spare-part.model.js";
import { lowStockFilter } from "../spare-parts/spare-part.service.js";
import { MOVEMENT_TYPES, StockMovement } from "../stock-movements/stock-movement.model.js";

// "2026-09-26" diartikan JavaScript sebagai tengah malam UTC, sedangkan
// serviceDate disimpan sebagai tengah malam waktu LOKAL bengkel. Tanpa
// penyesuaian ini, laporan "hari ini" melewatkan servis hari ini (selisih 7
// jam untuk WIB). Komponen tanggal dibaca sebagai UTC, lalu dibentuk ulang
// menjadi awal/akhir hari waktu lokal.
const localStartOfDay = (date) =>
    new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0);

const localEndOfDay = (date) =>
    new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999);

const dateRange = ({ startDate, endDate }) => {
    const range = {};
    if (startDate) range.$gte = localStartOfDay(startDate);
    if (endDate) range.$lte = localEndOfDay(endDate);
    return Object.keys(range).length > 0 ? range : null;
};

const orderFilter = (query) => {
    const range = dateRange(query);
    return range ? { serviceDate: range } : {};
};

export const serviceSummary = async (query) => {
    const filter = orderFilter(query);

    const [perStatus, total] = await Promise.all([
        ServiceOrder.aggregate([
            { $match: filter },
            { $group: { _id: "$currentStatus", jumlah: { $sum: 1 } } },
        ]),
        ServiceOrder.countDocuments(filter),
    ]);

    // Semua status selalu muncul, walaupun nol, supaya bentuk response stabil
    // dan frontend tidak perlu menangani field yang hilang.
    const byStatus = Object.fromEntries(Object.values(ORDER_STATUS).map((s) => [s, 0]));
    for (const row of perStatus) byStatus[row._id] = row.jumlah;

    const selesai = await ServiceOrder.aggregate([
        {
            $match: {
                ...filter,
                completedAt: { $ne: null },
            },
        },
        {
            $group: {
                _id: null,
                rataRataJam: { $avg: { $subtract: ["$completedAt", "$createdAt"] } },
            },
        },
    ]);

    return {
        totalOrder: total,
        byStatus,
        // Dibulatkan ke satu desimal; null kalau belum ada servis yang selesai.
        rataRataJamPengerjaan: selesai.length
            ? Math.round((selesai[0].rataRataJam / 3_600_000) * 10) / 10
            : null,
    };
};

export const revenueSummary = async (query) => {
    const range = dateRange(query);
    const filter = { paymentStatus: "DIBAYAR" };
    if (range) filter.paidAt = range;

    const [ringkasan] = await ServiceOrder.aggregate([
        { $match: filter },
        {
            $group: {
                _id: null,
                totalPendapatan: { $sum: "$grandTotal" },
                pendapatanJasa: { $sum: "$serviceCost" },
                pendapatanSukuCadang: { $sum: "$partsSubtotal" },
                jumlahTransaksi: { $sum: 1 },
            },
        },
    ]);

    const perMetode = await ServiceOrder.aggregate([
        { $match: filter },
        { $group: { _id: "$paymentMethod", total: { $sum: "$grandTotal" }, jumlah: { $sum: 1 } } },
    ]);

    // Order yang sudah selesai tapi belum dibayar: uang yang masih tertahan.
    const belumDibayarFilter = { paymentStatus: "BELUM_DIBAYAR", ...orderFilter(query) };
    const [belumDibayar] = await ServiceOrder.aggregate([
        { $match: belumDibayarFilter },
        { $group: { _id: null, total: { $sum: "$grandTotal" }, jumlah: { $sum: 1 } } },
    ]);

    return {
        totalPendapatan: ringkasan?.totalPendapatan ?? 0,
        pendapatanJasa: ringkasan?.pendapatanJasa ?? 0,
        pendapatanSukuCadang: ringkasan?.pendapatanSukuCadang ?? 0,
        jumlahTransaksi: ringkasan?.jumlahTransaksi ?? 0,
        perMetodePembayaran: perMetode.map((row) => ({
            metode: row._id,
            total: row.total,
            jumlah: row.jumlah,
        })),
        belumDibayar: {
            total: belumDibayar?.total ?? 0,
            jumlah: belumDibayar?.jumlah ?? 0,
        },
    };
};

// includeCost hanya true untuk OWNER: harga modal dan margin bukan konsumsi
// admin.
export const partsUsage = async (query, { includeCost = false } = {}) => {
    const range = dateRange(query);
    const match = { type: MOVEMENT_TYPES.USAGE };
    if (range) match.createdAt = range;

    const rows = await StockMovement.aggregate([
        { $match: match },
        {
            $group: {
                _id: "$sparePartId",
                totalDipakai: { $sum: "$quantity" },
                jumlahTransaksi: { $sum: 1 },
            },
        },
        { $sort: { totalDipakai: -1 } },
        { $limit: 50 },
    ]);

    const parts = await SparePart.find({ _id: { $in: rows.map((r) => r._id) } });
    const byId = new Map(parts.map((part) => [part.id, part]));

    return rows.map((row) => {
        const part = byId.get(row._id.toString());
        const totalDipakai = row.totalDipakai;
        const pendapatan = (part?.sellingPrice ?? 0) * totalDipakai;

        const hasil = {
            sparePartId: row._id.toString(),
            sku: part?.sku ?? null,
            name: part?.name ?? null,
            totalDipakai,
            jumlahTransaksi: row.jumlahTransaksi,
            pendapatan,
            sisaStok: part?.currentStock ?? null,
        };

        if (includeCost && part) {
            hasil.modal = part.purchasePrice * totalDipakai;
            hasil.margin = pendapatan - part.purchasePrice * totalDipakai;
        }

        return hasil;
    });
};

export const lowStockReport = async () => {
    const filter = lowStockFilter();
    const parts = await SparePart.find(filter).sort({ currentStock: 1 });

    return parts.map((part) => ({
        sparePartId: part.id,
        sku: part.sku,
        name: part.name,
        currentStock: part.currentStock,
        minimumStock: part.minimumStock,
        unit: part.unit,
        kekurangan: Math.max(part.minimumStock - part.currentStock, 0),
    }));
};

export const mechanicPerformance = async (query) => {
    const filter = {
        ...orderFilter(query),
        assignedMechanicId: { $ne: null },
    };

    const rows = await ServiceOrder.aggregate([
        { $match: filter },
        {
            $group: {
                _id: "$assignedMechanicId",
                totalOrder: { $sum: 1 },
                selesai: {
                    $sum: {
                        $cond: [
                            {
                                $in: [
                                    "$currentStatus",
                                    [ORDER_STATUS.SELESAI, ORDER_STATUS.DIAMBIL],
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                },
                dibatalkan: {
                    $sum: { $cond: [{ $eq: ["$currentStatus", ORDER_STATUS.DIBATALKAN] }, 1, 0] },
                },
                totalNilaiServis: { $sum: "$grandTotal" },
                rataRataMs: {
                    $avg: {
                        $cond: [
                            { $ne: ["$completedAt", null] },
                            { $subtract: ["$completedAt", "$createdAt"] },
                            null,
                        ],
                    },
                },
            },
        },
        { $sort: { selesai: -1 } },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "mekanik",
            },
        },
    ]);

    return rows.map((row) => ({
        mechanicId: row._id.toString(),
        name: row.mekanik[0]?.name ?? null,
        totalOrder: row.totalOrder,
        selesai: row.selesai,
        dibatalkan: row.dibatalkan,
        totalNilaiServis: row.totalNilaiServis,
        rataRataJamPengerjaan: row.rataRataMs
            ? Math.round((row.rataRataMs / 3_600_000) * 10) / 10
            : null,
    }));
};
