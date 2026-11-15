/**
 * Nama query parameter yang dikirim ke backend.
 * Jika backend memakai nama lain (lihat backend/docs/API.md), cukup ubah di sini.
 * Kunci kiri = nama yang dipakai di frontend, nilai kanan = nama di backend.
 */
export const QUERY = {
  page: "page",
  limit: "limit",
  search: "search",
  role: "role",
  status: "status",
  from: "startDate",
  to: "endDate",
} as const;

export function mapParams(params: Record<string, unknown> = {}) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    out[QUERY[key as keyof typeof QUERY] ?? key] = value;
  }
  return out;
}
