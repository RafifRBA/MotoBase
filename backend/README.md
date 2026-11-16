# MotoBase Backend

REST API untuk operasional Bengkel Motor Laju Jaya: antrean servis, stok suku
cadang, riwayat kendaraan, tracking pelanggan tanpa login, dan laporan pemilik.

Tiga peran: **admin/kasir** membuat order, **mekanik** memperbarui status dan
mencatat suku cadang, **pemilik** melihat laporan.

Stack: Node.js 24, Express 5, MongoDB Atlas + Mongoose, Zod, JWT, Pino, Vitest.

## Menjalankan

```bash
npm install
cp .env.example .env     # lalu isi MONGODB_URI dan dua JWT secret
npm run dev              # atau: npm start
```

Generate secret JWT (jalankan dua kali, untuk access dan refresh):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Cek server hidup: `curl http://localhost:6318/health`

## Membuat akun pemilik pertama

Password dibaca dari environment variable, bukan dari file, supaya tidak
tertinggal di `.env` atau riwayat terminal:

```bash
read -s -p "Password OWNER: " SEED_OWNER_PASSWORD && export SEED_OWNER_PASSWORD
SEED_OWNER_NAME="Nama Pemilik" SEED_OWNER_EMAIL="owner@lajujaya.id" npm run seed:owner
unset SEED_OWNER_PASSWORD
```

Script menolak berjalan kalau OWNER sudah ada, jadi aman dijalankan ulang.
Akun staf berikutnya dibuat OWNER lewat `POST /api/v1/users`.

## Perintah

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | jalan dengan auto-restart |
| `npm start` | jalan biasa |
| `npm test` | seluruh tes (database di memori, tidak menyentuh Atlas) |
| `npm run test:watch` | tes berjalan terus saat file diubah |
| `npm run lint` | ESLint |
| `npm run format` | rapikan format dengan Prettier |

## Struktur

```
src/
├── config/        env.js (validasi environment), db.js
├── middlewares/   authenticate, authorize, validate, rate-limit, error-handler
├── modules/       satu folder per domain: auth, users, customers, vehicles,
│                  service-orders, spare-parts, stock-movements, reports
├── routes/        penggabungan seluruh router
└── utils/         hash, phone, mask, pagination, transaction, tracking-token
```

Tiap modul memakai pola yang sama dan hanya empat lapis:

| File | Isi |
|---|---|
| `*.model.js` | schema Mongoose + index |
| `*.validation.js` | schema Zod untuk body, params, dan query |
| `*.service.js` | aturan bisnis + query database |
| `*.controller.js` | terjemahan HTTP + bentuk response yang dikirim ke client |
| `*.route.js` | URL + middleware (authenticate, authorize, validate) |

Menambah endpoint baru berarti menyentuh empat file itu saja. Contoh paling
mudah ditiru: modul `customers`.

## Dokumentasi

| Dokumen | Untuk siapa |
|---|---|
| [docs/API.md](docs/API.md) | referensi lengkap: tiap endpoint, kode error, aturan otorisasi, asumsi yang diambil |

## Catatan pengembangan

- **Transaction butuh replica set.** MongoDB Atlas sudah memenuhinya, dan tes
  memakai `MongoMemoryReplSet`. `mongod` lokal standalone tidak bisa menjalankan
  operasi stok.
- **`process.env` hanya dibaca di `src/config/env.js`** (pengecualian: script
  seed). File lain memakai `import { env }`.
- **Nilai uang berupa integer rupiah**, bukan desimal.
- **Semua import antar-file wajib menyertakan `.js`** karena proyek ini ESM.

## Email nota servis

Isi pengaturan SMTP di `.env.example`, lalu aktifkan `EMAIL_ENABLED=true` dan jalankan ulang backend. `SMTP_HOST`, `SMTP_PORT`, dan `EMAIL_FROM` wajib saat diaktifkan; kredensial SMTP opsional tetapi harus diisi berpasangan. Port 465 menggunakan `SMTP_SECURE=true`; 587 menggunakan `false` (STARTTLS).

Nota PDF otomatis diantrekan saat servis pertama kali selesai. Pelanggan tanpa surel tetap bisa diselesaikan; tambahkan surel melalui data pelanggan lalu gunakan **Kirim nota** di detail servis. Admin juga dapat mengirim ulang nota terbaru setelah pembayaran dicatat. Panel menampilkan status antrean, sukses, atau gagal. Tidak ada pengiriman nyata dari mock frontend.

Antrean persisten tersimpan di MongoDB, worker berjalan dalam proses server setiap 10 detik, dan mencoba ulang kegagalan sampai lima percobaan. Tetap jalankan proses backend agar antrean diproses. Logo PDF menggunakan aset `brand/logo/png/motobase-lockup-warna.png` dari repository; sertakan folder `brand/` saat deployment. Lihat `docs/API.md` untuk endpoint, alasan dilewati, dan batas jaminan pengiriman SMTP.
