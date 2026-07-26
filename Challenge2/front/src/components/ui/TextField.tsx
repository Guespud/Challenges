import { forwardRef, type InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, className = '', id, ...props },
  ref,
) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <label htmlFor={inputId} className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
      {label}
      <input
        id={inputId}
        ref={ref}
        aria-invalid={Boolean(error)}
        className={`rounded-2xl border bg-neutral-50 px-4 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 transition focus:bg-white focus:outline-none focus:ring-4 ${
          error
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-neutral-200 focus:border-violet-400 focus:ring-violet-100'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs font-normal text-red-600">{error}</span>}
    </label>
  );
});
