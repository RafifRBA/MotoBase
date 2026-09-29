import ApiError from "../../utils/api-error.js";
import logger from "../../utils/logger.js";
import { buildMeta, escapeRegExp, toSkip } from "../../utils/pagination.js";
import { Customer } from "./customer.model.js";

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
        Customer.find(filter).sort({ createdAt: -1 }).skip(toSkip(query)).limit(query.limit),
        Customer.countDocuments(filter),
    ]);

    return { customers, meta: buildMeta({ ...query, total }) };
};

export const getCustomerById = async (id) => {
    const customer = await Customer.findById(id);
    if (!customer) throw notFound();
    return customer;
};

export const createCustomer = async (data, actor) => {
    // Pelanggan dengan nama sama boleh ada; yang harus unik nomor teleponnya.
    if (await Customer.findOne({ phone: data.phone })) throw phoneTaken();

    const customer = await Customer.create(data);
    logger.info({ actorId: actor.id, customerId: customer.id }, "Pelanggan dibuat");
    return customer;
};

export const updateCustomer = async (id, data, actor) => {
    const customer = await getCustomerById(id);

    if (data.phone && data.phone !== customer.phone) {
        const existing = await Customer.findOne({ phone: data.phone });
        if (existing && existing.id !== customer.id) throw phoneTaken();
    }

    Object.assign(customer, data);
    await customer.save();

    logger.info({ actorId: actor.id, customerId: customer.id }, "Pelanggan diperbarui");
    return customer;
};
