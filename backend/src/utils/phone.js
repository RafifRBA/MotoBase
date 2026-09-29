// Normalisasi nomor telepon Indonesia ke format 62xxxxxxxxxx.
//
//   0812-3456-7890  -> 6281234567890
//   +62 812 3456 7890 -> 6281234567890
//   81234567890     -> 6281234567890
//
// Mengembalikan null kalau nomornya tidak masuk akal, supaya pemanggil yang
// memutuskan apakah itu error validasi atau bukan.
export const normalizePhone = (value) => {
    if (typeof value !== "string") return null;

    const cleaned = value.replace(/[\s\-().]/g, "");

    let normalized;
    if (/^\+62\d+$/.test(cleaned)) normalized = cleaned.slice(1);
    else if (/^62\d+$/.test(cleaned)) normalized = cleaned;
    else if (/^0\d+$/.test(cleaned)) normalized = `62${cleaned.slice(1)}`;
    else if (/^8\d+$/.test(cleaned)) normalized = `62${cleaned}`;
    else return null;

    // 62 + 8 sampai 13 digit menutup seluruh rentang nomor seluler Indonesia.
    return /^62\d{8,13}$/.test(normalized) ? normalized : null;
};

// Untuk response publik (nomor telepon lengkap tidak boleh terlihat).
export const maskPhone = (phone) => {
    if (typeof phone !== "string" || phone.length < 4) return "***";
    return `${phone.slice(0, 4)}${"*".repeat(phone.length - 7)}${phone.slice(-3)}`;
};
