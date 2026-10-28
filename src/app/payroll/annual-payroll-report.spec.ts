import { annualReport, annualColumns, AnnualPayrollRow } from './annual-payroll-report';
const row = (value: number): AnnualPayrollRow => ({employee:{firstName:'A',lastName:'B'},calculation:{annual:Object.fromEntries(annualColumns.map(([key],i)=>[key,value+i])) as AnnualPayrollRow['calculation']['annual']}});
describe('Annual PDF data mapping',()=>{
  it('uses all backend cells in order and sums reported paise exactly',()=>{
    const data={employees:[row(1.01),row(2.02)]};
    const before=JSON.stringify(data);
    const report=annualReport(data);
    expect(report.headings).toEqual(['Employee Name','Annual CTC','ER EPS','ER EPF','ER ESI','Gross Wages','Basic','DA','RA','Core Wages','Total Allowances','Excess Allowance','Compliance Wage Base']);
    expect(report.body[0][0]).toBe('A B');
    for(let i=0;i<12;i++) {
      expect(report.body[0][i+1]).toBe(new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(1.01+i));
      expect(report.foot[i+1]).toBe(new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(3.03+2*i));
    }
    expect(report.foot[0]).toBe('Total');expect(JSON.stringify(data)).toBe(before);
  });
  it('rejects missing or invalid backend values rather than displaying zero',()=>{
    for(const value of [undefined,NaN,Infinity,-1]) {
      const invalid=row(1);invalid.calculation.annual.annualComplianceWageBase=value as number;
      expect(()=>annualReport({employees:[invalid]})).toThrow('annualComplianceWageBase');
    }
    expect(()=>annualReport({employees:[]})).toThrow('No employees');
  });
});
