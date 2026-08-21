import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <div
      className={`rounded-3xl border border-neutral-100 bg-white p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}
