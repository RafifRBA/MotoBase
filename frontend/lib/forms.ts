import { z } from "zod";

/** Angka bulat >= 0 disimpan sebagai string di form, dikonversi saat submit. */
export const intString = (label: string) => z.string().regex(/^\d+$/, `${label} harus berupa angka bulat 0 atau lebih`);
export const optionalIntString = (label: string) => z.string().regex(/^\d*$/, `${label} harus berupa angka bulat`);

export const blankToUndefined = (v?: string | null) => {
  const t = v?.trim();
  return t ? t : undefined;
};

export const normalizePhoneInput = (v: string) => v.replace(/[\s-]/g, "");
export const phoneSchema = z
  .string()
  .trim()
  .refine((v) => /^(\+?62|0)\d{8,13}$/.test(normalizePhoneInput(v)), "Nomor telepon tidak valid (contoh 0812xxxxxxxx)");
