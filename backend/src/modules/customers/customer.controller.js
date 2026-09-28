import { toCustomerResponse } from "./customer.mapper.js";
import * as customerService from "./customer.service.js";

export const list = async (req, res) => {
    const { customers, meta } = await customerService.listCustomers(req.validated.query);

    return res.status(200).json({
        success: true,
        data: customers.map(toCustomerResponse),
        meta,
    });
};

export const getById = async (req, res) => {
    const customer = await customerService.getCustomerById(req.validated.params.id);
    return res.status(200).json({ success: true, data: toCustomerResponse(customer) });
};

export const create = async (req, res) => {
    const customer = await customerService.createCustomer(req.validated.body, req.user);

    return res.status(201).json({
        success: true,
        message: "Pelanggan berhasil dibuat",
        data: toCustomerResponse(customer),
    });
};

export const update = async (req, res) => {
    const customer = await customerService.updateCustomer(
        req.validated.params.id,
        req.validated.body,
        req.user,
    );

    return res.status(200).json({
        success: true,
        message: "Pelanggan berhasil diperbarui",
        data: toCustomerResponse(customer),
    });
};
