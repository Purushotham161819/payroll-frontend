export interface PayrollPeriod { year: number; month: number }
export interface PayrollEmployee { firstName: string; lastName: string; annualCtc: number }
export function payrollMonths(now = new Date()) {
  const year = now.getFullYear();
  return Array.from({length: 12}, (_, month) => ({value: `${year}-${String(month + 1).padStart(2,'0')}`, year, month, label: new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric'}).format(new Date(year,month,1))}));
}
export function payrollPeriod(value: string, now = new Date()): PayrollPeriod {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match || +match[1] !== now.getFullYear() || +match[2] < 1 || +match[2] > 12) throw new Error('Select a payroll month in the current calendar year.');
  return {year:+match[1],month:+match[2]-1};
}
export interface PayrollComponent {
  _id?: string; name: string; code: string; category: string; status: string;
  calculationBaseType: string; calculationBaseComponentId: string | null;
  calculationType: string; calculationValue: number | null; fixedAmountPeriod: string | null; showInPayslip: boolean;
}
// Decimal ratios avoid binary floating-point drift in component amounts and totals.
function ratio(value: number): [bigint,bigint] {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Expected a finite, non-negative amount or percentage.');
  const [mantissa,exponent='0'] = value.toString().toLowerCase().split('e');
  const [whole,fraction=''] = mantissa.split('.');
  const scale = fraction.length - Number(exponent);
  const digits = BigInt(whole + fraction);
  return scale >= 0 ? [digits,10n ** BigInt(scale)] : [digits * 10n ** BigInt(-scale),1n];
}
function rounded(n: bigint,d: bigint): number {
  const value = (n + d / 2n) / d;
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Payroll amount exceeds the supported currency range.');
  return Number(value);
}
function paise(value: number) { const [n,d] = ratio(value); return rounded(n*100n,d); }
function add(a: number,b: number) { const value = a+b; if (!Number.isSafeInteger(value)) throw new Error('Payroll total exceeds the supported currency range.'); return value; }
export function monthlyPayroll(employees: PayrollEmployee[], configurations: PayrollComponent[], solved?: {components: {componentId: string; annual: number; monthly: number}[]}[]) {
  if (!employees.length) throw new Error('No employees found. Add employees before generating a payroll report.');
  const components = configurations.filter(c => c.status === 'active');
  for (const code of ['BASIC','DA','RA']) {
    const matches = configurations.filter(c=>c.code === code);
    const c = matches[0];
    if (matches.length !== 1 || !c || c.status !== 'active' || c.category !== 'earning' || c.calculationType !== 'percentage' || typeof c.calculationValue !== 'number' || !Number.isFinite(c.calculationValue) || c.calculationValue < 0 || c.calculationValue > 100)
      throw new Error(`Mandatory component ${code} is missing or unconfigured. Configure an active earning percentage from 0 to 100 in Salary Components.`);
  }
  const byId = new Map<string,PayrollComponent>();
  for (const c of components) {
    if (!c._id || byId.has(c._id) || !c.name?.trim() || !['earning','deduction','allowance'].includes(c.category) || typeof c.showInPayslip !== 'boolean') throw new Error('Invalid salary component identity, category or payslip visibility.');
    byId.set(c._id,c);
  }
  let totalEarningsPaise = 0, totalDeductionsPaise = 0;
  let totalNetPaise: number | null = 0;
  const componentTotals: Record<string,number> = Object.create(null);
  for (const c of components) componentTotals[c._id!] = 0;
  const rows = employees.map((employee, employeeIndex) => {
    if (typeof employee.firstName !== 'string' || typeof employee.lastName !== 'string' || !Number.isFinite(employee.annualCtc) || employee.annualCtc < 0) throw new Error('An employee has invalid name or Annual CTC data. Correct the employee record before generating payroll.');
    try {
      const ctc = paise(employee.annualCtc);
      const supplied = solved?.[employeeIndex];
      if (solved && !supplied) throw new Error('Missing backend payroll calculation.');
      const calculated = new Map<string,{annualPaise:number;monthlyPaise:number}>();
      const visiting = new Set<string>();
      const resolve = (id: string): {annualPaise:number;monthlyPaise:number} => {
        if (supplied) {
          const amount = supplied.components.find(c => c.componentId === id);
          if (!amount) throw new Error('Missing backend component calculation.');
          return {annualPaise:paise(amount.annual),monthlyPaise:paise(amount.monthly)};
        }
        if (visiting.has(id)) throw new Error('Circular salary component dependency.');
        const cached = calculated.get(id); if (cached) return cached;
        const c = byId.get(id); if (!c) throw new Error('Required calculation base is missing or inactive.');
        visiting.add(id);
        let base = ctc;
        if (c.calculationBaseType === 'salary_component') base = resolve(c.calculationBaseComponentId ?? '').annualPaise;
        else if (c.calculationBaseType !== 'annual_ctc') throw new Error(`Invalid calculation base for ${c.name}.`);
        let annualPaise: number, monthlyPaise: number;
        if (typeof c.calculationValue !== 'number') throw new Error(`Configure the percentage or amount for ${c.name}.`);
        const [n,d] = ratio(c.calculationValue);
        if (c.calculationType === 'percentage') {
          if (c.calculationValue > 100) throw new Error(`Percentage must be between 0 and 100 for ${c.name}.`);
          annualPaise = rounded(BigInt(base)*n,d*100n);
          monthlyPaise = rounded(BigInt(annualPaise),12n);
        } else if (c.calculationType === 'fixed' && c.fixedAmountPeriod === 'monthly') {
          monthlyPaise = paise(c.calculationValue);
          annualPaise = rounded(BigInt(monthlyPaise)*12n,1n);
        } else if (c.calculationType === 'fixed' && c.fixedAmountPeriod === 'annual') {
          annualPaise = paise(c.calculationValue); monthlyPaise = rounded(BigInt(annualPaise),12n);
        } else throw new Error(`Invalid calculation type or fixed amount period for ${c.name}.`);
        const amount = {annualPaise,monthlyPaise}; calculated.set(id,amount); visiting.delete(id); return amount;
      };
      const amounts: Record<string,{annualPaise:number;monthlyPaise:number}> = Object.create(null);
      let earningsPaise = 0, deductionsPaise = 0;
      for (const c of components) {
        const amount = resolve(c._id!); amounts[c._id!] = amount;
        if (c.category !== 'deduction') earningsPaise = add(earningsPaise,amount.monthlyPaise);
        else deductionsPaise = add(deductionsPaise,amount.monthlyPaise);
        componentTotals[c._id!] = add(componentTotals[c._id!],amount.monthlyPaise);
      }
      const netPaise = earningsPaise >= deductionsPaise ? earningsPaise-deductionsPaise : null;
      totalEarningsPaise = add(totalEarningsPaise,earningsPaise); totalDeductionsPaise = add(totalDeductionsPaise,deductionsPaise);
      totalNetPaise = totalNetPaise === null || netPaise === null ? null : add(totalNetPaise,netPaise);
      return {firstName:employee.firstName,lastName:employee.lastName,amounts,earningsPaise,deductionsPaise,netPaise};
    } catch (error) { throw new Error(`Cannot calculate payroll for ${employee.firstName} ${employee.lastName}: ${error instanceof Error ? error.message : 'Invalid configuration.'}`); }
  });
  return {rows,components,visibleComponents:components.filter(c=>c.showInPayslip),componentTotals,totalEarningsPaise,totalDeductionsPaise,totalNetPaise,totalEmployees:rows.length};
}
export function payrollCurrency(paise: number) {
  return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(paise / 100);
}
