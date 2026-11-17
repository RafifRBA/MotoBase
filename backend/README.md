# MotoBase Backend

REST API untuk operasional Bengkel Motor Laju Jaya: antrean servis, stok suku
cadang, riwayat kendaraan, tracking pelanggan tanpa login, dan laporan pemilik.

Empat peran: **admin/kasir** membuat order dan mencatat pembayaran, **mekanik**
memperbarui status dan mencatat suku cadang, **pemilik** melihat laporan, dan
**pelanggan** memakai portal sendiri (daftar akun, kendaraan, pengajuan servis).

Stack: Node.js 24, Express 5, MongoDB Atlas + Mongoose, Zod, JWT, Pino, Vitest,
Nodemailer + PDFKit (nota email).

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

`.env.example` memakai `PORT=6318`, yang dituju proxy frontend. Tanpa `PORT`, backend
memakai 3000.

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
| `npm run format:check` | periksa format tanpa mengubah file |
| `npm run reset:password` | ganti password pengguna (lihat `scripts/reset-password.js`) |

## Struktur

```
src/
├── config/        env.js (validasi environment), db.js
├── middlewares/   authenticate, authorize, validate, rate-limit, error-handler
├── modules/       satu folder per domain: auth, users, customers,
│                  customer-portal, vehicles, service-orders, service-requests,
│                  receipts, spare-parts, stock-movements, reports
├── routes/        penggabungan seluruh router
└── utils/         hash, phone, mask, pagination, transaction, tracking-token, ref
```

Tiap modul memakai pola yang sama (lima berkas):

| File | Isi |
|---|---|
| `*.model.js` | schema Mongoose + index |
| `*.validation.js` | schema Zod untuk body, params, dan query |
| `*.service.js` | aturan bisnis + query database |
| `*.controller.js` | terjemahan HTTP + bentuk response yang dikirim ke client |
| `*.route.js` | URL + middleware (authenticate, authorize, validate) |

Menambah endpoint baru berarti menyentuh lima file itu saja. Contoh paling
mudah ditiru: modul `customers`.

## Dokumentasi

| Dokumen | Untuk siapa |
|---|---|
| [docs/API.md](docs/API.md) | referensi lengkap: tiap endpoint, kode error, aturan otorisasi, asumsi yang diambil |
| [../frontend/README.md](../frontend/README.md) | menjalankan frontend dan backend tiruan |
| [../brand/PANDUAN-LOGO.md](../brand/PANDUAN-LOGO.md) | logo (dipakai juga di PDF nota) |

## Catatan pengembangan

- **Transaction butuh replica set.** MongoDB Atlas sudah memenuhinya, dan tes
  memakai `MongoMemoryReplSet`. `mongod` lokal standalone tidak bisa menjalankan
  operasi stok.
- **`process.env` hanya dibaca di `src/config/env.js`** (pengecualian: script
  seed). File lain memakai `import { env }`.
- **Nilai uang berupa integer rupiah**, bukan desimal.
- **Semua import antar-file wajib menyertakan `.js`** karena proyek ini ESM.
- **Endpoint portal tidak pernah menerima `customerId` dari klien.** Id pelanggan
  selalu diambil dari akun yang login (`req.user.customerId`), supaya pelanggan
  hanya bisa menyentuh datanya sendiri.
- **Setelah `git pull`, jalankan `npm install`.** Dependensi baru (mis. `nodemailer`,
  `pdfkit`) tidak terpasang otomatis, dan backend gagal start tanpanya. Perubahan
  `package-lock.json` yang hanya berupa penanda `"peer": true` tidak perlu di-commit.

## Email nota servis (opsional)

Nota PDF dikirim ke email pelanggan saat servis pertama kali berstatus `SELESAI`.
Fitur ini **mati secara default**: backend berjalan normal tanpa SMTP.

Untuk mengaktifkan, isi `backend/.env` (**bukan** `.env.example`, yang ikut
ter-commit dan tidak boleh berisi kredensial), lalu jalankan ulang backend.
nodemon tidak memantau `.env`, jadi restart manual (`rs` di terminal nodemon).

```
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASSWORD=...
EMAIL_FROM="MotoBase <alamat-pengirim@domain>"
```

`SMTP_HOST`, `SMTP_PORT`, dan `EMAIL_FROM` wajib saat diaktifkan; `SMTP_USER` dan
`SMTP_PASSWORD` harus diisi berpasangan. Port 465 memakai `SMTP_SECURE=true`,
port 587 memakai `false` (STARTTLS). Untuk Gmail gunakan *App Password*, bukan
password akun. Layanan yang mewajibkan verifikasi domain pengirim (mis. ZeptoMail)
tidak bisa memakai alamat `*.vercel.app`; butuh domain milik sendiri.

**Hosting yang memblokir SMTP (mis. Railway paket Free/Trial/Hobby).** Isi
`BREVO_API_KEY` dengan API key Brevo. Email lalu dikirim lewat HTTPS dan setelan
`SMTP_*` tidak dipakai (hanya `EMAIL_ENABLED=true` dan `EMAIL_FROM` yang wajib).
`EMAIL_FROM` harus alamat pengirim yang sudah diverifikasi di Brevo.

Pelanggan tanpa surel tetap bisa diselesaikan: tambahkan surel di data
pelanggan, lalu gunakan **Kirim nota** di detail servis. Admin juga dapat
mengirim ulang nota terbaru setelah pembayaran dicatat. Panel di detail servis
menampilkan status antrean, terkirim, atau gagal. Backend tiruan frontend tidak
mengirim email sungguhan.

Antrean persisten tersimpan di MongoDB (pola outbox), worker berjalan dalam
proses server setiap 10 detik, dan mencoba ulang kegagalan sampai lima kali.
Proses backend harus tetap hidup agar antrean diproses, jadi tidak cocok untuk
fungsi serverless. Logo di PDF dibaca dari
`brand/logo/png/motobase-lockup-warna.png` di akar repositori; sertakan folder
`brand/` saat deployment. Endpoint, alasan dilewati, dan batas jaminan
pengiriman SMTP ada di `docs/API.md`.
