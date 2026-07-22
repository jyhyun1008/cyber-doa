import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "icon.png");
const OUT_DIR = path.join(ROOT, "public", "icons");
const SIZES = [72, 96, 128, 144, 152, 192, 256, 384, 512];
const MASKABLE_BG = "#fadce8";

async function main() {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`source icon not found at ${SOURCE}`);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const size of SIZES) {
    await sharp(SOURCE)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(path.join(OUT_DIR, `icon-${size}.png`));
    console.log(`icon-${size}.png`);
  }

  // maskable: scale down to ~80% safe zone on a solid pastel background
  const maskableSize = 512;
  const innerSize = Math.round(maskableSize * 0.8);
  const inner = await sharp(SOURCE).resize(innerSize, innerSize, { fit: "cover" }).png().toBuffer();
  await sharp({
    create: {
      width: maskableSize,
      height: maskableSize,
      channels: 4,
      background: MASKABLE_BG,
    },
  })
    .composite([{ input: inner, gravity: "center" }])
    .png()
    .toFile(path.join(OUT_DIR, "icon-512-maskable.png"));
  console.log("icon-512-maskable.png");

  await sharp(SOURCE)
    .resize(180, 180, { fit: "cover" })
    .png()
    .toFile(path.join(OUT_DIR, "apple-touch-icon.png"));
  console.log("apple-touch-icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
