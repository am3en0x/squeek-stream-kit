import { ledSafe, textWidth } from './led.js'

// One ticker item in the LED font (font=led): the time in the accent, the line in cream, on a strip of dots as tall
// as the round clock's grid, so the clock and the scrolling items read as one sign. Sizes are in dots.
export const ROWS = 18
export const TOP = 5 // the 7-dot glyphs sit on rows 5 to 11, the middle of the strip
export const LEAD = 6 // dots before the time
export const SPACE = 5 // dots between the time and the line
export const GAP = 18 // dots after the line, before the next item's lead

export function ledItem(when, text) {
  const w = ledSafe(when)
  const t = ledSafe(text)
  const whenX = LEAD
  const textX = whenX + textWidth(w) + SPACE
  const cols = textX + textWidth(t) + GAP
  return { when: w, text: t, whenX, textX, y: TOP, cols, rows: ROWS }
}

// Draws an item from ledItem() on a Led and paints it.
export function drawLedItem(led, item, accent, cream) {
  led.grid(item.cols, item.rows)
  led.text(item.when, item.whenX, item.y, accent)
  led.text(item.text, item.textX, item.y, cream)
  led.paint()
}
