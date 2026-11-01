import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';
import { payrollCurrency } from './payroll/payroll-calculation';

const cases = [
  [1000, '1,000.00'], [10000, '10,000.00'], [100000, '1,00,000.00'],
  [500000, '5,00,000.00'], [1000000, '10,00,000.00'], [1500000, '15,00,000.00'],
  [10000000, '1,00,00,000.00'], [100000000, '10,00,00,000.00'], [1400000.50, '14,00,000.50'],
] as const;

describe('Application Indian number formatting', () => {
  beforeEach(() => TestBed.configureTestingModule({providers: [...appConfig.providers, CurrencyPipe, DecimalPipe]}));
  it.each(cases)('formats %s through the actual application locale and existing report formatter', (amount, expected) => {
    expect(TestBed.inject(LOCALE_ID)).toBe('en-IN');
    expect(TestBed.inject(CurrencyPipe).transform(amount, 'INR')).toBe('\u20b9' + expected);
    expect(TestBed.inject(DecimalPipe).transform(amount, '1.2-2')).toBe(expected);
    expect(payrollCurrency(Math.round(amount * 100))).toBe('\u20b9' + expected);
    expect(typeof amount).toBe('number');
  });
  it('formats only at the display boundary without changing stored precision, negatives or zero', () => {
    const source = {amount: 1400000.505}; const before = structuredClone(source);
    const pipe = TestBed.inject(CurrencyPipe);
    expect(pipe.transform(source.amount, 'INR')).toBe('\u20b914,00,000.51');
    expect(pipe.transform(0, 'INR')).toBe('\u20b90.00');
    expect(pipe.transform(-100000, 'INR')).toBe('-\u20b91,00,000.00');
    expect(source).toEqual(before);
    expect(pipe.transform(null, 'INR')).toBeNull();
  });
});
