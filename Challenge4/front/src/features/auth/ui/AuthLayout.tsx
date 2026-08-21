import type { ReactNode } from 'react';
import content from '../../../content/es.json';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
  readonly footer: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-12">
      <div className="pointer-events-none absolute -left-24 -top-24 h-112 w-md rounded-full bg-blue-600/40 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-blue-500/25 blur-[120px]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-blue-800 shadow-lg shadow-blue-900/50">
            <span className="text-2xl font-bold text-white">{content.brand.monogram}</span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">{content.brand.name}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">{title}</h1>
            <p className="mt-2 text-[15px] text-neutral-400">{subtitle}</p>
          </div>
        </div>

        <div className="rounded-4xl border border-white/10 bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.5),0_50px_120px_-20px_rgba(29,78,216,0.55),0_20px_50px_-15px_rgba(0,0,0,0.7)] sm:p-10">
          {children}

          <p className="mt-6 text-center text-sm text-neutral-500">{footer}</p>
        </div>
      </div>
    </div>
  );
}
