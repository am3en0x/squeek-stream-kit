// An overlay shown inside another page: an iframe at the overlay's real source size, scaled to fit its slot's width,
// so what you see is what OBS shows.
export function mount(slot, src, w, h, { title = 'Overlay preview', lazy = true } = {}) {
  const frame = document.createElement('iframe')
  frame.src = src
  frame.width = w
  frame.height = h
  frame.title = title
  if (lazy) frame.loading = 'lazy'
  frame.setAttribute('allowtransparency', 'true')
  slot.append(frame)
  const fit = () => {
    const k = slot.clientWidth / w
    frame.style.transform = `scale(${k})`
    slot.style.height = h * k + 'px'
  }
  new ResizeObserver(fit).observe(slot)
  fit()
  return frame
}
