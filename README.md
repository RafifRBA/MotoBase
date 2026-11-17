<h1 align="center">MotoBase</h1>


Layanan digitalisasi operasional bengkel motor yang membantu mengelola alur servis, pencatatan otomatis stok suku cadang, dan riwayat kendaraan secara terpusat. Untuk memastikan alur kerja transparan dan efisien, layanan ini juga menyediakan pelacakan status pengerjaan dan portal bagi pelanggan, nota servis via email, serta laporan analitik bagi pemilik bengkel.


## Latar Belakang

Bengkel mencatat seluruh kegiatannya secara manual di buku, dan hal ini menimbulkan tiga persoalan:

1. Pelanggan berulang kali menelepon hanya untuk menanyakan apakah motornya sudah selesai.
2. Stok suku cadang kerap habis tanpa disadari karena pemakaiannya tidak terekam.
3. Riwayat servis pelanggan lama hilang ketika buku catatan penuh atau rusak.

MotoBase menjawab ketiganya:

- Status servis dapat dipantau pelanggan lewat tautan tanpa perlu akun, atau lewat akun pelanggan.
- Stok berkurang otomatis setiap kali suku cadang dicatat terpakai.
- Seluruh riwayat tersimpan permanen di basis data.

## Fitur Utama

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

## Tim Pengembang (Kelompok 7)

| Nama | NIM |
|---|---|
| Muhammad Bintang Hidayatullah Marbun | 24/544012/TK/60468 |
| Rafif Raihan Bahrul Alam | 24/534432/TK/59237 |
| Juan Christopher Reinaldo Sipayung | 24/544528/TK/60526 |
| Nabila Putri Barokah | 24/541890/TK/60132 |

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

## Struktur Folder

```
MotoBase/
├── backend/                       REST API (Express + MongoDB)
├── frontend/                      antarmuka pengguna (Next.js)
└── brand/                         logo, kit identitas, dan panduan pemakaian
```

### Backend

```
backend/
├── docs/
│   └── API.md                     referensi seluruh endpoint dan kode error
├── scripts/
│   ├── seed-owner.js              membuat akun pemilik pertama
│   └── reset-password.js          mengganti kata sandi pengguna
├── src/
│   ├── config/                    env.js (validasi environment), db.js (koneksi)
│   ├── middlewares/               authenticate, authorize, validate,
│   │                              rate-limit, error-handler, not-found
│   ├── modules/                   satu folder per domain
│   │   ├── auth/                  login, refresh token, JWT, kata sandi
│   │   ├── users/                 akun staf
│   │   ├── customers/             data pelanggan
│   │   ├── customer-portal/       registrasi dan endpoint /customer/* untuk pelanggan
│   │   ├── vehicles/              data kendaraan
│   │   ├── service-orders/        servis, status, pelacakan publik
│   │   ├── service-requests/      pengajuan servis dari pelanggan
│   │   ├── receipts/              nota PDF dan pengiriman email
│   │   ├── spare-parts/           katalog dan stok suku cadang
│   │   ├── stock-movements/       riwayat pergerakan stok
│   │   └── reports/               laporan pemilik
│   ├── routes/                    penggabungan seluruh router
│   ├── utils/                     hash, phone, mask, pagination, transaction, ref
│   ├── app.js                     konfigurasi Express
│   └── server.js                  titik masuk aplikasi
├── tests/
│   ├── integration/               pengujian endpoint lewat HTTP
│   ├── unit/                      pengujian fungsi terpisah
│   └── helpers/                   basis data sementara dan data uji
├── .env.example                   contoh konfigurasi
├── eslint.config.js
└── package.json
```

Setiap modul backend memakai pola yang sama, yaitu lima berkas:

| Berkas | Isi |
|---|---|
| `*.model.js` | skema Mongoose beserta indeks |
| `*.validation.js` | skema Zod untuk body, params, dan query |
| `*.service.js` | aturan bisnis dan query basis data |
| `*.controller.js` | penerjemahan HTTP dan bentuk respons |
| `*.route.js` | URL beserta middleware |

### Frontend

```
frontend/
├── app/                           route Next.js (App Router)
│   ├── (app)/
│   │   ├── login/                 halaman masuk
│   │   ├── register/              registrasi pelanggan
│   │   └── (dashboard)/           halaman setelah login (dibungkus dashboard shell)
│   │       ├── dashboard/         ringkasan untuk staf
│   │       ├── service-orders/    daftar, buat baru (new/), dan detail ([id]/)
│   │       ├── service-requests/  pengajuan servis dari pelanggan (admin)
│   │       ├── customers/         daftar dan detail ([id]/)
│   │       ├── vehicles/          daftar dan detail ([id]/)
│   │       ├── spare-parts/       katalog stok dan detail ([id]/)
│   │       ├── stock-movements/   riwayat pergerakan stok
│   │       ├── reports/           laporan pemilik
│   │       ├── users/             manajemen akun staf
│   │       ├── my-dashboard/      dashboard pelanggan
│   │       ├── my-vehicles/       kendaraan milik pelanggan
│   │       └── my-services/       riwayat dan pengajuan servis pelanggan
│   ├── track/[token]/             pelacakan publik tanpa login
│   ├── layout.tsx                 layout akar
│   ├── page.tsx                   halaman awal
│   └── globals.css                gaya global (Tailwind)
├── components/
│   ├── ui/                        komponen dasar: button, card, badge, modal,
│   │                              confirm-dialog, data-table, pagination,
│   │                              search-input, form, states, link-button
│   ├── layout/                    dashboard-shell (sidebar) dan nav (menu per peran)
│   ├── providers.tsx              provider TanStack Query dan notifikasi
│   └── role-gate.tsx              pembatas halaman berdasarkan peran
├── features/                      satu folder per modul: api.ts, hooks.ts, komponen
│   ├── auth/                      auth-provider, form login dan registrasi
│   ├── customers/                 daftar, detail, form, dan pemilih pelanggan
│   ├── vehicles/                  daftar, detail, form, dan pemilih kendaraan
│   ├── service-orders/            order servis dan panel-panelnya (status, timeline,
│   │                              suku cadang, pembayaran, penugasan, koreksi, pelacakan)
│   ├── spare-parts/               katalog, detail, form stok, dan riwayat pergerakan
│   ├── tracking/                  tampilan pelacakan publik
│   ├── customer-portal/           api dan tampilan portal pelanggan
│   ├── reports/                   laporan ringkasan, pendapatan, dan data
│   ├── dashboard/                 tampilan dashboard staf
│   └── users/                     daftar dan form akun staf
├── lib/
│   ├── api.ts                     klien HTTP (axios + refresh token otomatis)
│   ├── api-contract.ts            pemetaan nama query param ke backend
│   ├── permissions.ts             aturan akses per peran (untuk UX)
│   ├── tracking-cache.ts          penyimpanan sementara token pelacakan
│   ├── hooks.ts                   kunci idempotensi dan debounce
│   ├── forms.ts                   validasi form (Zod)
│   └── format.ts, refs.ts, notify.ts, constants.ts, utils.ts
├── types/                         tipe respons API dan model data
├── public/                        aset statis
├── next.config.ts                 proxy /api/v1/* ke backend
├── .env.example                   contoh konfigurasi (BACKEND_URL)
└── package.json
```

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [backend/docs/API.md](backend/docs/API.md) | referensi lengkap 59 endpoint (57 bisnis + 2 utilitas), kode error, dan aturan wewenang |
| [backend/README.md](backend/README.md) | catatan pengembangan backend dan pengaturan email |
| [frontend/README.md](frontend/README.md) | peran dan hak akses di frontend |
| [brand/PANDUAN-LOGO.md](brand/PANDUAN-LOGO.md) | panduan pemakaian logo dan identitas |

## Laporan

Laporan Milestone 1 (PDF):

https://drive.google.com/file/d/1kDmTi31KlfHR6rZ9tofoCnA7I2DcHUCO/view?usp=sharing

## Video Demo 
https://drive.google.com/file/d/1fjm243T6Oht8LvY4VH_tZOzZNHoADU1Q/view?usp=drivesdk

## Power Point 
https://drive.google.com/file/d/1TZ5Yx_uC6BgBd7O1Mg1ieb-JefoGSDQ5/view?usp=drivesdk

## Link web
https://motobase.vercel.app/

be: https://motobase-production.up.railway.app/health
