import { passwordRules } from '../data/password-rules';

function CheckIcon({ active }: { readonly active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      className={`h-3.5 w-3.5 shrink-0 transition-colors ${active ? 'text-blue-600' : 'text-neutral-300'}`}
    >
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PasswordRequirements({ password }: { readonly password: string }) {
  return (
    <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {passwordRules.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 text-xs transition-colors ${met ? 'text-blue-700' : 'text-neutral-400'}`}
          >
            <CheckIcon active={met} />
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
