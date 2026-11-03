import { formatCurrency, registerLocaleData } from '@angular/common';
import localeEnIn from '@angular/common/locales/en-IN';

// Keep these utilities usable in isolation without changing the app's global locale.
registerLocaleData(localeEnIn);

export function isCurrencyNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Reject partial parsing and entries whose decimal precision Number would discard. */
export function parseInrInput(raw: string): number | null {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return decimalSignature(raw) === decimalSignature(String(value)) ? value : null;
}

function decimalSignature(value: string): string {
  const [coefficient, exponent = '0'] = value.toLowerCase().split('e');
  const [whole, fraction = ''] = coefficient.replace(/^[+-]/, '').split('.');
  const digits = (whole + fraction).replace(/^0+/, '');
  if (!digits) return '0';
  const trailing = /0*$/.exec(digits)![0].length;
  return `${coefficient.startsWith('-') ? '-' : ''}${digits.slice(0, digits.length - trailing)}e${Number(exponent) - fraction.length + trailing}`;
}

/** Presentation only. Input mode retains every decimal represented by the model. */
export function formatInr(value: number, preservePrecision = false): string {
  const absolute = Math.abs(value);
  const minimum = absolute === 0 || !Number.isInteger(absolute) ? 2 : 0;
  const [coefficient, exponent = '0'] = absolute.toString().split('e');
  const decimals = Math.max(0, (coefficient.split('.')[1]?.length ?? 0) - Number(exponent));
  // Angular's currency formatter is intended for ordinary currency magnitudes.
  // Retain scientific notation for extreme model values instead of hiding precision.
  const text = preservePrecision && (decimals > 20 || absolute >= 1e21)
    ? '₹' + absolute.toString()
    : formatCurrency(absolute, 'en-IN', '₹', 'INR',
      `1.${minimum}-${preservePrecision ? Math.max(minimum, decimals) : minimum}`);
  return value < 0 ? '−' + text : text;
}
