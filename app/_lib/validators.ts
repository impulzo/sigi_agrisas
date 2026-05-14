const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-()]{7,15}$/;
const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

export function isPhone(value: string): boolean {
  return PHONE_RE.test(value);
}

export function isUrl(value: string): boolean {
  return URL_RE.test(value);
}
