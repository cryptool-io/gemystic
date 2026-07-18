import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Class combiner, the shadcn/Trust-Agent `cn` convention: clsx for conditional
 * class logic, tailwind-merge so later utilities beat earlier conflicting ones
 * (`cn('p-2', dense && 'p-1')` resolves to p-1, not both).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
