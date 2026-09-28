// Satu-satunya bentuk User yang boleh keluar ke client. Field ditulis satu per
// satu (allowlist), jadi field baru di model tidak ikut terkirim tanpa sengaja.
export const toUserResponse = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email ?? null,
    phone: user.phone ?? null,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt,
});
