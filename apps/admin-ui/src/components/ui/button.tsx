import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
};

export function Button({ className, variant = 'primary', ...props }: Props) {
  return (
    <button
      className={cn(
        'h-11 rounded-lg px-4 text-sm font-semibold transition',
        variant === 'primary'
          ? 'bg-accent text-white hover:bg-accentDeep'
          : 'border border-stone-300 bg-white text-ink hover:bg-stone-50',
        className
      )}
      {...props}
    />
  );
}
