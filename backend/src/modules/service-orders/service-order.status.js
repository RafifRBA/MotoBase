import ApiError from "../../utils/api-error.js";

export const ORDER_STATUS = Object.freeze({
    ANTRE: "ANTRE",
    DIPERIKSA: "DIPERIKSA",
    DIKERJAKAN: "DIKERJAKAN",
    SELESAI: "SELESAI",
    DIAMBIL: "DIAMBIL",
    DIBATALKAN: "DIBATALKAN",
});

// Alur normal hanya boleh maju satu tahap (SPEC 11). Mekanik tidak bisa
// melompat dari ANTRE langsung ke SELESAI.
const NEXT_STATUS = Object.freeze({
    [ORDER_STATUS.ANTRE]: ORDER_STATUS.DIPERIKSA,
    [ORDER_STATUS.DIPERIKSA]: ORDER_STATUS.DIKERJAKAN,
    [ORDER_STATUS.DIKERJAKAN]: ORDER_STATUS.SELESAI,
    [ORDER_STATUS.SELESAI]: ORDER_STATUS.DIAMBIL,
});

// Status akhir: tidak ada transisi keluar dari sini.
export const FINAL_STATUSES = Object.freeze([ORDER_STATUS.DIAMBIL, ORDER_STATUS.DIBATALKAN]);

// Suku cadang hanya boleh dicatat selama motor masih dikerjakan.
export const STATUSES_ALLOWING_PART_USAGE = Object.freeze([
    ORDER_STATUS.DIPERIKSA,
    ORDER_STATUS.DIKERJAKAN,
]);

export const isFinal = (status) => FINAL_STATUSES.includes(status);

// Mengembalikan error kalau transisi tidak diizinkan, atau null kalau boleh.
export const validateTransition = (from, to) => {
    if (from === to) {
        return new ApiError(409, "INVALID_STATUS_TRANSITION", `Status sudah ${to}`);
    }

    if (isFinal(from)) {
        return new ApiError(
            409,
            "ORDER_ALREADY_CLOSED",
            `Service order sudah ${from} dan tidak bisa diubah lagi`,
        );
    }

    // Pembatalan adalah jalur pengecualian: boleh dari status mana pun yang
    // belum final, bukan bagian dari alur normal.
    if (to === ORDER_STATUS.DIBATALKAN) return null;

    if (NEXT_STATUS[from] !== to) {
        return new ApiError(
            409,
            "INVALID_STATUS_TRANSITION",
            `Status tidak bisa langsung dari ${from} ke ${to}. Tahap berikutnya adalah ${NEXT_STATUS[from]}`,
        );
    }

    return null;
};
