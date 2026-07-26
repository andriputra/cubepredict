# CubePredict

Webapp prediksi penyelesaian Rubik 3×3 untuk production di Vercel.

## Fitur

- Input warna 6 sisi rubik (net + editor sisi)
- Scan warna lewat kamera (grid 3×3 + klasifikasi HSV)
- Memory penyelesaian tersimpan di browser (`localStorage`)
- Validasi konfigurasi warna
- Solver Kociemba (hingga ~22 gerakan)
- Visualisasi 3D step-by-step dengan play/pause/timeline

## Cara kerja solver

CubePredict memakai algoritma deterministik **Kociemba Two-Phase** melalui
library `cubejs`, bukan AI atau machine learning, untuk menghitung gerakan.

Di atas itu ada **AI hybrid** untuk:

- penjelasan langkah (AI Coach)
- deteksi warna kamera (AI Vision on-device + opsional OpenAI)

Dokumentasi solver: [docs/ALGORITMA.md](docs/ALGORITMA.md)

Dokumentasi AI: [docs/AI.md](docs/AI.md)

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

## PWA (Progressive Web App)

CubePredict bisa di-install ke HP/desktop seperti aplikasi native.

Fitur PWA:

- Web App Manifest (`src/app/manifest.ts`)
- Service Worker (via `@ducanh2912/next-pwa`, aktif di production)
- Ikon install (`public/icons/`)
- Mode `standalone` + theme gelap

### Install di perangkat

1. Deploy ke HTTPS (Vercel otomatis HTTPS)
2. Buka di Chrome/Edge/Safari
3. Pilih **Install app** / **Add to Home Screen**

### Catatan teknis

- `npm run build` memakai `--webpack` karena next-pwa membutuhkan webpack plugin
- Service worker **dimatikan di development** agar hot reload tetap nyaman
- Regenerate ikon dari logo: `npm run icons`

Dokumentasi singkat: [docs/PWA.md](docs/PWA.md)
