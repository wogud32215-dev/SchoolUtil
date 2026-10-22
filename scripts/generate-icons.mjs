import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const buildDir = path.join(root, "build");
const size = 256;

function setPixel(png, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const idx = (size * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

function fillRect(png, x0, y0, w, h, r, g, b) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      setPixel(png, x, y, r, g, b);
    }
  }
}

function drawBlockLetter(png, ox, oy, scale, blocks, r, g, b) {
  for (let row = 0; row < blocks.length; row++) {
    const line = blocks[row];
    for (let col = 0; col < line.length; col++) {
      if (line[col] === "1") {
        fillRect(png, ox + col * scale, oy + row * scale, scale, scale, r, g, b);
      }
    }
  }
}

const S = [
  "011110",
  "100000",
  "100000",
  "011100",
  "000001",
  "000001",
  "011110",
];

const U = [
  "100001",
  "100001",
  "100001",
  "100001",
  "100001",
  "100001",
  "011110",
];

function createIconPng() {
  const png = new PNG({ width: size, height: size });
  const bg = { r: 15, g: 23, b: 42 };
  const panel = { r: 30, g: 64, b: 175 };
  const letters = { r: 248, g: 250, b: 252 };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      setPixel(png, x, y, bg.r, bg.g, bg.b);
    }
  }

  const margin = 28;
  fillRect(png, margin, margin, size - margin * 2, size - margin * 2, panel.r, panel.g, panel.b);

  const scale = 10;
  drawBlockLetter(png, 62, 88, scale, S, letters.r, letters.g, letters.b);
  drawBlockLetter(png, 134, 88, scale, U, letters.r, letters.g, letters.b);

  return png;
}

async function main() {
  fs.mkdirSync(buildDir, { recursive: true });
  const png = createIconPng();
  const pngPath = path.join(buildDir, "icon.png");
  const publicPath = path.join(root, "public", "icon.png");

  await new Promise((resolve, reject) => {
    png
      .pack()
      .pipe(fs.createWriteStream(pngPath))
      .on("finish", resolve)
      .on("error", reject);
  });

  fs.copyFileSync(pngPath, publicPath);

  const icoBuf = await pngToIco(pngPath);
  fs.writeFileSync(path.join(buildDir, "icon.ico"), icoBuf);

  console.log("Wrote build/icon.png, build/icon.ico, public/icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
