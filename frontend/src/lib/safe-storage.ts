/**
 * Safe access to Web Storage. Merely reading `window.localStorage` / `sessionStorage` can throw
 * (SecurityError when blocked, undefined in some in-app webviews), so every access stays in try/catch.
 */
type Kind = 'localStorage' | 'sessionStorage'

function getStorage(kind: Kind): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    return window[kind] ?? null
  } catch {
    return null
  }
}

function make(kind: Kind) {
  return {
    getItem(key: string): string | null {
      try {
        return getStorage(kind)?.getItem(key) ?? null
      } catch {
        return null
      }
    },
    setItem(key: string, value: string): void {
      try {
        getStorage(kind)?.setItem(key, value)
      } catch {
        // Quota / blocked storage — best effort.
      }
    },
    removeItem(key: string): void {
      try {
        getStorage(kind)?.removeItem(key)
      } catch {
        // Blocked storage — best effort.
      }
    },
  }
}

export const safeLocalStorage = make('localStorage')
export const safeSessionStorage = make('sessionStorage')
