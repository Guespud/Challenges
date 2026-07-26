import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost';

const base =
  'inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40';

const variants: Record<Variant, string> = {
  primary: 'bg-neutral-900 text-white hover:bg-black',
  ghost: 'bg-violet-50 text-violet-700 hover:bg-violet-100',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
