# AI di CubePredict

CubePredict memakai **hybrid AI**:

1. Solver tetap **Kociemba** (algoritma, bukan AI) untuk menghitung gerakan.
2. **AI Coach** menjelaskan tiap langkah supaya mudah diikuti.
3. **AI Vision** membantu deteksi warna dari kamera.

## 1. AI Coach (penjelasan langkah)

### Mode lokal (default, tanpa API key)

File: `src/lib/ai/explain.ts`

- Menjelaskan pegangan tangan
- Arah putar (↻ / ↺ / 180°)
- Konteks fase solusi (awal / tengah / akhir)
- Tips berdasarkan gerakan sebelumnya

Panel UI: `src/components/AiCoachPanel.tsx`

### Mode OpenAI (opsional)

Endpoint: `POST /api/ai/explain`

Set di Vercel / `.env.local`:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Jika key ada, penjelasan lokal diperkaya oleh model bahasa.
Jika key tidak ada / gagal, aplikasi otomatis fallback ke coach lokal.

## 2. AI Vision (deteksi kamera)

### Mode on-device (default)

File: `src/lib/ai/vision.ts`

- Klasifikasi warna berbasis skor HSV/RGB
- Resolusi ambiguitas (merah vs oranye, dll.)
- **Rebalance global**: memaksa tepat 9 stiker per warna setelah 6 sisi di-scan
  (pusat sisi tetap terkunci)

Alur kamera: `src/components/CameraScanner.tsx`

### Mode OpenAI Vision (opsional)

Endpoint: `POST /api/ai/vision`

```bash
OPENAI_API_KEY=sk-...
OPENAI_VISION_MODEL=gpt-4o-mini
```

Saat capture, crop wajah dikirim ke Vision API untuk verifikasi 3×3.
Jika API tidak tersedia, hasil on-device AI tetap dipakai.

## Ringkasan arsitektur

```text
Kamera frame
   ↓
Sampling grid 3×3
   ↓
AI on-device classifyFaceAi()
   ↓ (opsional)
OpenAI Vision refine
   ↓
Setelah 6 sisi: rebalanceCubeFromSamples()
   ↓
Kociemba solve()
   ↓
AI Coach menjelaskan tiap move (+ opsional OpenAI)
   ↓
Animasi 3D + memory
```

## Deploy Vercel

1. Project Settings → Environment Variables
2. Tambahkan `OPENAI_API_KEY` (opsional)
3. Redeploy

Tanpa key pun production tetap jalan penuh dengan AI lokal.
