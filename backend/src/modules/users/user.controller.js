import * as userService from "./user.service.js";

// Allowlist: field ditulis satu per satu supaya field baru di model (termasuk
// passwordHash) tidak ikut terkirim ke client tanpa sengaja.
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

export const list = async (req, res) => {
    const { users, meta } = await userService.listUsers(req.validated.query);

    return res.status(200).json({
        success: true,
        data: users.map(toUserResponse),
        meta,
    });
};

export const getById = async (req, res) => {
    const user = await userService.getUserById(req.validated.params.id);
    return res.status(200).json({ success: true, data: toUserResponse(user) });
};

export const create = async (req, res) => {
    const user = await userService.createUser(req.validated.body, req.user);

    return res.status(201).json({
        success: true,
        message: "User berhasil dibuat",
        data: toUserResponse(user),
    });
};

export const update = async (req, res) => {
    const user = await userService.updateUser(
        req.validated.params.id,
        req.validated.body,
        req.user,
    );

    return res.status(200).json({
        success: true,
        message: "User berhasil diperbarui",
        data: toUserResponse(user),
    });
};

export const updateStatus = async (req, res) => {
    const user = await userService.setUserStatus(
        req.validated.params.id,
        req.validated.body.isActive,
        req.user,
    );

    return res.status(200).json({
        success: true,
        message: user.isActive ? "User diaktifkan" : "User dinonaktifkan",
        data: toUserResponse(user),
    });
};
