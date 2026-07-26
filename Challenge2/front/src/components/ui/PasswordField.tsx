import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';
import content from '../../content/es.json';

const { passwordField: text } = content.auth;

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
      <path
        d="M3 3l18 18M10.6 10.6a2.5 2.5 0 0 0 3.5 3.5M9.4 5.5C10.2 5.2 11.1 5 12 5c6.5 0 10 7 10 7-.6 1.1-1.6 2.5-3 3.7M6.2 6.9C4 8.4 2 12 2 12s3.5 7 10 7c1.2 0 2.3-.2 3.3-.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { label, error, className = '', id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <label htmlFor={inputId} className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
      {label}
      <span className="relative flex items-center">
        <input
          id={inputId}
          ref={ref}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          className={`w-full rounded-2xl border bg-neutral-50 px-4 py-3 pr-11 text-[15px] text-neutral-900 placeholder:text-neutral-400 transition focus:bg-white focus:outline-none focus:ring-4 ${
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'border-neutral-200 focus:border-violet-400 focus:ring-violet-100'
          } ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? text.hide : text.show}
          className="absolute right-3 text-neutral-400 hover:text-neutral-600"
          tabIndex={-1}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </span>
      {error && <span className="text-xs font-normal text-red-600">{error}</span>}
    </label>
  );
});
