import { toUserResponse } from "./user.mapper.js";
import * as userService from "./user.service.js";

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
