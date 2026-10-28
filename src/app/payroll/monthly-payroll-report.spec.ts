import { annualColumns, AnnualPayrollRow, annualReport } from './annual-payroll-report';
import { monthlyColumns, monthlyPayroll, monthlyReport } from './monthly-payroll-report';
const row = (): AnnualPayrollRow => ({
  employee: { firstName: 'A', lastName: 'B' },
  calculation: {
    annual: Object.fromEntries(
      annualColumns.map(([key], i) => [key, 100.01 + i * 11]),
    ) as AnnualPayrollRow['calculation']['annual'],
  },
});
describe('Monthly payroll from completed annual results', () => {
  it('converts every annual output once, using distinct monthly names and preserving annual data', () => {
    const employee = row();
    const before = JSON.stringify(employee);
    const monthly = monthlyPayroll(employee);
    annualColumns.forEach(([key], index) =>
      expect(monthly[monthlyColumns[index][0]]).toBe(
        Number((employee.calculation.annual[key] / 12).toFixed(2)),
      ),
    );
    expect(JSON.stringify(employee)).toBe(before);
    expect(Object.keys(monthly).every((key) => key.startsWith('monthly'))).toBe(true);
  });
  it('defaults legacy frequency to Monthly and sums displayed rounded paise', () => {
    const data = { employees: [row(), row(), row()] };
    const before = annualReport(data);
    const report = monthlyReport(data);
    expect(report.headings[1]).toBe('Monthly CTC');
    expect(report.body[0][1]).toBe('\u20b98.33');
    expect(report.foot[1]).toBe('\u20b924.99');
    monthlyColumns.forEach(([key], index) => {
      const value = monthlyPayroll(data.employees[0])[key];
      expect(report.foot[index + 1]).toBe(
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
          Number((value * 3).toFixed(2)),
        ),
      );
    });
    expect(annualReport(data)).toEqual(before);
    data.employees[0].employee.payFrequency = 'Monthly';
    expect(monthlyReport(data)).toEqual(report);
  });
  it('rejects unsupported frequencies and malformed annual results', () => {
    const employee = row();
    employee.employee.payFrequency = 'Semi-Monthly';
    expect(() => monthlyReport({ employees: [employee] })).toThrow('Unsupported');
    for (const value of [NaN, Infinity, -1, undefined]) {
      const invalid = row();
      invalid.calculation.annual.annualGrossWages = value as number;
      expect(() => monthlyReport({ employees: [invalid] })).toThrow('annualGrossWages');
    }
  });
});
