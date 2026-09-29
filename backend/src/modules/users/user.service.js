import ApiError from "../../utils/api-error.js";
import logger from "../../utils/logger.js";
import { buildMeta, escapeRegExp, toSkip } from "../../utils/pagination.js";
import { hashPassword } from "../auth/password.js";
import { RefreshToken } from "../auth/refresh-token.model.js";
import { User } from "./user.model.js";

const notFound = () => new ApiError(404, "USER_NOT_FOUND", "User tidak ditemukan");

const buildFilter = ({ role, isActive, search }) => {
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (search) {
        const pattern = new RegExp(escapeRegExp(search), "i");
        filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
    }
    return filter;
};

export const listUsers = async (query) => {
    const filter = buildFilter(query);
    const [users, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip(toSkip(query)).limit(query.limit),
        User.countDocuments(filter),
    ]);

    return { users, meta: buildMeta({ ...query, total }) };
};

export const getUserById = async (id) => {
    const user = await User.findById(id);
    if (!user) throw notFound();
    return user;
};

export const createUser = async (data, actor) => {
    const { password, ...rest } = data;

    if (await User.findOne({ email: rest.email })) {
        throw new ApiError(409, "EMAIL_ALREADY_USED", "Email sudah dipakai user lain");
    }
    if (rest.phone && (await User.findOne({ phone: rest.phone }))) {
        throw new ApiError(409, "PHONE_ALREADY_USED", "Nomor telepon sudah dipakai user lain");
    }

    const user = await User.create({ ...rest, passwordHash: await hashPassword(password) });

    logger.info({ actorId: actor.id, userId: user.id, role: user.role }, "User dibuat");
    return user;
};

export const updateUser = async (id, data, actor) => {
    const user = await getUserById(id);

    if (data.email && data.email !== user.email) {
        const existing = await User.findOne({ email: data.email });
        if (existing && existing.id !== user.id) {
            throw new ApiError(409, "EMAIL_ALREADY_USED", "Email sudah dipakai user lain");
        }
    }
    if (data.phone && data.phone !== user.phone) {
        const existing = await User.findOne({ phone: data.phone });
        if (existing && existing.id !== user.id) {
            throw new ApiError(409, "PHONE_ALREADY_USED", "Nomor telepon sudah dipakai user lain");
        }
    }

    Object.assign(user, data);
    await user.save();

    logger.info({ actorId: actor.id, userId: user.id }, "User diperbarui");
    return user;
};

export const setUserStatus = async (id, isActive, actor) => {
    const user = await getUserById(id);

    if (!isActive && user.id === actor.id) {
        throw new ApiError(
            409,
            "CANNOT_DEACTIVATE_SELF",
            "Anda tidak bisa menonaktifkan akun sendiri",
        );
    }

    user.isActive = isActive;
    await user.save();

    // Akun yang dinonaktifkan harus langsung kehilangan sesinya, bukan menunggu
    // refresh token-nya kedaluwarsa sendiri.
    if (!isActive) {
        await RefreshToken.updateMany(
            { userId: user._id, revokedAt: null },
            { $set: { revokedAt: new Date() } },
        );
    }

    logger.info({ actorId: actor.id, userId: user.id, isActive }, "Status user diubah");
    return user;
};
