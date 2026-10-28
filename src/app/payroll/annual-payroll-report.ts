import { payrollCurrency } from './payroll-calculation';

export const annualColumns = [
  ['annualCtc','Annual CTC'], ['employerEpsContribution','ER EPS'], ['employerEpfContribution','ER EPF'], ['employerEsiContribution','ER ESI'],
  ['annualGrossWages','Gross Wages'], ['annualBasicSalary','Basic'], ['annualDearnessAllowance','DA'], ['annualRetainingAllowance','RA'],
  ['annualCoreWages','Core Wages'], ['annualTotalAllowances','Total Allowances'], ['annualExcessAllowance','Excess Allowance'],
  ['annualComplianceWageBase','Compliance Wage Base'],
] as const;
export type AnnualAmountKey = typeof annualColumns[number][0];
export interface AnnualPayrollRow {
  employee: { firstName: string; lastName: string; payFrequency?: string };
  calculation: { annual: Record<AnnualAmountKey, number> };
}
export interface AnnualPayrollResponse { employees: AnnualPayrollRow[]; companyName?: string }

// Sum the backend's reported paise, without recomputing any payroll equations.
export function annualReport(data: AnnualPayrollResponse) {
  if (!data.employees?.length) throw new Error('No employees found. Add employees before generating a payroll report.');
  const totals = annualColumns.map(() => 0n);
  const format = (cents: bigint) => {
    if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Payroll report total exceeds the supported currency range.');
    return payrollCurrency(Number(cents));
  };
  const body = data.employees.map(({employee,calculation}) => {
    if (typeof employee?.firstName !== 'string' || typeof employee?.lastName !== 'string') throw new Error('Invalid employee name in payroll results.');
    return [`${employee.firstName} ${employee.lastName}`.trim(), ...annualColumns.map(([key],i) => {
      const value = calculation?.annual?.[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value * 100 > Number.MAX_SAFE_INTEGER) throw new Error(`Missing or invalid annual payroll result: ${key}.`);
      const cents = BigInt(value.toFixed(2).replace('.', ''));
      totals[i] += cents;
      return format(cents);
    })];
  });
  return {headings:['Employee Name',...annualColumns.map(([,label])=>label)],body,foot:['Total',...totals.map(format)],totalEmployees:body.length};
}
