import ApiError from "../../utils/api-error.js";
import logger from "../../utils/logger.js";
import { isDuplicateKeyError, withTransaction } from "../../utils/transaction.js";
import { hashPassword } from "../auth/password.js";
import { Customer } from "../customers/customer.model.js";
import { updateCustomer } from "../customers/customer.service.js";
import { ROLES, User } from "../users/user.model.js";

export const registerCustomer = async ({ name, email, phone, password }) => {
    if (await User.findOne({ email })) {
        throw new ApiError(409, "EMAIL_ALREADY_USED", "Email sudah terdaftar");
    }

    // Pendaftaran SELALU membuat data pelanggan baru, tidak menautkan ke data
    // lama. Kalau menautkan berdasarkan nomor telepon, siapa pun bisa mendaftar
    // dengan nomor orang lain lalu membaca riwayat servisnya.
    if (await Customer.findOne({ phone })) {
        throw new ApiError(
            409,
            "PHONE_ALREADY_USED",
            "Nomor telepon sudah terdaftar. Hubungi bengkel untuk menautkan akun Anda",
        );
    }

    const passwordHash = await hashPassword(password);

    try {
        const user = await withTransaction(async (session) => {
            const [customer] = await Customer.create([{ name, phone, email }], { session });
            const [created] = await User.create(
                [{ name, email, role: ROLES.CUSTOMER, customerId: customer._id, passwordHash }],
                { session },
            );
            return created;
        });

        logger.info({ userId: user.id }, "Pelanggan mendaftar");
        return user;
    } catch (error) {
        // Dua pendaftaran bersamaan dengan data sama: yang kalah kena unique index.
        if (isDuplicateKeyError(error)) {
            throw new ApiError(
                409,
                "ALREADY_REGISTERED",
                "Email atau nomor telepon sudah terdaftar",
            );
        }
        throw error;
    }
};

export const updateProfile = async (user, data) => {
    // updateCustomer sudah menolak nomor telepon yang dipakai pelanggan lain.
    const customer = await updateCustomer(user.customerId.toString(), data, user);

    // Nama di akun login ikut diperbarui supaya tidak berbeda dengan profil.
    if (data.name) await User.updateOne({ _id: user._id }, { name: data.name });

    return customer;
};
