import { createHash } from "node:crypto";

export const hashSHA256 = (text) => {
    if(typeof text !== "string"){
        throw new TypeError("hashSHA256 hanya menerima string");
    }

    return createHash("sha256").update(text).digest("hex");
};