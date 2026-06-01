import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ButtonProps {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}

const variantClasses = {
  primary:
    'bg-va-yellow text-va-black hover:bg-va-yellow-600 active:bg-va-yellow-700',
  secondary:
    'bg-va-gold text-va-black hover:bg-va-gold-600 active:bg-va-gold-700',
  outline:
    'border border-va-black text-va-black hover:bg-va-lightgray-300 bg-transparent active:bg-va-lightgray-400',
  ghost:
    'text-va-darkgray hover:text-va-black-800 active:text-va-black bg-transparent',
} as const

const sizeClasses = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-5 py-2 text-sm',
  lg: 'px-7 py-3 text-base',
} as const

export function Button({
  children,
  href,
  onClick,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  className,
  ...rest
}: ButtonProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonProps>) {
  const baseClasses =
    'font-sans font-semibold rounded-sm transition-colors inline-flex items-center justify-center'
  const disabledClasses = disabled ? 'opacity-50 pointer-events-none' : ''

  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    disabledClasses,
    className
  )

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      {...rest}
    >
      {children}
    </button>
  )
}
