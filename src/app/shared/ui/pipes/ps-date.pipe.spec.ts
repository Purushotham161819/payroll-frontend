import { DATE_PIPE_DEFAULT_OPTIONS, formatDate } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { PsDatePipe } from './ps-date.pipe';

describe('PsDatePipe', () => {
  function pipe(timezone?: string) {
    TestBed.configureTestingModule({ providers: [{ provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { timezone } }] });
    return TestBed.runInInjectionContext(() => new PsDatePipe());
  }

  it.each([
    ['2026-09-15', '15 Sep 2026'], ['2024-02-29', '29 Feb 2024'],
    ['2026-12-31', '31 Dec 2026'], ['2027-01-01', '01 Jan 2027'],
    ['0001-01-01', '01 Jan 0001'], ['0099-12-31', '31 Dec 0099'], ['9999-12-31', '31 Dec 9999'],
    ['2026-09', 'Sep 2026'], ['2026-01', 'Jan 2026'],
  ])('preserves calendar input %s without timezone shifting', (value, expected) => {
    expect(pipe('-0600').transform(value, '+1400')).toBe(expected);
  });

  it.each([null, undefined, '', 'invalid', '2026-02-29', '2026-02-30', '2026-13-01',
    '2026-00', '2026-09-00', '0000-01-01', '2026-09-15T25:00:00Z',
    '2026-02-30T12:00:00Z', '2026-09-15T12:65:00Z', '2026-09-15T12:00:00+25:00',
    '2026-09-15T12:00:00+05:99', '1900-02-29', '1750',
    NaN, Infinity, 8640000000000001, new Date(NaN), {}, true])(
    'handles missing/invalid date %s safely', value => {
      expect(pipe().transform(value as string)).toBe('—');
    },
  );

  it('preserves UTC and explicit timestamp offsets across a date boundary', () => {
    const formatter = pipe();
    expect(formatter.transform('2026-09-15T00:30:00Z', 'UTC')).toBe('15 Sep 2026');
    expect(formatter.transform('2026-09-15T00:30:00Z', '-0600')).toBe('14 Sep 2026');
    expect(formatter.transform('2026-09-15T00:30:00+05:30', 'UTC')).toBe('14 Sep 2026');
  });

  it('uses the existing configured default timezone unless explicitly overridden', () => {
    const formatter = pipe('-0600');
    expect(formatter.transform('2026-09-15T00:30:00Z')).toBe('14 Sep 2026');
    expect(formatter.transform('2026-09-15T00:30:00Z', 'UTC')).toBe('15 Sep 2026');
  });

  it('matches Angular ambient local handling for timestamps without adding a conversion', () => {
    const value = '2026-09-15T00:30:00';
    expect(pipe().transform(value)).toBe(formatDate(value, 'dd MMM yyyy', 'en-US'));
  });

  it('supports Date objects and epoch milliseconds without mutating them', () => {
    const formatter = pipe();
    const value = new Date('2026-09-15T00:30:00Z');
    const original = value.getTime();
    expect(formatter.transform(value, 'UTC')).toBe('15 Sep 2026');
    expect(formatter.transform(original, 'UTC')).toBe('15 Sep 2026');
    expect(formatter.transform(0, 'UTC')).toBe('01 Jan 1970');
    expect(value.getTime()).toBe(original);
  });
});
