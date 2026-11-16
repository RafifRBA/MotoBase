# MotoBase

Layanan digitalisasi operasional bengkel motor yang membantu mengelola alur
servis, pencatatan otomatis stok suku cadang, dan riwayat kendaraan secara
terpusat. Untuk memastikan alur kerja transparan dan efisien, layanan ini juga
menyediakan pelacakan status pengerjaan dan portal bagi pelanggan, nota servis
via email, serta laporan analitik bagi pemilik bengkel.


## Latar belakang

Bengkel mencatat seluruh kegiatannya secara manual di buku, dan menimbulkan
tiga persoalan:

1. Pelanggan berulang kali menelepon hanya untuk menanyakan apakah motornya
   sudah selesai.
2. Stok suku cadang kerap habis tanpa disadari karena pemakaiannya tidak
   terekam.
3. Riwayat servis pelanggan lama hilang ketika buku catatan penuh atau rusak.

MotoBase menjawab ketiganya: status servis dapat dipantau pelanggan lewat
tautan tanpa perlu akun (atau lewat akun pelanggan), stok berkurang otomatis setiap kali suku cadang
dicatat terpakai, dan seluruh riwayat tersimpan permanen di basis data.

## Fitur utama

| Fitur | Keterangan |
|---|---|
| Alur servis bertahap | `ANTRE → DIPERIKSA → DIKERJAKAN → SELESAI → DIAMBIL`, tidak bisa melompat, setiap perubahan tercatat pelakunya |
| Empat peran dengan wewenang berbeda | Kasir/admin membuat order dan mencatat pembayaran, mekanik memperbarui status dan mencatat suku cadang, pemilik melihat laporan, pelanggan memakai portal |
| Stok otomatis | Pemakaian suku cadang langsung mengurangi stok dalam satu transaksi basis data |
| Peringatan stok menipis | Penandaan otomatis saat jumlah mencapai batas minimum |
| Pelacakan publik | Tautan berbasis token untuk pelanggan, tanpa login, dengan data pribadi disamarkan |
| Riwayat kendaraan | Seluruh servis tersimpan dan dapat ditelusuri per kendaraan maupun per pelanggan |
| Laporan pemilik | Ringkasan servis, pendapatan, pemakaian suku cadang, stok menipis, kinerja mekanik |
| Portal pelanggan | Pelanggan mendaftar sendiri, mengelola kendaraan dan profil, dan mengajukan servis yang diverifikasi admin sebelum menjadi order |
| Nota servis via email | Nota PDF dikirim otomatis saat servis selesai lewat antrean persisten dengan percobaan ulang (SMTP opsional) |

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
│   │   │   ├── customer-portal/ registrasi dan endpoint /customer/* untuk pelanggan
│   │   │   ├── vehicles/       data kendaraan
│   │   │   ├── service-orders/ servis, status, pelacakan publik
│   │   │   ├── service-requests/ pengajuan servis dari pelanggan
│   │   │   ├── receipts/       nota PDF dan pengiriman email
│   │   │   ├── spare-parts/    katalog dan stok suku cadang
│   │   │   ├── stock-movements/ riwayat pergerakan stok
│   │   │   └── reports/        laporan pemilik
│   │   ├── routes/             penggabungan seluruh router
│   │   ├── utils/              hash, phone, mask, pagination, transaction, ref
│   │   ├── app.js              konfigurasi Express
│   │   └── server.js           titik masuk aplikasi
│   ├── tests/
│   │   ├── integration/        pengujian endpoint lewat HTTP
│   │   ├── unit/               pengujian fungsi terpisah
│   │   └── helpers/            basis data sementara dan data uji
│   ├── .env.example            contoh konfigurasi
│   ├── eslint.config.js
│   └── package.json
├── frontend/                   antarmuka pengguna (Next.js), lihat frontend/README.md
│   └── mock-backend/           backend tiruan untuk demo tampilan
└── brand/                      logo, kit identitas, dan panduan pemakaian
```

Setiap modul memakai pola yang sama, lima berkas:

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
| Email nota | Nodemailer, PDFKit | 10, 0.20 |
| Pengujian | Vitest, Supertest, mongodb-memory-server | 5, 7, 11 |
| Kualitas kode | ESLint, Prettier | 10, 3 |
| Frontend | Next.js, React, TypeScript | 16, 19, 5 |
| Gaya dan data (frontend) | Tailwind CSS, TanStack Query | 4, 5 |

## Menjalankan backend

```bash
cd backend
npm install
cp .env.example .env     # isi MONGODB_URI dan dua JWT secret
npm run dev
```

Cek server hidup: `http://localhost:6318/health`

`.env.example` memakai `PORT=6318` (yang dituju proxy frontend). Tanpa `PORT`, backend memakai 3000.

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
| `npm test` | 195 pengujian otomatis (memakai basis data di memori) |
| `npm run lint` | pemeriksaan ESLint |
| `npm run format` | merapikan format dengan Prettier |
| `npm run format:check` | memeriksa format tanpa mengubah file |
| `npm run reset:password` | mengganti kata sandi pengguna (lihat `scripts/reset-password.js`) |

Email nota bersifat opsional dan mati secara default. Cara mengaktifkannya ada di [backend/README.md](backend/README.md#email-nota-servis-opsional).

## Menjalankan frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

Frontend meneruskan `/api/v1/*` ke backend di `BACKEND_URL` (default `http://localhost:6318`, atur di `frontend/.env.local`). Tanpa backend, jalankan `npm run mock` untuk data contoh. Detail ada di [frontend/README.md](frontend/README.md).

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [backend/docs/API.md](backend/docs/API.md) | referensi lengkap 59 endpoint (57 bisnis + 2 utilitas), kode error, dan aturan wewenang |
| [backend/README.md](backend/README.md) | catatan pengembangan backend dan pengaturan email |
| [frontend/README.md](frontend/README.md) | menjalankan frontend, peran dan akses, serta perbedaan backend tiruan |
| [brand/PANDUAN-LOGO.md](brand/PANDUAN-LOGO.md) | panduan pemakaian logo dan identitas |

## Laporan

Laporan Milestone 1 (PDF):

https://drive.google.com/file/d/1kDmTi31KlfHR6rZ9tofoCnA7I2DcHUCO/view?usp=sharing
