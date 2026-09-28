// Penyamaran data untuk log dan response publik (SPEC 10 & 24).

export const maskEmail = (email) => {
    if (typeof email !== "string" || !email.includes("@")) return "***";

    const [local, domain] = email.split("@");
    const visible = local.slice(0, 2);
    return `${visible}${"*".repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
};

// "Rafif Raihan" -> "Ra***"
export const maskName = (name) => {
    if (typeof name !== "string" || name.trim() === "") return "***";
    return `${name.trim().slice(0, 2)}***`;
};

// Nama publik mekanik: hanya nama depan (SPEC 10.1).
export const publicFirstName = (name) => {
    if (typeof name !== "string" || name.trim() === "") return null;
    return name.trim().split(/\s+/)[0];
};

// "AB 1234 XY" -> "AB 12** XY". Dua digit pertama disisakan supaya pelanggan
// masih mengenali motornya, sisanya disamarkan.
export const maskLicensePlate = (plate) => {
    if (typeof plate !== "string" || plate.trim() === "") return "***";

    let digitsSeen = 0;
    return plate.replace(/\d/g, (digit) => {
        digitsSeen += 1;
        return digitsSeen <= 2 ? digit : "*";
    });
};
