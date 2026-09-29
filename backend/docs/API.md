# MotoBase Backend — Dokumentasi API

Base URL: `http://localhost:6318/api/v1`

Semua response sukses berbentuk `{ success: true, message?, data }`.
Semua response gagal berbentuk `{ success: false, error: { code, message, details, requestId } }`.

Kode error bersifat stabil dan boleh dipakai frontend untuk percabangan logika.
`message` boleh ditampilkan ke pengguna.

---

## Asumsi yang diambil

Hal-hal berikut belum ditentukan di deskripsi tugas. Dipilih opsi paling
sederhana yang tetap aman, dan semuanya mudah diubah nanti.

| Keputusan | Yang dipakai sekarang |
|---|---|
| Login staf | Email + password |
| Refresh token | Cookie `HttpOnly`, rotasi setiap refresh |
| Masa berlaku tracking token | 90 hari (`TRACKING_TOKEN_TTL_DAYS`) |
| Yang boleh mengubah status servis | Mekanik yang ditugaskan + admin |
| Kepemilikan kendaraan | Satu kendaraan satu pelanggan |
| Persetujuan estimasi biaya | Belum ada |
| Pembayaran parsial | Belum ada, hanya `BELUM_DIBAYAR` / `DIBAYAR` |
| Cabang | Satu cabang |
| Provider WhatsApp | Belum dipilih, notifikasi belum diaktifkan |

---

## Health check

```http
GET /health
```

Di luar prefix `/api/v1` dan tidak terkena rate limit.

---

## Authentication

### POST /auth/login

Rate limit: 10 percobaan **gagal** per 15 menit per IP.

Request:

```json
{ "email": "owner@lajujaya.id", "password": "rahasia" }
```

Response 200 — sekaligus mengeset cookie `refreshToken`
(`HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth`, kedaluwarsa 7 hari):

```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "user": {
      "id": "6700...",
      "name": "Rafif Raihan",
      "email": "owner@lajujaya.id",
      "phone": null,
      "role": "OWNER",
      "isActive": true,
      "lastLoginAt": null,
      "createdAt": "2026-09-22T01:00:00.000Z"
    }
  }
}
```

| Kode error | HTTP | Arti |
|---|---|---|
| `VALIDATION_ERROR` | 400 | email/password tidak sesuai format |
| `INVALID_CREDENTIALS` | 401 | email atau password salah (sengaja tidak dibedakan) |
| `ACCOUNT_INACTIVE` | 403 | akun dinonaktifkan |
| `TOO_MANY_LOGIN_ATTEMPTS` | 429 | terlalu banyak percobaan gagal |

### POST /auth/refresh

Tanpa body. Browser mengirim cookie `refreshToken` secara otomatis, jadi
`fetch` di frontend **wajib** memakai `credentials: "include"`.

Response 200 sama bentuknya dengan login, dan cookie diganti dengan yang baru.

Refresh token bersifat **sekali pakai**. Token lama otomatis dicabut setiap kali
refresh berhasil. Kalau token yang sudah dicabut dipakai lagi, sistem
menganggapnya sebagai token curian: **semua sesi user tersebut dicabut** dan
pengguna harus login ulang.

| Kode error | HTTP | Arti |
|---|---|---|
| `INVALID_REFRESH_TOKEN` | 401 | cookie tidak ada, rusak, kedaluwarsa, atau sudah dicabut |
| `REFRESH_TOKEN_REUSED` | 401 | token yang sudah dipakai dipakai lagi; semua sesi dicabut |

### POST /auth/logout

Tanpa body. Mencabut sesi dan menghapus cookie. Selalu **204**, walaupun
cookie-nya sudah tidak valid.

### GET /auth/me

Butuh header `Authorization: Bearer <accessToken>`.

| Kode error | HTTP | Arti |
|---|---|---|
| `UNAUTHENTICATED` | 401 | header Authorization tidak ada atau bukan Bearer |
| `TOKEN_EXPIRED` | 401 | access token kedaluwarsa → panggil `/auth/refresh` lalu ulangi |
| `INVALID_TOKEN` | 401 | token rusak atau palsu → arahkan ke halaman login |
| `ACCOUNT_INACTIVE` | 403 | akun dinonaktifkan setelah token diterbitkan |

---

## Catatan untuk frontend (Next.js)

- **Access token** berumur 15 menit, simpan di memori (state), **jangan** di
  `localStorage`.
- **Refresh token** ada di cookie `HttpOnly` dan memang tidak bisa dibaca
  JavaScript. Itu disengaja.
- Alur yang disarankan: kalau sebuah request membalas `TOKEN_EXPIRED`, panggil
  `/auth/refresh` sekali, lalu ulangi request aslinya. Kalau refresh juga gagal,
  arahkan ke halaman login.
- Setiap response membawa header `X-Request-Id`, dan nilainya sama dengan
  `error.requestId`. Sertakan nilai itu saat melaporkan bug.

---

## Users (staf internal)

Semua butuh login. `POST` dan `PATCH` hanya untuk **OWNER**; `GET` untuk
**OWNER** dan **ADMIN**.

| Endpoint | Keterangan |
|---|---|
| `GET /users?page&limit&role&isActive&search` | daftar staf, ada `meta` pagination |
| `POST /users` | `{ name, email, password, role, phone? }` — role hanya ADMIN/MECHANIC/OWNER |
| `GET /users/:id` | detail |
| `PATCH /users/:id` | hanya `name`, `email`, `phone`. **Role dan password tidak bisa diubah di sini** |
| `PATCH /users/:id/status` | `{ isActive }`. Menonaktifkan akan mencabut semua sesi user itu |

Kode error: `USER_NOT_FOUND` (404), `EMAIL_ALREADY_USED` / `PHONE_ALREADY_USED`
(409), `CANNOT_DEACTIVATE_SELF` (409).

---

## Customers

`GET` untuk **ADMIN** dan **OWNER**, `POST`/`PATCH` hanya **ADMIN**. Mekanik
tidak punya akses.

| Endpoint | Keterangan |
|---|---|
| `GET /customers?page&limit&search` | `search` mencocokkan nama, telepon, email |
| `POST /customers` | `{ name, phone, email?, address?, notes? }` |
| `GET /customers/:id` | detail |
| `PATCH /customers/:id` | sebagian field |
| `GET /customers/:id/vehicles` | kendaraan milik pelanggan tersebut |

Nomor telepon **selalu dinormalisasi** ke `62xxxxxxxxxx` sebelum disimpan, jadi
`0812…`, `+62812…`, dan `62812…` dianggap nomor yang sama. Nomor bersifat unik
antar pelanggan supaya admin tidak keliru memilih data yang sama dua kali.

`userId` bernilai `null` selama pelanggan belum punya akun, dan tidak bisa
diubah lewat endpoint ini.

Kode error: `CUSTOMER_NOT_FOUND` (404), `PHONE_ALREADY_USED` (409).

---

## Vehicles

`GET` untuk **ADMIN**, **OWNER**, dan **MECHANIC** (mekanik perlu data kendaraan
saat mengerjakan servis). `POST`/`PATCH` hanya **ADMIN**.

| Endpoint | Keterangan |
|---|---|
| `GET /vehicles?page&limit&customerId&search` | `search` mencocokkan plat nomor |
| `POST /vehicles` | `{ customerId, licensePlate, brand, model, year?, color?, chassisNumber?, engineNumber? }` |
| `GET /vehicles/:id` | detail |
| `PATCH /vehicles/:id` | termasuk `customerId` untuk mencatat perpindahan pemilik |

Plat nomor unik secara global setelah dinormalisasi (spasi dan tanda hubung
dibuang, diubah ke huruf besar), jadi `AB 1234 XY` dan `ab1234xy` dianggap sama.

Kode error: `VEHICLE_NOT_FOUND` (404), `LICENSE_PLATE_ALREADY_USED` (409),
`CUSTOMER_NOT_FOUND` (404) kalau `customerId` tidak ada.

---

## Service Orders

Semua butuh login. `POST`, `assign-mechanic`, `payment`, dan endpoint tracking:
**ADMIN**. Ubah data, status, dan suku cadang: **ADMIN atau MECHANIC** (mekanik
hanya untuk order yang ditugaskan kepadanya). `GET`: semua staf.

| Endpoint | Keterangan |
|---|---|
| `GET /service-orders?page&limit&status&customerId&vehicleId&assignedMechanicId&paymentStatus&startDate&endDate&search` | mekanik otomatis hanya melihat order miliknya |
| `POST /service-orders` | `{ customerId, vehicleId, complaint, serviceCost?, assignedMechanicId?, internalNotes? }` |
| `GET /service-orders/:id` | detail |
| `PATCH /service-orders/:id` | `complaint`, `diagnosis`, `internalNotes`, `serviceCost` (mekanik tidak boleh ubah biaya) |
| `PATCH /service-orders/:id/assign-mechanic` | `{ mechanicId }` atau `{ mechanicId: null }` untuk melepas |
| `PATCH /service-orders/:id/status` | `{ status, note?, isCorrection? }` |
| `POST /service-orders/:id/parts` | `{ sparePartId, quantity }` — dukung header `Idempotency-Key` |
| `DELETE /service-orders/:id/parts/:usageId` | membatalkan pemakaian, stok kembali lewat REVERSAL |
| `POST /service-orders/:id/payment` | `{ method }` — `TUNAI`, `TRANSFER`, atau `QRIS` |
| `POST /service-orders/:id/rotate-tracking-token` | membuat link tracking baru, yang lama mati |
| `POST /service-orders/:id/revoke-tracking-token` | mematikan link tracking |
| `GET /vehicles/:id/service-orders` | riwayat servis satu kendaraan |
| `GET /customers/:id/service-orders` | riwayat servis satu pelanggan |

**`trackingToken` hanya muncul sekali**, di response `POST /service-orders` dan
`rotate-tracking-token`. Database hanya menyimpan hash-nya, jadi token itu tidak
bisa diminta ulang. Kirimkan ke pelanggan atau cetak sebagai QR saat itu juga.

### Alur status

```
ANTRE -> DIPERIKSA -> DIKERJAKAN -> SELESAI -> DIAMBIL
                (DIBATALKAN bisa dari status mana pun yang belum final)
```

Hanya boleh maju satu tahap. Koreksi mundur memakai `isCorrection: true`, hanya
boleh **ADMIN**, wajib menyertakan `note`, dan ditandai di history (tidak
ditampilkan pada timeline pelanggan).

### Uang dan total

`serviceCost`, `partsSubtotal`, dan `grandTotal` berupa **integer rupiah**.
Total selalu dihitung ulang backend; mengirimnya dari frontend tidak berpengaruh.
Harga suku cadang **disalin** saat pemakaian dicatat, sehingga perubahan harga
tidak mengubah servis yang sudah berjalan.

Kode error: `SERVICE_ORDER_NOT_FOUND`, `VEHICLE_NOT_OWNED_BY_CUSTOMER` (409),
`INVALID_STATUS_TRANSITION` (409), `ORDER_ALREADY_CLOSED` (409),
`NOT_ASSIGNED_MECHANIC` (403), `INVALID_STATUS_FOR_PART_USAGE` (409),
`INSUFFICIENT_STOCK` (409), `PART_USAGE_NOT_FOUND` (404), `ALREADY_PAID` (409),
`ORDER_NOT_READY_FOR_PAYMENT` (409), `CORRECTION_NOTE_REQUIRED` (400).

---

## Spare Parts & Stock Movements

`GET` suku cadang: semua staf (mekanik perlu melihat sisa stok). Perubahan stok
dan katalog: **ADMIN**. Riwayat pergerakan: **ADMIN** dan **OWNER**.

| Endpoint | Keterangan |
|---|---|
| `GET /spare-parts?page&limit&search&category&isActive&lowStock` | `isLowStock` ikut di tiap item |
| `GET /spare-parts/low-stock` | daftar yang perlu dipesan ulang |
| `POST /spare-parts` | `{ sku, name, sellingPrice, purchasePrice, initialStock?, minimumStock?, unit?, category? }` |
| `GET /spare-parts/:id`, `PATCH /spare-parts/:id` | `currentStock` **tidak bisa** diubah di sini |
| `POST /spare-parts/:id/stock-in` | `{ quantity, reason?, referenceId? }` |
| `POST /spare-parts/:id/adjust-stock` | `{ quantity, reason }` — `quantity` bertanda, `reason` wajib |
| `GET /spare-parts/:id/movements`, `GET /stock-movements` | riwayat, append-only |

**`purchasePrice` hanya dikirim untuk OWNER.** Admin dan mekanik hanya melihat
harga jual.

**Idempotency:** `stock-in`, `adjust-stock`, dan `POST /service-orders/:id/parts`
menerima header `Idempotency-Key`. Retry dengan kunci yang sama mengembalikan
hasil yang pertama tanpa mengubah stok dua kali. Pakai UUID per aksi pengguna.

Stok tidak pernah menjadi negatif: syarat kecukupan stok menyatu dengan operasi
pengurangan, dan seluruh perubahan berjalan dalam satu transaction.

---

## Public tracking (tanpa login)

```http
GET /api/v1/public/service-orders/track/:token
```

Rate limit 30 request per 15 menit per IP. Hanya baca; token tidak pernah bisa
mengubah data. Plat nomor dan nama pelanggan disamarkan, mekanik hanya nama
depan, dan nomor telepon, alamat, harga modal, serta catatan internal tidak
pernah ikut.

Token salah, kedaluwarsa, dan dicabut semuanya membalas **404
`TRACKING_NOT_FOUND`** dengan pesan yang sama persis, supaya tidak bocor bahwa
sebuah token pernah valid.

---

## Reports

Semua menerima `?startDate=2026-09-01&endDate=2026-09-30` (opsional). Tanggal
diartikan sebagai hari penuh waktu lokal bengkel.

| Endpoint | Role | Isi |
|---|---|---|
| `GET /reports/service-summary` | OWNER, ADMIN | jumlah order per status, rata-rata jam pengerjaan |
| `GET /reports/revenue-summary` | OWNER | pendapatan jasa vs suku cadang, per metode bayar, tagihan belum dibayar |
| `GET /reports/parts-usage` | OWNER, ADMIN | suku cadang terlaris; `modal` dan `margin` hanya untuk OWNER |
| `GET /reports/low-stock` | OWNER, ADMIN | kekurangan terhadap batas minimum |
| `GET /reports/mechanic-performance` | OWNER | jumlah selesai, dibatalkan, nilai servis, rata-rata durasi |

---

## Belum dikerjakan

| Fitur | Status |
|---|---|
| Notifikasi WhatsApp / email | **belum** — provider belum dipilih |
| Struk PDF (`GET /service-orders/:id/receipt`) | **belum** |
| `POST /service-orders/:id/resend-tracking` | **belum** — bergantung pada notifikasi |
| Akun pelanggan (registrasi & dashboard) | **di luar lingkup** — brief hanya meminta tiga peran; pelanggan cukup lewat link tracking |
| Dokumentasi OpenAPI/Swagger | **belum** — dokumen ini sebagai gantinya |

Titik pemasangannya sudah disiapkan: perubahan status ke `SELESAI` adalah satu
tempat tunggal untuk memicu notifikasi, dan data struk sudah lengkap di service
order.

---

## Role

`ADMIN` (kasir), `MECHANIC`, dan `OWNER`. Seluruh pengecekan wewenang
dilakukan di backend, bukan sekadar menyembunyikan menu di frontend.

| Kemampuan | ADMIN | MECHANIC | OWNER |
|---|:---:|:---:|:---:|
| Membuat service order | Ya | Tidak | Tidak |
| Memperbarui status servis | Ya | Ya (order yang ditugaskan) | Tidak |
| Mencatat pemakaian suku cadang | Ya | Ya (order yang ditugaskan) | Tidak |
| Mengelola pelanggan & kendaraan | Ya | Lihat kendaraan saja | Lihat |
| Mengelola stok | Ya | Lihat | Lihat |
| Melihat laporan | Terbatas | Tidak | Ya |
| Melihat harga modal | Tidak | Tidak | Ya |

Pelanggan **tidak punya akun**. Mereka memantau servisnya lewat link tracking
yang diberikan saat order dibuat.
