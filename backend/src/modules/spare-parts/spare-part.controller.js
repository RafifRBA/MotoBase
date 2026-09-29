import { ROLES } from "../users/user.model.js";
import {
    listMovements,
    toStockMovementResponse,
} from "../stock-movements/stock-movement.controller.js";
import * as sparePartService from "./spare-part.service.js";

// Harga modal hanya untuk pemilik; kasir dan mekanik cukup harga jual.
const canSeeCostPrice = (user) => user?.role === ROLES.OWNER;

const toSparePartResponse = (part, { includeCostPrice = false } = {}) => {
    const response = {
        id: part.id,
        sku: part.sku,
        name: part.name,
        category: part.category ?? null,
        sellingPrice: part.sellingPrice,
        currentStock: part.currentStock,
        minimumStock: part.minimumStock,
        unit: part.unit,
        isActive: part.isActive,
        isLowStock: part.currentStock <= part.minimumStock,
        createdAt: part.createdAt,
        updatedAt: part.updatedAt,
    };

    if (includeCostPrice) response.purchasePrice = part.purchasePrice;

    return response;
};

export { canSeeCostPrice, toSparePartResponse };

// Header opsional. Kalau diisi, retry tidak akan mengubah stok dua kali.
const idempotencyKeyOf = (req) => {
    const key = req.get("idempotency-key");
    return typeof key === "string" && key.trim().length > 0 ? key.trim().slice(0, 128) : undefined;
};

export const list = async (req, res) => {
    const { parts, meta } = await sparePartService.listSpareParts(req.validated.query);
    const options = { includeCostPrice: canSeeCostPrice(req.user) };

    return res.status(200).json({
        success: true,
        data: parts.map((part) => toSparePartResponse(part, options)),
        meta,
    });
};

export const lowStock = async (req, res) => {
    const { parts, total } = await sparePartService.listLowStock();
    const options = { includeCostPrice: canSeeCostPrice(req.user) };

    return res.status(200).json({
        success: true,
        data: parts.map((part) => toSparePartResponse(part, options)),
        meta: { total },
    });
};

export const getById = async (req, res) => {
    const part = await sparePartService.getSparePartById(req.validated.params.id);

    return res.status(200).json({
        success: true,
        data: toSparePartResponse(part, { includeCostPrice: canSeeCostPrice(req.user) }),
    });
};

export const create = async (req, res) => {
    const part = await sparePartService.createSparePart(req.validated.body, req.user);

    return res.status(201).json({
        success: true,
        message: "Suku cadang berhasil dibuat",
        data: toSparePartResponse(part, { includeCostPrice: canSeeCostPrice(req.user) }),
    });
};

export const update = async (req, res) => {
    const part = await sparePartService.updateSparePart(
        req.validated.params.id,
        req.validated.body,
        req.user,
    );

    return res.status(200).json({
        success: true,
        message: "Suku cadang berhasil diperbarui",
        data: toSparePartResponse(part, { includeCostPrice: canSeeCostPrice(req.user) }),
    });
};

const sendStockResult = (req, res, message, { part, movement }) =>
    res.status(200).json({
        success: true,
        message,
        data: {
            sparePart: toSparePartResponse(part, { includeCostPrice: canSeeCostPrice(req.user) }),
            movement: toStockMovementResponse(movement),
            isLowStock: part.currentStock <= part.minimumStock,
        },
    });

export const stockIn = async (req, res) => {
    const result = await sparePartService.stockIn(
        req.validated.params.id,
        req.validated.body,
        req.user,
        idempotencyKeyOf(req),
    );

    return sendStockResult(req, res, "Stok masuk berhasil dicatat", result);
};

export const adjustStock = async (req, res) => {
    const result = await sparePartService.adjustStock(
        req.validated.params.id,
        req.validated.body,
        req.user,
        idempotencyKeyOf(req),
    );

    return sendStockResult(req, res, "Penyesuaian stok berhasil dicatat", result);
};

export const listMovementsOfPart = async (req, res) => {
    // Part-nya dipastikan ada supaya id ngawur menghasilkan 404, bukan daftar kosong.
    await sparePartService.getSparePartById(req.validated.params.id);

    const { movements, meta } = await listMovements({
        ...req.validated.query,
        sparePartId: req.validated.params.id,
    });

    return res.status(200).json({
        success: true,
        data: movements.map(toStockMovementResponse),
        meta,
    });
};
