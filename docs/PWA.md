# PWA — CubePredict

CubePredict adalah Progressive Web App yang bisa di-install di Android, iOS,
dan desktop.

## Checklist installability

- [x] HTTPS (Vercel)
- [x] Web App Manifest
- [x] Ikon 192 & 512 (+ maskable)
- [x] Service Worker (production)
- [x] `display: standalone`
- [x] `theme-color` / Apple web app meta

## File terkait

| File | Fungsi |
|---|---|
| `src/app/manifest.ts` | Manifest dinamis Next.js |
| `src/app/layout.tsx` | Metadata PWA + viewport |
| `next.config.ts` | Integrasi `@ducanh2912/next-pwa` |
| `public/icons/*` | Ikon launcher |
| `scripts/generate-pwa-icons.mjs` | Generate ikon dari `logo.png` |

## Build

```bash
npm run build   # memakai webpack agar SW ter-generate
npm start
```

Di development, PWA/service worker dimatikan (`disable: true` saat `NODE_ENV=development`).

## Cara uji

1. Deploy production / `npm run build && npm start`
2. Buka di Chrome → DevTools → Application → Manifest & Service Workers
3. Pastikan SW aktif dan tidak ada error ikon
4. Install dari address bar (desktop) atau menu browser (mobile)

## iOS Safari

- Pakai **Share → Add to Home Screen**
- Ikon memakai `apple-touch-icon.png`
- Offline caching di iOS lebih terbatas dibanding Android Chrome
