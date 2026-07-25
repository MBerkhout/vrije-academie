/** Locks page scroll and reserves the scrollbar width to avoid layout shift. */
export function lockBodyScroll(): () => void {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
  const { overflow, paddingRight } = document.body.style

  document.body.style.overflow = 'hidden'
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`
  }

  return () => {
    document.body.style.overflow = overflow
    document.body.style.paddingRight = paddingRight
  }
}
