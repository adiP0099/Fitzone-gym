export function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
