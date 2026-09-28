export const toCustomerResponse = (customer) => ({
    id: customer.id,
    userId: customer.userId ? customer.userId.toString() : null,
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? null,
    address: customer.address ?? null,
    notes: customer.notes ?? null,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
});

// Untuk pelanggan yang melihat datanya sendiri: catatan internal staf
// (field notes) sengaja tidak ikut dikirim.
export const toCustomerSelfResponse = (customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? null,
    address: customer.address ?? null,
    createdAt: customer.createdAt,
});
