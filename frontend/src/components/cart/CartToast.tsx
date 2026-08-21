'use client'

import { useEffect, useState } from 'react'

interface CartToastProps {
  message: string
}

export function CartToast({ message }: CartToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setVisible(true)
  }, [message])

  if (!visible) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-va-black text-va-white font-sans text-sm px-5 py-3 shadow-lg"
    >
      {message}
    </div>
  )
}
