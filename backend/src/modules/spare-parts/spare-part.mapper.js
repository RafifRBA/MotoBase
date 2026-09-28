import { ROLES } from "../users/user.model.js";

// Harga modal hanya boleh dilihat pemilik (SPEC 12.5 & 10.2). Mekanik dan kasir
// melihat harga jual saja.
export const canSeeCostPrice = (user) => user?.role === ROLES.OWNER;

export const toSparePartResponse = (part, { includeCostPrice = false } = {}) => {
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
