import { payrollCurrency } from './payroll-calculation';

export const annualColumns = [
  ['annualCtc','Annual CTC'], ['employerEpsContribution','ER EPS'], ['employerEpfContribution','ER EPF'], ['employerEsiContribution','ER ESI'],
  ['annualGrossWages','Gross Wages'], ['annualBasicSalary','Basic'], ['annualDearnessAllowance','DA'], ['annualRetainingAllowance','RA'],
  ['annualCoreWages','Core Wages'], ['annualTotalAllowances','Total Allowances'], ['annualExcessAllowance','Excess Allowance'],
  ['annualComplianceWageBase','Compliance Wage Base'], ['annualNetPay','Net Pay'],
] as const;
// Use the report's own field mapping as the selector source.
export const requiredResultKeys = new Set<string>(['annualBasicSalary','annualDearnessAllowance','annualRetainingAllowance','annualCoreWages']);
export const resultColumnOptions = annualColumns.filter(([key])=>!requiredResultKeys.has(key) || key==='annualCoreWages').map(([key,name])=>({componentId:'result:'+key,code:key,name,category:'result',mandatory:requiredResultKeys.has(key),hideCheckbox:key==='annualCoreWages'}));
export function selectedResultKeys(ids: string[]) {
  const keys=ids.filter(id=>id.startsWith('result:')).map(id=>id.slice(7));
  if(keys.some(key=>!annualColumns.some(([field])=>field===key))) throw new Error('Invalid payroll result column selection.');
  return keys;
}
export type AnnualAmountKey = typeof annualColumns[number][0];
export interface AnnualPayrollRow {
  employee: { firstName: string; lastName: string; payFrequency?: string };
  calculation: { annual: Record<AnnualAmountKey, number>; components?: { componentId: string; annual: number; monthly: number }[] };
}
export interface ReportComponent { componentId: string; code: string; name: string; category: string; mandatory: boolean; hideCheckbox?: boolean }
export interface AnnualPayrollResponse { reportComponents?: ReportComponent[]; employees: AnnualPayrollRow[]; companyName?: string }

// Sum the backend's reported paise, without recomputing any payroll equations.
export function annualReport(data: AnnualPayrollResponse, selectedKeys?: string[], columnOrder?: string[]) {
  if (!data.employees?.length) throw new Error('No employees found. Add employees before generating a payroll report.');
  const totals = annualColumns.map(() => 0n);
  const format = (cents: bigint) => {
    if (cents > BigInt(Number.MAX_SAFE_INTEGER) || cents < -BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Payroll report total exceeds the supported currency range.');
    return payrollCurrency(Number(cents));
  };
  const body = data.employees.map(({employee,calculation}) => {
    if (typeof employee?.firstName !== 'string' || typeof employee?.lastName !== 'string') throw new Error('Invalid employee name in payroll results.');
    return [`${employee.firstName} ${employee.lastName}`.trim(), ...annualColumns.map(([key],i) => {
      const value = calculation?.annual?.[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || (value < 0 && key !== 'annualNetPay') || Math.abs(value) * 100 > Number.MAX_SAFE_INTEGER) throw new Error(`Missing or invalid annual payroll result: ${key}.`);
      const cents = BigInt(value.toFixed(2).replace('.', ''));
      totals[i] += cents;
      return format(cents);
    })];
  });
  return appendComponents(data, {headings:['Employee Name',...annualColumns.map(([,label])=>label)],body,foot:['Total',...totals.map(format)],totalEmployees:body.length}, 'annual', selectedKeys, columnOrder);
}

// IDs bind configuration to calculated cells; labels are presentation only.
export function appendComponents(data: AnnualPayrollResponse, report: { headings: string[]; body: string[][]; foot: string[]; totalEmployees: number }, period: 'annual' | 'monthly', selectedKeys?: string[], columnOrder?: string[]) {
  const optional = (data.reportComponents ?? []).filter(c => !c.mandatory);
  const seen = new Set<string>();
  const labels: string[] = [], totals: string[] = [];
  optional.forEach(c => {
    if (!c.componentId || seen.has(c.componentId)) throw new Error('Invalid report component identity.');
    seen.add(c.componentId);
    let total = 0n;
    data.employees.forEach((row, i) => {
      const matches = row.calculation.components?.filter(v => v.componentId === c.componentId) ?? [];
      const value = matches[0]?.[period];
      if (matches.length !== 1 || typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value * 100 > Number.MAX_SAFE_INTEGER) throw new Error('Missing or invalid component result: ' + c.componentId);
      const cents = BigInt(value.toFixed(2).replace('.', ''));
      total += cents;
      report.body[i].splice(9 + labels.length, 0, payrollCurrency(Number(cents)));
    });
    if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Payroll report total exceeds the supported currency range.');
    labels.push(c.name); totals.push(payrollCurrency(Number(total)));
  });
  report.headings.splice(9, 0, ...labels);
  report.foot.splice(9, 0, ...totals);
  const ids: string[] = ['employee:name',...annualColumns.map(([key])=>'result:'+key)];
  ids.splice(9,0,...optional.map(c=>c.componentId));
  if (selectedKeys !== undefined) {
    if (selectedKeys.some(key=>!annualColumns.some(([field])=>field===key))) throw new Error('Invalid payroll result column selection.');
    const keys: (string | null)[] = [null,...annualColumns.map(([key])=>key)];
    keys.splice(9,0,...labels.map(()=>null));
    const keep=keys.map((key,index)=>({key,index})).filter(({key})=>key===null || requiredResultKeys.has(key) || selectedKeys.includes(key)).map(({index})=>index);
    return orderColumns({...report,headings:keep.map(i=>report.headings[i]),body:report.body.map(row=>keep.map(i=>row[i])),foot:keep.map(i=>report.foot[i])},keep.map(i=>ids[i]),columnOrder);
  }
  return orderColumns(report,ids,columnOrder);
}

export const mandatoryResultByCode: Record<string,string> = {BASIC:'annualBasicSalary',DA:'annualDearnessAllowance',RA:'annualRetainingAllowance'};
// Reorder one ID-indexed permutation across headers, amounts and totals.
function orderColumns(report: {headings:string[];body:string[][];foot:string[];totalEmployees:number}, ids:string[], order?:string[]) {
  if (order && (new Set(order).size !== order.length || order.some(id=>typeof id!=='string'))) throw new Error('Invalid report column order.');
  const rank=new Map((order??[]).map((id,index)=>[id,index]));
  const indices=ids.map((id,index)=>({id,index})).sort((a,b)=>a.index===0?-1:b.index===0?1:(rank.get(a.id)??Number.MAX_SAFE_INTEGER)-(rank.get(b.id)??Number.MAX_SAFE_INTEGER)).map(c=>c.index);
  return {...report,columnIds:indices.map(i=>ids[i]),headings:indices.map(i=>report.headings[i]),body:report.body.map(row=>indices.map(i=>row[i])),foot:indices.map(i=>report.foot[i])};
}
