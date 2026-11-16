# MotoBase: Panduan Logo (ringkas)

Tulisan ini untuk non-desainer. Intinya: pakai file yang sudah disediakan, jangan menggambar ulang.

## 1. Logonya
- **Ide:** motor matic yang melaju. Ekornya terurai menjadi tiga garis kecepatan oranye.
  Siluet matic dipilih karena itulah motor yang paling dikenal pelanggan bengkel di Indonesia.
- **Versi:** lockup horizontal (utama) · bertumpuk · simbol · simbol kecil · ikon (persegi putih).
- **Tampilan utama:** motor **hitam** dengan **tiga garis oranye**, di **latar putih polos**.
- **Dibangun dari** kapsul dan cincin dengan sudut bersih (jok-lantai 45°, tameng 25°, setang 15°),
  jadi aman dipotong untuk stiker, vinil, dan papan nama.

| Pakai untuk | File (`brand/logo/svg/`) |
|---|---|
| Header web, dokumen, surat (latar terang) | `motobase-lockup-warna.svg` |
| Sidebar atau latar gelap | `motobase-lockup-gelap.svg` |
| Di atas warna oranye | `motobase-lockup-putih.svg` |
| Cetak satu warna | `motobase-lockup-hitam.svg` atau `-oranye.svg` |
| Ruang persegi (poster, spanduk) | `motobase-tumpuk-*.svg` |
| Simbol saja (avatar lebar, stempel) | `motobase-simbol*.svg` |
| Ukuran di bawah 32 px | `motobase-simbol-kecil.svg` |
| Favicon, ikon aplikasi, media sosial | `motobase-ikon.svg` (latar putih polos, motor hitam, 3 garis oranye) |
| Ikon di latar gelap (opsional) | `motobase-ikon-gelap.svg` |
| Ikon web (PWA) | `brand/web/` (favicon.ico, icon-192/512, maskable, apple-touch, site.webmanifest) |

PNG siap pakai ada di `brand/logo/png/` (latar transparan).

## 2. Ruang kosong
Sisakan ruang kosong **setengah tinggi huruf "M"** di keempat sisi lockup. Untuk simbol saja,
setengah diameter roda. Ruang ini ikut membesar dan mengecil bersama logo, jangan pakai jarak tetap.

## 3. Ukuran minimum
| Versi | Layar | Cetak |
|---|---|---|
| Lockup horizontal | 120 px lebar | 30 mm lebar |
| Simbol (dengan garis kecepatan) | 32 px lebar | 10 mm |
| Simbol kecil / ikon | 16 px | 5 mm |

Di bawah 32 px, jangan pakai simbol bergaris kecepatan; pakai `simbol-kecil` atau `ikon`.

## 4. Warna
| Nama | HEX | RGB | CMYK (perkiraan) |
|---|---|---|---|
| Oranye MotoBase | `#F26A1B` | 242, 106, 27 | 0, 56, 89, 5 |
| Hitam Aspal | `#181B20` | 24, 27, 32 | 25, 16, 0, 87 |
| Putih | `#FFFFFF` | 255, 255, 255 | 0, 0, 0, 0 |

CMYK di atas hasil konversi kasar. Untuk cetak, minta printer membuat **proof warna** dan mencocokkannya;
padanan Pantone belum ditetapkan.

**Pasangan latar yang disetujui**
- Penuh warna di atas putih atau abu sangat muda
- Di permukaan gelap (sidebar, panel login): letakkan logo warna di atas **pelat putih**, seperti yang dipakai di aplikasi
- Versi gelap (badan putih, garis oranye) di atas Hitam Aspal, bila pelat putih tidak memungkinkan
- Versi putih di atas oranye
- Hitam di atas putih untuk cetak satu warna

**Kontras:** hitam aspal di atas putih sangat tinggi (sekitar 16:1). Putih di atas oranye sekitar 3:1,
cukup untuk logo dan judul besar, tapi jangan dipakai untuk teks kecil di atas oranye.

## 5. Huruf
- **Wordmark:** Plus Jakarta Sans, "Moto" ExtraBold dan "Base" Medium. Lisensi SIL Open Font License (boleh
  untuk logo). Hurufnya sudah diubah menjadi bentuk (outline), jadi **jangan mengetik ulang** nama merek.
- **Materi pendukung:** pakai Plus Jakarta Sans juga (judul Bold atau ExtraBold, isi Regular atau Medium).

## 6. Jangan
Jangan meregangkan atau menekan logo · jangan mengubah warna di luar palet · jangan memutar · jangan menambah
bayangan, garis tepi, atau gradasi · jangan memisahkan atau menyusun ulang bagian lockup · jangan menaruh di atas
foto ramai tanpa pelat putih · jangan menaruh logo hitam langsung di atas latar gelap (pakai pelat putih
atau versi gelap) · jangan mengetik ulang wordmark.

## 7. File sumber dan catatan
- Semua file dihasilkan oleh `brand/sumber/build_kit.py` (butuh `fonttools` dan font Plus Jakarta Sans).
  Ubah angka geometri di sana lalu jalankan ulang, jangan menyunting SVG hasilnya satu per satu.
- Yang belum ada: PDF/AI/EPS (SVG ini bisa dibuka di Inkscape atau Illustrator lalu disimpan ke format itu).
- **Merek dagang:** logo ini belum diperiksa kemiripannya dengan merek lain. Sebelum dipakai resmi,
  lakukan pencarian merek dagang (PDKI/DJKI) dan pencarian gambar balik.
- Folder `brand/concepts/` berisi tiga konsep awal (A, B, C) sebagai catatan proses.
