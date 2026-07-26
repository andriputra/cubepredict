# CubePredict

Webapp prediksi penyelesaian Rubik 3×3 untuk production di Vercel.

## Fitur

- Input warna 6 sisi rubik (net + editor sisi)
- Validasi konfigurasi warna
- Solver Kociemba (hingga ~22 gerakan)
- Visualisasi 3D step-by-step dengan play/pause/timeline

## Cara kerja solver

CubePredict memakai algoritma deterministik **Kociemba Two-Phase** melalui
library `cubejs`, bukan AI atau machine learning.

Dokumentasi lengkap tentang input state, validasi, dua phase pencarian, notasi
gerakan, dan visualisasi tersedia di
[docs/ALGORITMA.md](docs/ALGORITMA.md).

## Orientasi kubus

Sebelum menginput warna:

1. Putih di atas (U)
2. Hijau di depan (F)
3. Merah di kanan (R)
4. Oranye di kiri (L)
5. Biru di belakang (B)
6. Kuning di bawah (D)

Pusat tiap sisi terkunci sesuai orientasi di atas.

## Development

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm run build
npm start
```

## Deploy ke Vercel

1. Push repo ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Framework: Next.js (terdeteksi otomatis)
4. Deploy

Atau pakai CLI:

```bash
npx vercel
```
