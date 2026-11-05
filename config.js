// KONFIGURASI SISTEM - diisi SEKALI oleh tim IT, lalu diunggah bersama berkas lain ke hosting.

// 1) URL Web app Apps Script (berakhiran /exec). Jika diisi, kolom URL di layar login disembunyikan
//    dan pengguna tidak dapat mengubahnya dari browser.
//    Contoh: window.PRESENSI_API = 'https://script.google.com/macros/s/XXXXXXXX/exec';
window.PRESENSI_API = 'https://script.google.com/macros/s/AKfycbyU9TC8nonWhTUUxjnlY1OJblqskm4izLVu3sXYkQxqPf2IMxbQcauNV59HKQA9u6Mv/exec';

// 2) Identitas dan warna sekolah. Cukup ubah di sini, seluruh tampilan ikut berubah.
window.PRESENSI_TEMA = {
  nama: 'SMAS Katolik Cor Jesu',                 // tampil di header, login, dan layar siaga
  slogan: 'Sistem Presensi Peserta Didik',   // teks kecil di bawah nama
  logo: 'logo.png',                          // berkas logo di folder yang sama (PNG persegi, minimal 256x256). Jika tidak ada, tampil monogram inisial
  warna: '#52a447',                          // warna utama sekolah (kode hex)
  aksen: '#b8913a'                           // warna garis aksen, mis. emas (kode hex)
};
