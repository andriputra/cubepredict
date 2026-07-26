# Cara Kerja Prediksi CubePredict

## Ringkasan

CubePredict **tidak memakai AI atau machine learning**. Istilah “prediksi” pada
nama aplikasi berarti sistem menghitung urutan gerakan dari kondisi Rubik yang
dimasukkan pengguna.

Perhitungannya bersifat deterministik dan memakai **algoritma Kociemba
Two-Phase** yang disediakan oleh library JavaScript
[`cubejs`](https://www.npmjs.com/package/cubejs).

Untuk kondisi Rubik yang sama, solver akan menghasilkan solusi yang konsisten.
Library ini mencari solusi hingga sekitar 22 gerakan. Solusinya sangat pendek,
tetapi tidak dijamin selalu merupakan solusi paling pendek secara matematis.

## Alur sistem

```text
Input 54 warna
      ↓
Validasi pusat dan jumlah warna
      ↓
Konversi warna menjadi notasi URFDLB
      ↓
Bangun model cubie Rubik
      ↓
Kociemba Two-Phase mencari solusi
      ↓
Hasil: R U R' U' ...
      ↓
Setiap gerakan diterapkan ulang untuk visualisasi
```

### 1. Input warna

Rubik 3×3 mempunyai 6 sisi dan 9 stiker per sisi, sehingga ada 54 posisi
stiker. CubePredict memakai orientasi tetap:

- `U` (Up/atas) = putih
- `R` (Right/kanan) = merah
- `F` (Front/depan) = hijau
- `D` (Down/bawah) = kuning
- `L` (Left/kiri) = oranye
- `B` (Back/belakang) = biru

Urutan internalnya adalah `U R F D L B`. Setiap sisi dibaca dari kiri atas ke
kanan bawah.

Contoh Rubik yang sudah selesai:

```text
UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB
```

Warna tidak dikirim sebagai nama warna ke solver. Warna dikonversi menjadi
huruf sisi berdasarkan warna pusat. Contohnya, seluruh stiker hijau menjadi
`F`, karena pusat sisi depan adalah hijau.

Implementasi konversi berada di:

- `src/lib/cube/engine.ts` — `toFaceletString()`
- `src/lib/cube/types.ts` — pemetaan warna dan sisi

### 2. Validasi

Sebelum menjalankan solver, aplikasi memeriksa:

1. Setiap warna berjumlah tepat 9 stiker.
2. Warna pusat sesuai orientasi yang ditetapkan.
3. State dapat dibaca dan diselesaikan oleh engine.

Dua pemeriksaan awal dilakukan oleh `validateCube()`. Validitas fisik seperti
edge terbalik, corner terpuntir, atau parity yang mustahil diketahui ketika
engine mencoba membangun dan menyelesaikan state. Jika gagal, aplikasi meminta
pengguna memeriksa input.

Catatan: jumlah warna yang benar belum tentu berarti konfigurasi tersebut
mungkin dibuat pada Rubik fisik. Karena itu pemeriksaan oleh solver tetap
diperlukan.

### 3. Inisialisasi solver

Kociemba memakai **move tables** dan **pruning tables**. Tabel tersebut
dipersiapkan sekali melalui:

```ts
Cube.initSolver();
```

Inisialisasi pertama lebih berat daripada proses solve berikutnya. CubePredict
menyimpan status inisialisasi agar proses tersebut tidak diulang pada setiap
klik.

Implementasinya ada di `src/lib/cube/solver.ts` pada
`ensureSolverReady()`.

## Algoritma Kociemba Two-Phase

Ruang kemungkinan Rubik 3×3 sangat besar: sekitar
`43.252.003.274.489.856.000` konfigurasi. Mencoba semua kemungkinan satu per
satu tidak praktis.

Kociemba membagi pencarian menjadi dua tahap.

### Phase 1 — masuk ke subgroup G1

Solver mencari gerakan yang membuat state memenuhi batasan tertentu:

- orientasi semua corner benar;
- orientasi semua edge benar;
- empat edge middle-slice berada pada kelompok slice yang benar.

Tujuan phase ini belum menyelesaikan Rubik. Tujuannya memperkecil ruang
pencarian secara drastis agar state masuk ke subgroup `G1`.

### Phase 2 — selesaikan permutation

Dari subgroup tersebut, solver menyelesaikan posisi corner dan edge sampai
Rubik kembali ke state solved. Gerakan yang digunakan pada tahap ini lebih
terbatas:

```text
U, U2, U', D, D2, D', R2, L2, F2, B2
```

### Pencarian dan pruning

Pada kedua phase, solver melakukan pencarian berbasis kedalaman dengan bantuan
pruning tables. Tabel pruning memberikan batas bawah perkiraan jumlah gerakan
yang masih dibutuhkan.

Jika sebuah cabang tidak mungkin mencapai solusi dalam batas kedalaman saat
ini, cabang tersebut dihentikan lebih awal. Inilah yang membuat pencarian jauh
lebih cepat daripada brute force biasa.

## Notasi gerakan

Huruf menunjukkan sisi yang diputar ketika sisi tersebut dilihat langsung:

- `U` = atas
- `D` = bawah
- `F` = depan
- `B` = belakang
- `L` = kiri
- `R` = kanan

Suffix menunjukkan arah atau jumlah putaran:

- tanpa suffix, misalnya `R` = 90° searah jarum jam
- apostrof, misalnya `R'` = 90° berlawanan jarum jam
- angka 2, misalnya `R2` = 180°

Contoh:

```text
R U R' U'
```

berarti:

1. Putar kanan 90° searah jarum jam.
2. Putar atas 90° searah jarum jam.
3. Putar kanan 90° berlawanan jarum jam.
4. Putar atas 90° berlawanan jarum jam.

## Visualisasi langkah

Hasil `cube.solve()` berupa string notasi gerakan. CubePredict memecahnya
menjadi daftar gerakan melalui `parseMoves()`.

Untuk setiap langkah:

1. state sebelumnya dibuat menjadi objek `Cube`;
2. satu gerakan diterapkan dengan `cube.move(move)`;
3. state baru dikonversi kembali menjadi warna;
4. state tersebut ditampilkan dalam visualisasi 3D.

Fungsi terkait berada di `src/lib/cube/solver.ts`:

- `applyMove()` menerapkan satu gerakan;
- `statesAlongSolution()` membuat state untuk seluruh timeline.

Jadi visualisasi bukan animasi tebakan. Setiap frame berasal dari penerapan
gerakan yang sama pada model Rubik.

## Contoh alur kode

Versi sederhananya:

```ts
const validation = validateCube(stickers);
if (!validation.ok) return validation.errors;

Cube.initSolver();

const facelets = toFaceletString(stickers);
const cube = Cube.fromString(facelets);
const algorithm = cube.solve();
const moves = parseMoves(algorithm);
```

Implementasi production menambahkan penanganan error, cache inisialisasi, state
loading, dan pembuatan timeline visualisasi.

## Scan kamera

Selain input manual, CubePredict dapat mendeteksi warna stiker dari kamera
perangkat.

Alur singkat:

1. Browser meminta izin kamera (`getUserMedia`).
2. Frame video dipotong menjadi kotak tengah, lalu di-downscale (±216 px)
   agar pemrosesan cepat.
3. Sampling hanya dilakukan di dalam area grid panduan 3×3 yang terlihat di
   layar, sehingga posisi yang disejajarkan pengguna sama dengan posisi yang
   dibaca sistem.
4. Tiap sel diambil rata-rata RGB di area tengah stiker.
5. Koreksi white-balance gray-world diterapkan untuk menetralkan cahaya
   hangat/dingin.
6. RGB dikonversi ke HSV, lalu diklasifikasi lewat rentang hue
   (putih, kuning, merah, oranye, hijau, biru).
7. Hasil beberapa frame terakhir digabungkan dengan voting mayoritas supaya
   deteksi stabil dan tidak berkedip.
8. Pusat sisi dikunci sesuai orientasi aplikasi.
9. Hasil scan bisa dikoreksi manual sebelum prediksi.

Implementasi utama:

- `src/lib/cube/vision.ts` — sampling frame dan klasifikasi warna
- `src/components/CameraScanner.tsx` — UI scan 6 sisi

Akurasi bergantung pada cahaya. Cahaya merata dan posisi sejajar grid memberi
hasil terbaik. Scan kamera bukan computer vision berbasis AI; metode yang
dipakai adalah klasifikasi warna berbasis jarak HSV.

## Memory penyelesaian

Setelah prediksi berhasil, state Rubik dan algoritma solusinya disimpan di
`localStorage` perangkat pengguna.

Setiap memory berisi:

- label waktu
- sumber input (`manual`, `camera`, atau `scramble`)
- 54 stiker
- algoritma dan daftar gerakan
- jumlah gerakan

Memory bisa dimuat ulang untuk memutar solusi, atau dihapus. Data hanya
tersimpan di browser lokal, bukan di server.

Implementasi: `src/lib/cube/memory.ts` dan `src/components/MemoryPanel.tsx`.

## Batasan saat ini

- Hanya mendukung Rubik standar 3×3.
- Deteksi kamera sensitif terhadap pencahayaan dan pantulan plastik.
- Orientasi saat input harus mengikuti petunjuk aplikasi.
- Memory tersimpan lokal di browser, bukan sinkron antar perangkat.
- Kociemba menghasilkan solusi sangat pendek, tetapi tidak menjamin solusi
  optimal absolut.
- Inisialisasi pertama dapat terasa lebih lama karena pruning tables dibuat di
  browser pengguna.

## Lokasi kode utama

- `src/lib/cube/types.ts` — tipe, warna, sisi, dan notasi.
- `src/lib/cube/engine.ts` — validasi dan konversi state.
- `src/lib/cube/solver.ts` — inisialisasi dan pemanggilan Kociemba.
- `src/lib/cube/vision.ts` — deteksi warna dari kamera.
- `src/lib/cube/memory.ts` — penyimpanan memory lokal.
- `src/components/CameraScanner.tsx` — alur scan 6 sisi.
- `src/components/MemoryPanel.tsx` — riwayat dan muat ulang solusi.
- `src/components/SolutionPlayer.tsx` — kontrol langkah dan timeline.
- `src/components/Cube3D.tsx` — tampilan visual Rubik.

## Referensi

- Herbert Kociemba, Two-Phase Algorithm:
  <https://kociemba.org/cube.htm>
- Dokumentasi `cubejs`:
  <https://www.npmjs.com/package/cubejs>

