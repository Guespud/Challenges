import content from '../../../content/es.json';

const { rules } = content.validation.password;

export interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

export const passwordRules: PasswordRule[] = [
  { id: 'length', label: rules.length, test: (v) => v.length >= 8 },
  { id: 'uppercase', label: rules.uppercase, test: (v) => /[A-Z]/.test(v) },
  { id: 'lowercase', label: rules.lowercase, test: (v) => /[a-z]/.test(v) },
  { id: 'number', label: rules.number, test: (v) => /\d/.test(v) },
  { id: 'special', label: rules.special, test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function isStrongPassword(value: string): boolean {
  return passwordRules.every((rule) => rule.test(value));
}
