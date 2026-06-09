import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Canonical cn() utility — uses clsx + tailwind-merge so conflicting
 * Tailwind classes are properly deduplicated (e.g. bg-red-500 + bg-blue-500 → bg-blue-500).
 * All components should import from here, not from lib/helpers.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
