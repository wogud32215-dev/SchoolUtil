import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const buildDir = path.join(root, "build");
const size = 256;

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function setPixel(png, x, y, r, g, b, a = 255) {
  const dim = png.width;
  if (x < 0 || y < 0 || x >= dim || y >= dim) return;
  const idx = (dim * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

function inRoundRect(px, py, x, y, w, h, radius) {
  const rx = Math.min(radius, w / 2);
  const ry = Math.min(radius, h / 2);
  if (px < x || py < y || px >= x + w || py >= y + h) return false;
  const left = x + rx;
  const right = x + w - rx;
  const top = y + ry;
  const bottom = y + h - ry;
  if (px >= left && px < right) return true;
  if (py >= top && py < bottom) return true;
  const cx = px < left ? left : right;
  const cy = py < top ? top : bottom;
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= rx * ry;
}

function fillRoundRect(png, x, y, w, h, radius, r, g, b) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (inRoundRect(px, py, x, y, w, h, radius)) {
        setPixel(png, px, py, r, g, b);
      }
    }
  }
}

function strokeRoundRect(png, x, y, w, h, radius, r, g, b) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const inside = inRoundRect(px, py, x, y, w, h, radius);
      const outside = !inRoundRect(px, py, x + 1, y + 1, w - 2, h - 2, radius - 1);
      if (inside && outside) setPixel(png, px, py, r, g, b);
    }
  }
}

function fillCircle(png, cx, cy, radius, r, g, b) {
  const r2 = radius * radius;
  for (let py = cy - radius; py <= cy + radius; py++) {
    for (let px = cx - radius; px <= cx + radius; px++) {
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy <= r2) setPixel(png, px, py, r, g, b);
    }
  }
}

function drawSkyGradient(png) {
  const top = { r: 30, g: 41, b: 59 };
  const bottom = { r: 14, g: 116, b: 144 };
  const dim = png.width;
  for (let y = 0; y < dim; y++) {
    const t = y / (dim - 1);
    const r = lerp(top.r, bottom.r, t);
    const g = lerp(top.g, bottom.g, t);
    const b = lerp(top.b, bottom.b, t);
    for (let x = 0; x < dim; x++) {
      setPixel(png, x, y, r, g, b);
    }
  }
}

/** 3×2 시간표 격자, highlightCol·highlightRow 칸 강조 */
function drawMiniGrid(png, gx, gy, cell, cols, rows, line, fill, highlightCol, highlightRow) {
  const gw = cols * cell;
  const gh = rows * cell;
  fillRoundRect(png, gx, gy, gw, gh, 6, fill.r, fill.g, fill.b);
  for (let c = 0; c <= cols; c++) {
    const x = gx + c * cell;
    for (let y = gy; y <= gy + gh; y++) {
      setPixel(png, x, y, line.r, line.g, line.b);
    }
  }
  for (let r = 0; r <= rows; r++) {
    const y = gy + r * cell;
    for (let x = gx; x <= gx + gw; x++) {
      setPixel(png, x, y, line.r, line.g, line.b);
    }
  }
  const accent = { r: 56, g: 189, b: 248 };
  const hx = gx + highlightCol * cell + 1;
  const hy = gy + highlightRow * cell + 1;
  fillRoundRect(png, hx, hy, cell - 2, cell - 2, 4, accent.r, accent.g, accent.b);
}

/** 타임테이블 칩 마스코트 — 앱·설치 아이콘 */
function createIconPng() {
  const png = new PNG({ width: size, height: size });
  drawSkyGradient(png);

  const body = { r: 248, g: 250, b: 252 };
  const border = { r: 148, g: 163, b: 184 };
  const ink = { r: 30, g: 41, b: 59 };

  const bx = 48;
  const by = 44;
  const bw = 160;
  const bh = 168;
  fillRoundRect(png, bx, by, bw, bh, 28, body.r, body.g, body.b);
  strokeRoundRect(png, bx, by, bw, bh, 28, border.r, border.g, border.b);

  fillCircle(png, 108, 92, 6, ink.r, ink.g, ink.b);
  fillCircle(png, 148, 92, 6, ink.r, ink.g, ink.b);

  for (let x = 112; x <= 144; x++) {
    const t = (x - 112) / 32;
    const y = 108 + Math.round(4 * Math.sin(t * Math.PI));
    setPixel(png, x, y, ink.r, ink.g, ink.b);
    setPixel(png, x, y + 1, ink.r, ink.g, ink.b);
  }

  const grid = { r: 226, g: 232, b: 240 };
  const gridLine = { r: 203, g: 213, b: 225 };
  drawMiniGrid(png, 72, 118, 22, 3, 2, gridLine, grid, 1, 0);

  return png;
}

/** 트레이 16px용 — 둥근 칩 + 한 칸 강조만 */
function createTrayIconPng() {
  const png = new PNG({ width: size, height: size });
  drawSkyGradient(png);

  const body = { r: 248, g: 250, b: 252 };
  const border = { r: 148, g: 163, b: 184 };
  const bx = 56;
  const by = 56;
  const bw = 144;
  const bh = 144;
  fillRoundRect(png, bx, by, bw, bh, 32, body.r, body.g, body.b);
  strokeRoundRect(png, bx, by, bw, bh, 32, border.r, border.g, border.b);

  const grid = { r: 226, g: 232, b: 240 };
  const gridLine = { r: 203, g: 213, b: 225 };
  drawMiniGrid(png, 78, 78, 28, 2, 2, gridLine, grid, 0, 0);

  return png;
}

async function writePng(png, filePath) {
  await new Promise((resolve, reject) => {
    png
      .pack()
      .pipe(fs.createWriteStream(filePath))
      .on("finish", resolve)
      .on("error", reject);
  });
}

function resizePngNearest(src, targetSize) {
  const dst = new PNG({ width: targetSize, height: targetSize });
  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      const sx = Math.min(
        src.width - 1,
        Math.floor((x / targetSize) * src.width),
      );
      const sy = Math.min(
        src.height - 1,
        Math.floor((y / targetSize) * src.height),
      );
      const si = (src.width * sy + sx) << 2;
      const di = (targetSize * y + x) << 2;
      dst.data[di] = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = src.data[si + 3];
    }
  }
  return dst;
}

function sampleCornerBackground(png) {
  const w = png.width;
  const h = png.height;
  const pts = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [x, y] of pts) {
    const i = (w * y + x) << 2;
    r += png.data[i];
    g += png.data[i + 1];
    b += png.data[i + 2];
  }
  return { r: r / 4, g: g / 4, b: b / 4 };
}

function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** 크림·흰 배경을 투명 처리 (별·주황 음영은 유지) */
function removeLightBackground(png) {
  const bg = sampleCornerBackground(png);
  const distThreshold = 48;
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];
    if (png.data[i + 3] === 0) continue;

    const nearCorner = colorDistance(r, g, b, bg.r, bg.g, bg.b) < distThreshold;
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    const pale = min > 232 && max - min < 28;

    if (nearCorner || pale) {
      png.data[i + 3] = 0;
    }
  }
  return png;
}

function iconsFromSourcePng(sourcePath) {
  const src = PNG.sync.read(fs.readFileSync(sourcePath));
  removeLightBackground(src);
  const iconPng = resizePngNearest(src, size);
  return { iconPng, trayPng: iconPng };
}

async function main() {
  fs.mkdirSync(buildDir, { recursive: true });
  const publicDir = path.join(root, "public");
  fs.mkdirSync(publicDir, { recursive: true });

  const sourcePath = path.join(buildDir, "icon-source.png");
  const fromSource = fs.existsSync(sourcePath);
  const { iconPng, trayPng } = fromSource
    ? iconsFromSourcePng(sourcePath)
    : { iconPng: createIconPng(), trayPng: createTrayIconPng() };

  const pngPath = path.join(buildDir, "icon.png");
  const publicIconPath = path.join(publicDir, "icon.png");
  const publicTrayPath = path.join(publicDir, "tray-icon.png");

  await writePng(iconPng, pngPath);
  fs.copyFileSync(pngPath, publicIconPath);
  if (trayPng === iconPng) {
    fs.copyFileSync(pngPath, publicTrayPath);
  } else {
    await writePng(trayPng, publicTrayPath);
  }

  const icoBuf = await pngToIco(pngPath);
  fs.writeFileSync(path.join(buildDir, "icon.ico"), icoBuf);

  const mode = fromSource ? "build/icon-source.png" : "built-in mascot";
  console.log(
    `Wrote build/icon.png, build/icon.ico, public/icon.png, public/tray-icon.png (${mode})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
