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

## Batasan saat ini

- Hanya mendukung Rubik standar 3×3.
- Input warna masih manual; belum membaca warna dari kamera.
- Orientasi saat input harus mengikuti petunjuk aplikasi.
- Kociemba menghasilkan solusi sangat pendek, tetapi tidak menjamin solusi
  optimal absolut.
- Inisialisasi pertama dapat terasa lebih lama karena pruning tables dibuat di
  browser pengguna.

## Lokasi kode utama

- `src/lib/cube/types.ts` — tipe, warna, sisi, dan notasi.
- `src/lib/cube/engine.ts` — validasi dan konversi state.
- `src/lib/cube/solver.ts` — inisialisasi dan pemanggilan Kociemba.
- `src/components/SolutionPlayer.tsx` — kontrol langkah dan timeline.
- `src/components/Cube3D.tsx` — tampilan visual Rubik.

## Referensi

- Herbert Kociemba, Two-Phase Algorithm:
  <https://kociemba.org/cube.htm>
- Dokumentasi `cubejs`:
  <https://www.npmjs.com/package/cubejs>

