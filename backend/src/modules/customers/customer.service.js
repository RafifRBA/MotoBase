import ApiError from "../../utils/api-error.js";
import logger from "../../utils/logger.js";
import { buildMeta, escapeRegExp, toSkip } from "../../utils/pagination.js";
import { customerRepository } from "./customer.repository.js";

const notFound = () => new ApiError(404, "CUSTOMER_NOT_FOUND", "Pelanggan tidak ditemukan");

const phoneTaken = () =>
    new ApiError(409, "PHONE_ALREADY_USED", "Nomor telepon sudah terdaftar pada pelanggan lain");

export const listCustomers = async (query) => {
    const filter = {};
    if (query.search) {
        const pattern = new RegExp(escapeRegExp(query.search), "i");
        filter.$or = [{ name: pattern }, { phone: pattern }, { email: pattern }];
    }

    const [customers, total] = await Promise.all([
        customerRepository.list(filter, { skip: toSkip(query), limit: query.limit }),
        customerRepository.count(filter),
    ]);

    return { customers, meta: buildMeta({ ...query, total }) };
};

export const getCustomerById = async (id) => {
    const customer = await customerRepository.findById(id);
    if (!customer) throw notFound();
    return customer;
};

export const getCustomerByUserId = async (userId) => {
    const customer = await customerRepository.findByUserId(userId);
    if (!customer) {
        throw new ApiError(
            404,
            "CUSTOMER_PROFILE_NOT_FOUND",
            "Akun Anda belum terhubung ke data pelanggan",
        );
    }
    return customer;
};

export const createCustomer = async (data, actor) => {
    // Dua pelanggan tidak digabung otomatis berdasarkan nama (SPEC 12.2),
    // tapi nomor telepon tetap harus unik supaya bisa dipakai verifikasi.
    if (await customerRepository.findByPhone(data.phone)) throw phoneTaken();

    const customer = await customerRepository.create(data);
    logger.info({ actorId: actor.id, customerId: customer.id }, "Pelanggan dibuat");
    return customer;
};

export const updateCustomer = async (id, data, actor) => {
    const customer = await getCustomerById(id);

    if (data.phone && data.phone !== customer.phone) {
        const existing = await customerRepository.findByPhone(data.phone);
        if (existing && existing.id !== customer.id) throw phoneTaken();
    }

    Object.assign(customer, data);
    await customer.save();

    logger.info({ actorId: actor.id, customerId: customer.id }, "Pelanggan diperbarui");
    return customer;
};
