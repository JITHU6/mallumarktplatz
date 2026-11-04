/** Normalises a website value: adds https:// when no scheme was given. */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

const PHONE_PATTERN = /^\+?[0-9 ()/.-]{6,30}$/;

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return PHONE_PATTERN.test(value.trim()) && digits.length >= 6 && digits.length <= 18;
}

/** Converts a (German) phone number into international digits for wa.me / tel: links. */
export function toInternationalDigits(phone: string, defaultCountryCode = "49"): string {
  const trimmed = phone.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) digits = defaultCountryCode + digits.slice(1);
  return digits;
}

export function telHref(phone: string): string {
  return `tel:+${toInternationalDigits(phone)}`;
}

export function whatsappHref(phone: string): string {
  return `https://wa.me/${toInternationalDigits(phone)}`;
}

export function directionsHref(parts: (string | null | undefined)[]): string {
  const destination = parts.filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/** Hostname without "www." for compact display. */
export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
