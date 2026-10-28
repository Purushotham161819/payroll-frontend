import { annualColumns,annualReport,AnnualPayrollResponse } from './annual-payroll-report';
import { monthlyReport,monthlyPayroll } from './monthly-payroll-report';
const data=():AnnualPayrollResponse=>({reportComponents:[{componentId:'component:a',code:'A',name:'Same label',category:'deduction',mandatory:false},{componentId:'component:b',code:'B',name:'Same label',category:'allowance',mandatory:false}],employees:[1,2].map(()=>({employee:{firstName:'A',lastName:'B'},calculation:{annual:{...Object.fromEntries(annualColumns.map(([key],i)=>[key,1200+i*12])),annualNetPay:1000.01} as any,components:[{componentId:'component:a',annual:120,monthly:10},{componentId:'component:b',annual:240,monthly:20}]}}))});
describe('Net pay and ID-based report ordering',()=>{
  for(const [period,build] of [['Annual',annualReport],['Monthly',monthlyReport]] as const) {
    it(`${period}: reorders mandatory and optional columns with aligned values and totals by ID`,()=>{
      const input=data(), before=JSON.stringify(input), original=build(input);
      const order=original.columnIds.slice(1).reverse();
      const report=build(input,undefined,order);
      expect(report.columnIds).toEqual(['employee:name',...order]);
      order.forEach((id,index)=>{
        const originalIndex=original.columnIds.indexOf(id);
        expect(report.headings[index+1]).toBe(original.headings[originalIndex]);
        expect(report.body[0][index+1]).toBe(original.body[0][originalIndex]);
        expect(report.foot[index+1]).toBe(original.foot[originalIndex]);
      });
      expect(JSON.stringify(input)).toBe(before);
    });
    it(`${period}: preserves all required columns when optional selections are empty`,()=>{
      const input=data();input.reportComponents=[];
      const report=build(input,[],['result:annualCoreWages','result:annualRetainingAllowance','result:annualBasicSalary','result:annualDearnessAllowance']);
      expect(report.headings).toEqual(['Employee Name','Core Wages','RA','Basic','DA']);
      expect(report.headings).not.toContain('Net Pay');
    });
    it(`${period}: displays selected net pay and totals only when selected`,()=>{
      const input=data();input.reportComponents=[];
      const report=build(input,['annualNetPay'],['result:annualNetPay']);
      const i=report.columnIds.indexOf('result:annualNetPay');
      expect(i).toBe(1);
      expect(report.body[0][i]).toBe(period==='Annual'?'₹1,000.01':'₹83.33');
      expect(report.foot[i]).toBe(period==='Annual'?'₹2,000.02':'₹166.66');
      expect(()=>build(input,undefined,['result:annualNetPay','result:annualNetPay'])).toThrow('order');
    });
  }
  it('derives monthly net pay directly from the completed annual net and retains negative values',()=>{
    const input=data();expect(monthlyPayroll(input.employees[0]).monthlyNetPay).toBe(83.33);
    input.employees[0].calculation.annual.annualNetPay=-1000.01;
    expect(monthlyPayroll(input.employees[0]).monthlyNetPay).toBe(-83.33);
    expect(annualReport(input).body[0].at(-1)).toBe('-₹1,000.01');
  });
});
