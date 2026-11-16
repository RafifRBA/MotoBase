# MotoBase Frontend

Next.js (App Router) + TypeScript + Tailwind v4 + TanStack Query.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:3000
```

Belum ada backend? Jalankan backend tiruan di terminal lain (data contoh, hanya di memori):

```bash
npm run mock       # http://localhost:6318, kata sandi semua akun: password123
```

Akun demo (kata sandi semua akun `password123`): `owner@motobase.id`, `admin@motobase.id`, `mekanik@motobase.id`, dan `pelanggan@motobase.id`.
Tautan pelacakan contoh: `/track/demo-token-1` sampai `/track/demo-token-6`.

Backend asli harus berjalan di `BACKEND_URL` (default `http://localhost:6318`, lihat `.env.local`).
Request `/api/v1/*` diteruskan ke backend lewat `rewrites` di `next.config.ts`, jadi tidak perlu CORS.

## Portal pelanggan (endpoint tambahan mock)

Mock backend menyediakan registrasi dan portal pelanggan di `/api/v1/auth/register-customer`, `/api/v1/customer/me`, `/api/v1/customer/vehicles`, `/api/v1/customer/service-orders`, dan `/api/v1/customer/service-requests`. Admin meninjau permintaan lewat `/api/v1/service-requests` dan `PATCH /api/v1/service-requests/:id` dengan `decision: DITERIMA | DITOLAK`. Semua data mock tetap hanya berada di memori dan akan hilang saat server dihentikan; autentikasi dan otorisasi produksi, persistensi, transaksi atomik, serta notifikasi memerlukan backend/database produksi.

## Struktur

```
app/            route (login, dashboard, service-orders, customers, vehicles,
                spare-parts, stock-movements, reports, users, track/[token])
components/     ui/ (komponen dasar), layout/ (sidebar, shell)
features/       satu folder per modul: api.ts, hooks.ts, komponen
mock-backend/   backend tiruan untuk demo tampilan (hapus bila tidak perlu)
lib/            api client (axios + refresh token), format, izin per peran
types/          tipe respons dan model
```

Nama query param backend ada di `lib/api-contract.ts`.


##Role"
Pemilik: owner@motobase.id. Bisa melihat laporan, pengguna, dan harga modal.
Kasir: admin@motobase.id. Bisa servis baru, pelanggan, kendaraan, stok, dan pembayaran.
Mekanik: mekanik@motobase.id. Hanya melihat tugasnya, mengubah status, dan memakai suku cadang.
Customer: pelanggan@motobase.id
Kata sandi untuk semua: password123

## Nota dan kata sandi

Login, registrasi (termasuk konfirmasi), dan pembuatan akun staf memiliki tombol mata untuk menampilkan/menyembunyikan kata sandi. Ikon tab/aplikasi menggunakan aset MotoBase di `app/favicon.ico`, `app/icon.svg`, dan `app/apple-icon.png`.

Pada backend asli, detail servis yang selesai menampilkan status email nota untuk admin/pemilik; admin dapat mengirim ulang. Pengiriman memerlukan SMTP di backend. Mode mock menampilkan keterangan demo dan tidak mengirim email sungguhan.
