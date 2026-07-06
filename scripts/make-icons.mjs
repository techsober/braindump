// Generates the PWA icons (pure node, no image deps): a violet rounded
// square with a white lightning bolt — "capture, fast".
// Run: npm run icons  (outputs to public/)

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(out, { recursive: true })

const BG = [124, 108, 255] // --accent
const FG = [255, 255, 255]

// lightning bolt polygon in 0..1 coordinates
const BOLT = [
  [0.58, 0.12],
  [0.30, 0.55],
  [0.47, 0.55],
  [0.40, 0.88],
  [0.70, 0.44],
  [0.52, 0.44],
]

function inPolygon(x, y, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** supersampled render: rounded-square (or full-bleed) bg + bolt */
function render(size, { fullBleed = false, boltScale = 1 } = {}) {
  const ss = 4 // supersampling factor for smooth edges
  const px = new Uint8Array(size * size * 4)
  const radius = size * 0.22
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const fx = x + (sx + 0.5) / ss
          const fy = y + (sy + 0.5) / ss
          let bgHit = true
          if (!fullBleed) {
            const cx = Math.max(radius - fx, fx - (size - radius), 0)
            const cy = Math.max(radius - fy, fy - (size - radius), 0)
            bgHit = cx * cx + cy * cy <= radius * radius
          }
          if (!bgHit) continue
          // bolt is drawn in a centered, scaled box
          const bx = (fx / size - 0.5) / boltScale + 0.5
          const by = (fy / size - 0.5) / boltScale + 0.5
          const c = inPolygon(bx, by, BOLT) ? FG : BG
          r += c[0]
          g += c[1]
          b += c[2]
          a += 255
        }
      }
      const n = ss * ss
      const idx = (y * size + x) * 4
      px[idx] = r / n
      px[idx + 1] = g / n
      px[idx + 2] = b / n
      px[idx + 3] = a / n
    }
  }
  return px
}

// ---- minimal PNG encoder ----

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})

function crc32(buf) {
  let c = -1
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync(join(out, 'pwa-192.png'), png(192, render(192)))
writeFileSync(join(out, 'pwa-512.png'), png(512, render(512)))
// maskable: full-bleed bg, bolt shrunk into the 80% safe zone
writeFileSync(
  join(out, 'pwa-512-maskable.png'),
  png(512, render(512, { fullBleed: true, boltScale: 0.8 })),
)
console.log('icons written to public/')
