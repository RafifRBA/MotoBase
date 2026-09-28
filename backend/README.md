# MotoBase Backend

REST API untuk operasional Bengkel Motor Laju Jaya: antrean servis, stok suku
cadang, riwayat kendaraan, tracking pelanggan, dan laporan pemilik.

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

Tiap modul memakai pola yang sama: `model` (schema + index) → `repository`
(query) → `service` (aturan bisnis & transaction) → `controller` (HTTP) →
`route` (URL + middleware), dengan `validation` (Zod) dan `mapper` (bentuk
response) di sampingnya.

## Dokumentasi API

Ada di [docs/API.md](docs/API.md): seluruh endpoint, kode error, aturan
otorisasi, dan asumsi yang diambil untuk hal-hal yang belum diputuskan.

## Catatan pengembangan

- **Transaction butuh replica set.** MongoDB Atlas sudah memenuhinya, dan tes
  memakai `MongoMemoryReplSet`. `mongod` lokal standalone tidak bisa menjalankan
  operasi stok.
- **`process.env` hanya dibaca di `src/config/env.js`** (pengecualian: script
  seed). File lain memakai `import { env }`.
- **Nilai uang berupa integer rupiah**, bukan desimal.
- **Semua import antar-file wajib menyertakan `.js`** karena proyek ini ESM.
