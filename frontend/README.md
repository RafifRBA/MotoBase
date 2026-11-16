# MotoBase Frontend

Antarmuka MotoBase: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 +
TanStack Query v5. Untuk perilaku API, lihat [`../backend/docs/API.md`](../backend/docs/API.md).

> Proyek ini memakai Next.js 16 dengan `cacheComponents`. Sebelum mengubah konvensi
> Next.js, baca `AGENTS.md` dan dokumen di `node_modules/next/dist/docs/`.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:3000
```

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | server pengembangan |
| `npm run build` / `npm start` | build dan jalankan produksi |
| `npm run lint` | ESLint |
| `npm run mock` | backend tiruan di `http://localhost:6318` |

Request `/api/v1/*` diteruskan ke backend lewat `rewrites` di `next.config.ts`, jadi
tidak perlu CORS dan cookie refresh token tetap satu origin. Alamat backend diatur di
`.env.local`:

```
BACKEND_URL=http://localhost:6318
```

Setelah mengubah `.env.local`, `next.config.ts`, atau `postcss.config.mjs`, jalankan ulang
`npm run dev`. Tailwind dikompilasi lewat `@tailwindcss/postcss`.

## Dua cara menyediakan backend

**Backend asli (disarankan).** Jalankan backend (lihat `../backend/README.md`). Akun staf
dibuat dengan `npm run seed:owner` di backend, lalu pemilik membuat akun kasir dan
mekanik. Pelanggan mendaftar sendiri di `/register`.

**Backend tiruan (demo tampilan).** `npm run mock` menyalakan server tiruan dengan data
contoh yang hanya ada di memori dan hilang saat server dihentikan. Kata sandi semua akun
demo `password123`:

| Peran | Akun |
|---|---|
| Pemilik | `owner@motobase.id` |
| Kasir / admin | `admin@motobase.id` |
| Mekanik | `mekanik@motobase.id` |
| Pelanggan | `pelanggan@motobase.id` |

Tautan pelacakan contoh: `/track/demo-token-1` sampai `/track/demo-token-6`.

### Perbedaan backend tiruan dengan backend asli

Backend tiruan hanya untuk melihat tampilan. Jangan dipakai untuk menilai perilaku:

- Tidak ada autentikasi, otorisasi, validasi, maupun transaksi yang sungguhan.
- **Pengajuan servis** di tiruan adalah order berstatus `requestStatus`. Di backend asli,
  pengajuan adalah koleksi tersendiri yang baru menjadi order saat admin menerimanya.
  Karena itu `GET /customer/service-requests` tidak ada di tiruan, dan kartu
  "Pengajuan" di halaman Servis saya selalu kosong.
- **Email nota tidak terkirim.** Panel nota menampilkan keterangan mode demo.
- Format dan nama field mengikuti `API.md` secara garis besar, bukan persis.

## Peran dan akses

Tabel ini hanya untuk UX (menyembunyikan menu dan tombol). Otorisasi sebenarnya ada di
backend. Sumbernya `lib/permissions.ts`.

| Area | Pemilik | Kasir / admin | Mekanik | Pelanggan |
|---|:---:|:---:|:---:|:---:|
| Dashboard, daftar servis, kendaraan, suku cadang (lihat) | Ya | Ya | Ya | Tidak |
| Buat servis, tugaskan mekanik, catat pembayaran, tautan pelacakan, kirim nota | Tidak | Ya | Tidak | Tidak |
| Ubah status, diagnosis, pemakaian suku cadang | Tidak | Ya | Ya (order yang ditugaskan) | Tidak |
| Pelanggan | Lihat | Kelola | Tidak | Tidak |
| Stok masuk dan opname | Tidak | Ya | Tidak | Tidak |
| Ubah katalog suku cadang dan harga modal | Ya | Ya | Tidak | Tidak |
| Riwayat stok | Ya | Ya | Tidak | Tidak |
| Laporan | Semua | Terbatas | Tidak | Tidak |
| Pengguna (staf) | Kelola | Lihat | Tidak | Tidak |
| Kotak masuk pengajuan (`/service-requests`) | Tidak | Ya | Tidak | Tidak |
| Portal pelanggan (`/my-*`) | Tidak | Tidak | Tidak | Ya |

Harga modal hanya terlihat oleh pemilik.

## Struktur

```
app/              route: login, register, dashboard, service-orders (+ new, [id]),
                  customers, vehicles, spare-parts, stock-movements, reports, users,
                  service-requests, track/[token], dan portal pelanggan
                  (my-dashboard, my-vehicles, my-services, my-profile).
                  Juga favicon.ico, icon.svg, apple-icon.png, manifest.webmanifest
components/       ui/ (komponen dasar), layout/ (sidebar, shell), brand/ (logo)
features/         satu folder per modul: api.ts, hooks.ts, komponen
                  (auth, customer-portal, customers, dashboard, reports,
                  service-orders, spare-parts, tracking, users, vehicles)
mock-backend/     backend tiruan untuk demo tampilan (hapus bila tidak perlu)
lib/              api client, format, izin per peran, refs, idempotensi
public/           ikon PWA (icon-192, icon-512, icon-maskable-512)
types/            tipe respons dan model
```

## Catatan teknis

- **Token.** Access token disimpan di memori. Refresh token ada di cookie `HttpOnly`
  dan diperbarui otomatis oleh interceptor axios (satu refresh bersama untuk banyak
  request yang gagal bersamaan).
- **Nama query param** backend dipetakan di `lib/api-contract.ts` (mis. `from` menjadi
  `startDate`, `to` menjadi `endDate`).
- **Relasi di respons** berupa objek ringkas (`{ id, name }` dan sejenisnya), bukan id
  mentah. Helper-nya ada di `lib/refs.ts`.
- **Idempotency-Key.** Stok masuk, opname, dan pemakaian suku cadang mengirim kunci unik
  per aksi lewat `useIdempotencyKey` (`lib/hooks.ts`). Kunci dibuat saat tombol diklik,
  bukan saat render, dan diganti setelah berhasil.
- **Tanggal servis.** `serviceDate` hanya berisi tanggal (jam selalu 00.00). Tampilkan
  dengan `formatDate`. Waktu sebenarnya ada di `createdAt` dan riwayat status.
- **Nota email.** Kartu "Nota servis via surel" di detail servis menampilkan status
  antrean, terkirim, atau gagal, dan memperbarui diri tiap 10 detik selama masih
  mengantre. Hanya kasir/admin yang bisa mengirim ulang. Butuh SMTP di backend.
- **Kata sandi.** Login, registrasi, dan form akun staf memakai `PasswordInput`
  (tombol mata untuk menampilkan atau menyembunyikan).

## Logo dan identitas

Logo dibuat sebagai komponen SVG di `components/brand/logo.tsx` (tanpa font), dirancang
untuk latar putih. Di permukaan gelap (sidebar, panel login, header pelacakan) logo
diletakkan di atas pelat putih. Berkas sumber, varian, dan panduan pemakaian ada di
[`../brand/`](../brand/PANDUAN-LOGO.md). Jangan menyunting `logo.tsx` manual; hasilkan
ulang dari `brand/sumber/build_kit.py`.
