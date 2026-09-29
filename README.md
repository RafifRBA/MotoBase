# MotoBase

Layanan digitalisasi operasional bengkel motor yang membantu mengelola alur
servis, pencatatan otomatis stok suku cadang, dan riwayat kendaraan secara
terpusat. Untuk memastikan alur kerja transparan dan efisien, layanan ini juga
menyediakan pelacakan status pengerjaan bagi pelanggan serta laporan analitik
bagi pemilik bengkel.


## Latar belakang

Bengkel mencatat seluruh kegiatannya secara manual di buku, dan menimbulkan
tiga persoalan:

1. Pelanggan berulang kali menelepon hanya untuk menanyakan apakah motornya
   sudah selesai.
2. Stok suku cadang kerap habis tanpa disadari karena pemakaiannya tidak
   terekam.
3. Riwayat servis pelanggan lama hilang ketika buku catatan penuh atau rusak.

MotoBase menjawab ketiganya: status servis dapat dipantau pelanggan lewat
tautan tanpa perlu akun, stok berkurang otomatis setiap kali suku cadang
dicatat terpakai, dan seluruh riwayat tersimpan permanen di basis data.

## Fitur utama

| Fitur | Keterangan |
|---|---|
| Alur servis bertahap | `ANTRE → DIPERIKSA → DIKERJAKAN → SELESAI → DIAMBIL`, tidak bisa melompat, setiap perubahan tercatat pelakunya |
| Tiga peran dengan wewenang berbeda | Kasir membuat order, mekanik memperbarui status, pemilik melihat laporan |
| Stok otomatis | Pemakaian suku cadang langsung mengurangi stok dalam satu transaksi basis data |
| Peringatan stok menipis | Penandaan otomatis saat jumlah mencapai batas minimum |
| Pelacakan publik | Tautan berbasis token untuk pelanggan, tanpa login, dengan data pribadi disamarkan |
| Riwayat kendaraan | Seluruh servis tersimpan dan dapat ditelusuri per kendaraan maupun per pelanggan |
| Laporan pemilik | Ringkasan servis, pendapatan, pemakaian suku cadang, stok menipis, kinerja mekanik |

## Kelompok 7

| Nama | NIM |
| --- | --- |
| Muhammad Bintang Hidayatullah Marbun | 24/544012/TK/60468 |
| Rafif Raihan Bahrul Alam | 24/534432/TK/59237 |
| Juan Christopher Reinaldo Sipayung | 24/544528/TK/60526 |
| Nabila Putri Barokah | 24/541890/TK/60132 |

## Struktur folder

```
MotoBase/
├── backend/                    REST API (Express + MongoDB)
│   ├── docs/
│   │   └── API.md              referensi seluruh endpoint dan kode error
│   ├── scripts/
│   │   ├── seed-owner.js       membuat akun pemilik pertama
│   │   └── reset-password.js   mengganti kata sandi pengguna
│   ├── src/
│   │   ├── config/             env.js (validasi environment), db.js (koneksi)
│   │   ├── middlewares/        authenticate, authorize, validate,
│   │   │                       rate-limit, error-handler, not-found
│   │   ├── modules/            satu folder per domain
│   │   │   ├── auth/           login, refresh token, JWT, kata sandi
│   │   │   ├── users/          akun staf
│   │   │   ├── customers/      data pelanggan
│   │   │   ├── vehicles/       data kendaraan
│   │   │   ├── service-orders/ servis, status, pelacakan publik
│   │   │   ├── spare-parts/    katalog dan stok suku cadang
│   │   │   ├── stock-movements/ riwayat pergerakan stok
│   │   │   └── reports/        laporan pemilik
│   │   ├── routes/             penggabungan seluruh router
│   │   ├── utils/              hash, phone, mask, pagination, transaction
│   │   ├── app.js              konfigurasi Express
│   │   └── server.js           titik masuk aplikasi
│   ├── tests/
│   │   ├── integration/        pengujian endpoint lewat HTTP
│   │   ├── unit/               pengujian fungsi terpisah
│   │   └── helpers/            basis data sementara dan data uji
│   ├── .env.example            contoh konfigurasi
│   ├── eslint.config.js
│   └── package.json
└── frontend/                   antarmuka pengguna (Milestone 2)
```

Setiap modul memakai pola yang sama dan hanya empat lapis:

| Berkas | Isi |
|---|---|
| `*.model.js` | skema Mongoose beserta indeks |
| `*.validation.js` | skema Zod untuk body, params, dan query |
| `*.service.js` | aturan bisnis dan query basis data |
| `*.controller.js` | penerjemahan HTTP dan bentuk respons |
| `*.route.js` | URL beserta middleware |

## Teknologi

| Komponen | Teknologi | Versi |
|---|---|---|
| Runtime | Node.js | 24 |
| Framework | Express | 5 |
| Basis data | MongoDB Atlas | — |
| ODM | Mongoose | 9 |
| Validasi | Zod | 4 |
| Autentikasi | jsonwebtoken, bcryptjs | 9, 3 |
| Keamanan | Helmet, CORS, express-rate-limit | 8, 2, 8 |
| Pencatatan log | Pino, pino-http | 10, 11 |
| Pengujian | Vitest, Supertest, mongodb-memory-server | 5, 7, 11 |
| Kualitas kode | ESLint, Prettier | 10, 3 |
| Frontend (Milestone 2) | Next.js | — |

## Menjalankan backend

```bash
cd backend
npm install
cp .env.example .env     # isi MONGODB_URI dan dua JWT secret
npm run dev
```

Cek server hidup: `http://localhost:6318/health`

Membuat akun pemilik pertama:

```bash
read -s -p "Password: " SEED_OWNER_PASSWORD && export SEED_OWNER_PASSWORD
SEED_OWNER_NAME="Nama Pemilik" SEED_OWNER_EMAIL="owner@lajujaya.id" npm run seed:owner
unset SEED_OWNER_PASSWORD
```

Perintah lain:

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | menjalankan dengan muat ulang otomatis |
| `npm start` | menjalankan biasa |
| `npm test` | 174 pengujian otomatis (memakai basis data di memori) |
| `npm run lint` | pemeriksaan ESLint |
| `npm run format` | merapikan format dengan Prettier |

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [backend/docs/API.md](backend/docs/API.md) | referensi lengkap 48 endpoint (46 bisnis + 2 utilitas), kode error, dan aturan wewenang |
| [backend/README.md](backend/README.md) | catatan pengembangan backend |

## Laporan

Laporan Milestone 1 (PDF):

https://drive.google.com/file/d/1kDmTi31KlfHR6rZ9tofoCnA7I2DcHUCO/view?usp=sharing
