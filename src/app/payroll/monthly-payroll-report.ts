import {
  appendComponents,
  annualColumns,
  employeeReportName,
  annualReport,
  AnnualPayrollResponse,
  AnnualPayrollRow,
} from './annual-payroll-report';
import { payrollCurrency } from './payroll-calculation';
import { defaultPayFrequency } from '../employees/employee';

export const monthlyColumns = [
  ['monthlyCtc', 'Monthly CTC'],
  ['monthlyEmployerEpsContribution', 'ER EPS'],
  ['monthlyEmployerEpfContribution', 'ER EPF'],
  ['monthlyEmployerEsiContribution', 'ER ESI'],
  ['monthlyGrossWages', 'Gross Wages'],
  ['monthlyBasicSalary', 'Basic'],
  ['monthlyDearnessAllowance', 'DA'],
  ['monthlyRetainingAllowance', 'RA'],
  ['monthlyCoreWages', 'Core Wages'],
  ['monthlyTotalAllowances', 'Total Allowances'],
  ['monthlyExcessAllowance', 'Excess Allowance'],
  ['monthlyComplianceWageBase', 'Compliance Wage Base'],
  ['monthlyNetPay', 'Net Pay'],
] as const;
export type MonthlyAmountKey = (typeof monthlyColumns)[number][0];

// Annual payroll is already complete. Convert its monetary outputs exactly once.
export function monthlyPayroll(row: AnnualPayrollRow): Record<MonthlyAmountKey, number> {
  const frequency = row.employee.payFrequency ?? defaultPayFrequency;
  if (frequency !== 'Monthly') throw new Error('Unsupported employee pay frequency: ' + frequency);
  const monthly = {} as Record<MonthlyAmountKey, number>;
  annualColumns.forEach(([annualKey], index) => {
    const annual = row.calculation.annual[annualKey];
    if (
      typeof annual !== 'number' ||
      !Number.isFinite(annual) ||
      (annual < 0 && annualKey !== 'annualNetPay') ||
      Math.abs(annual) * 100 > Number.MAX_SAFE_INTEGER
    )
      throw new Error('Missing or invalid annual payroll result: ' + annualKey + '.');
    monthly[monthlyColumns[index][0]] = Number((annual / 12).toFixed(2));
  });
  return monthly;
}

export function monthlyReport(data: AnnualPayrollResponse, selectedKeys?: string[], columnOrder?: string[]) {
  // Reuse the annual report's employee and monetary validation.
  annualReport({...data, reportComponents: []});
  const totals = monthlyColumns.map(() => 0n);
  const format = (cents: bigint) => {
    if (cents > BigInt(Number.MAX_SAFE_INTEGER) || cents < -BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error('Payroll report total exceeds the supported currency range.');
    return payrollCurrency(Number(cents));
  };
  const body = data.employees.map((row) => {
    const monthly = monthlyPayroll(row);
    return [
      employeeReportName(row.employee),
      ...monthlyColumns.map(([key], index) => {
        const cents = BigInt(monthly[key].toFixed(2).replace('.', ''));
        totals[index] += cents;
        return format(cents);
      }),
    ];
  });
  return appendComponents(data, {
    headings: ['Employee Name', ...monthlyColumns.map(([, label]) => label)],
    body,
    foot: ['Total', ...totals.map(format)],
    totalEmployees: body.length,
  }, 'monthly', selectedKeys, columnOrder);
}
