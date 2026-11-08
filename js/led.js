// A dot-matrix sign on a canvas: 5x7 glyphs (scalable), a progress bar and a turning wheel, drawn as round dots on a
// grid. Pages compose in dot units; paint() fits the grid to the canvas's box and keeps the dots round.
export const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['111', '010', '010', '010', '010', '010', '111'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '10001', '11001', '10101', '10011', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '10001', '01010', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '.': ['0', '0', '0', '0', '0', '0', '1'],
  ',': ['00', '00', '00', '00', '00', '01', '10'],
  ':': ['0', '0', '1', '0', '1', '0', '0'],
  '-': ['000', '000', '000', '111', '000', '000', '000'],
  '+': ['000', '010', '010', '111', '010', '010', '000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '!': ['1', '1', '1', '1', '1', '0', '1'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  ' ': ['00', '00', '00', '00', '00', '00', '00'],
}

const glyph = (ch) => FONT[ch] || FONT[' ']

export function textWidth(s, k = 1) {
  let w = 0
  for (const ch of String(s)) w += (glyph(ch)[0].length + 1) * k
  return Math.max(0, w - k)
}

export class Led {
  constructor(canvas, { off = '#16161b', fit = 'width' } = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.off = off
    this.fit = fit
    this.cols = 0
    this.rows = 0
    this.cells = []
  }

  grid(cols, rows) {
    this.cols = cols
    this.rows = rows
    this.cells = new Array(cols * rows).fill(null)
  }

  dot(x, y, color) {
    if (x >= 0 && y >= 0 && x < this.cols && y < this.rows) this.cells[y * this.cols + x] = color
  }

  // Draws text and returns the x just after it (including the trailing one-dot gap).
  text(s, x, y, color, k = 1) {
    for (const ch of String(s)) {
      const g = glyph(ch)
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < g[r].length; c++) {
          if (g[r][c] !== '1') continue
          for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) this.dot(x + c * k + i, y + r * k + j, color)
        }
      }
      x += (g[0].length + 1) * k
    }
    return x
  }

  bar(x, y, w, h, frac, on, off) {
    const lit = Math.round(Math.max(0, Math.min(1, frac || 0)) * w)
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) this.dot(x + i, y + j, i < lit ? on : off)
  }

  wheel(cx, cy, r, turnDeg, rim, spoke, hub) {
    const steps = Math.max(24, Math.round(r * 7))
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * Math.PI * 2
      this.dot(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), rim)
    }
    for (let s = 0; s < 3; s++) {
      const t = ((s * 120 + turnDeg) * Math.PI) / 180
      for (let d = 2; d < r - 1; d++) this.dot(Math.round(cx + d * Math.cos(t)), Math.round(cy + d * Math.sin(t)), spoke)
    }
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) this.dot(cx + i, cy + j, hub)
  }

  paint() {
    const { canvas, ctx, cols, rows } = this
    if (!cols || !rows) return
    // the parent's content box: its client size without padding
    const parent = canvas.parentElement
    const cs = getComputedStyle(parent)
    const bw = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    const bh = parent.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    let pitch = bw / cols
    if (this.fit === 'contain' && bh > 0) pitch = Math.min(pitch, bh / rows)
    if (!(pitch > 0)) return
    const cw = Math.floor(cols * pitch)
    const ch = Math.floor(rows * pitch)
    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr)
      canvas.height = Math.round(ch * dpr)
      canvas.style.width = cw + 'px'
      canvas.style.height = ch + 'px'
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cw, ch)
    const rad = pitch * 0.36
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = this.cells[y * cols + x] || this.off
        if (!c) continue
        ctx.fillStyle = c
        ctx.beginPath()
        ctx.arc((x + 0.5) * pitch, (y + 0.5) * pitch, rad, 0, 6.2832)
        ctx.fill()
      }
    }
  }
}
