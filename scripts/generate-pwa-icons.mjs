import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "public", "logo.png");
const outDir = path.join(root, "public", "icons");

fs.mkdirSync(outDir, { recursive: true });

const bg = { r: 8, g: 16, b: 24, alpha: 1 };

for (const size of [192, 512]) {
  await sharp(src)
    .resize(size, size, { fit: "contain", background: bg })
    .png()
    .toFile(path.join(outDir, `icon-${size}.png`));

  const pad = Math.round(size * 0.12);
  const inner = size - pad * 2;
  const resized = await sharp(src)
    .resize(inner, inner, { fit: "contain", background: bg })
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: resized, left: pad, top: pad }])
    .png()
    .toFile(path.join(outDir, `maskable-${size}.png`));
}

await sharp(src)
  .resize(180, 180, { fit: "contain", background: bg })
  .png()
  .toFile(path.join(outDir, "apple-touch-icon.png"));

console.log("PWA icons generated in public/icons/");
