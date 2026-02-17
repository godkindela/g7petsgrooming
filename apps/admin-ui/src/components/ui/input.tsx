import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-ink outline-none ring-accent/40 focus:ring-2',
        className
      )}
      {...props}
    />
  );
}
