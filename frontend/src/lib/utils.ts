import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges class names with Tailwind CSS conflict resolution.
 * Use for conditional classes and className overrides in components.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
