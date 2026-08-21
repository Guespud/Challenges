import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'outline';

const base =
  'inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40';

const variants: Record<Variant, string> = {
  primary: 'bg-blue-700 text-white hover:bg-blue-800',
  ghost: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
  outline: 'border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
