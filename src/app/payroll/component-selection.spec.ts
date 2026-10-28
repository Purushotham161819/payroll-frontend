import { annualColumns, annualReport, AnnualPayrollResponse } from './annual-payroll-report';
import { monthlyReport } from './monthly-payroll-report';
const data = (): AnnualPayrollResponse => ({
  reportComponents: [{componentId:'travel',code:'TRAVEL',name:'Travel & Meals / special',category:'allowance',mandatory:false},{componentId:'bonus',code:'BONUS',name:'Bonus',category:'earning',mandatory:false}],
  employees: [1,2].map(()=>({employee:{firstName:'A',lastName:'B',payFrequency:'Monthly'},calculation:{annual:Object.fromEntries(annualColumns.map(([key])=>[key,1200])) as any,components:[{componentId:'bonus',annual:240,monthly:20},{componentId:'travel',annual:120,monthly:10}]}})),
});
describe('Dynamic component report columns',()=>{
  it('maps stable IDs in configuration order, preserves required columns and totals',()=>{
    const input=data(), before=JSON.stringify(input), report=annualReport(input);
    expect(report.headings.slice(9,11)).toEqual(['Travel & Meals / special','Bonus']);
    expect(report.body[0].slice(9,11)).toEqual(['₹120.00','₹240.00']);
    expect(report.foot.slice(9,11)).toEqual(['₹240.00','₹480.00']);
    expect(report.headings.slice(0,9)).toEqual(annualReport({...input,reportComponents:[]}).headings.slice(0,9));
    expect(JSON.stringify(input)).toBe(before);
  });
  it('omits deselected components including an empty optional selection',()=>{
    const input=data(); input.reportComponents=input.reportComponents!.slice(1);
    expect(annualReport(input).headings).not.toContain('Travel & Meals / special');
    expect(annualReport(input).headings).toContain('Bonus');
    input.reportComponents=[];
    expect(annualReport(input).headings.length).toBe(14);
  });
  it('uses authoritative monthly component values and sums them',()=>{
    const report=monthlyReport(data());
    expect(report.body[0].slice(9,11)).toEqual(['₹10.00','₹20.00']);
    expect(report.foot.slice(9,11)).toEqual(['₹20.00','₹40.00']);
  });
  it('rejects missing and duplicate calculated values rather than substituting zero',()=>{
    const input=data(); input.employees[0].calculation.components=[];
    expect(()=>annualReport(input)).toThrow('travel');
    const duplicate=data(); duplicate.employees[0].calculation.components!.push(duplicate.employees[0].calculation.components![1]);
    expect(()=>annualReport(duplicate)).toThrow('travel');
  });
});
