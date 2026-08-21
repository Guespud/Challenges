import content from '../../../content/es.json';
import { LOWERCASE_REGEX, NUMBER_REGEX, SPECIAL_CHAR_REGEX, UPPERCASE_REGEX } from './validation-regex';

const { rules } = content.validation.password;

export interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

export const passwordRules: PasswordRule[] = [
  { id: 'length', label: rules.length, test: (v) => v.length >= 8 },
  { id: 'uppercase', label: rules.uppercase, test: (v) => UPPERCASE_REGEX.test(v) },
  { id: 'lowercase', label: rules.lowercase, test: (v) => LOWERCASE_REGEX.test(v) },
  { id: 'number', label: rules.number, test: (v) => NUMBER_REGEX.test(v) },
  { id: 'special', label: rules.special, test: (v) => SPECIAL_CHAR_REGEX.test(v) },
];

export function isStrongPassword(value: string): boolean {
  return passwordRules.every((rule) => rule.test(value));
}
