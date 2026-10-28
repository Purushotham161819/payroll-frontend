import { monthlyPayroll as actualPayroll, payrollCurrency, payrollMonths, payrollPeriod, PayrollComponent } from './payroll-calculation';
const employee = {firstName:'A',lastName:'One',annualCtc:1200000};
const component = (id:string,changes:Partial<PayrollComponent>={}):PayrollComponent => ({_id:id,name:id,code:id,category:'earning',status:'active',calculationBaseType:'annual_ctc',calculationBaseComponentId:null,calculationType:'percentage',calculationValue:40,fixedAmountPeriod:null,showInPayslip:true,...changes});
const required = ['BASIC','DA','RA'].map(code=>component(code,{calculationValue:0,showInPayslip:false}));
const monthlyPayroll: typeof actualPayroll = (employees,configs) => actualPayroll(employees,[...configs,...required.filter(c=>!configs.some(r=>r.code===c.code))]);
describe('Configured monthly salary components',()=>{
  it('resolves annual dependencies in reverse input order',()=>{
    const result=monthlyPayroll([employee],[component('HRA',{calculationBaseType:'salary_component',calculationBaseComponentId:'BASIC'}),component('BASIC')]);
    expect(result.rows[0].amounts['BASIC']).toEqual({annualPaise:48000000,monthlyPaise:4000000});
    expect(result.rows[0].amounts['HRA']).toEqual({annualPaise:19200000,monthlyPaise:1600000});
    expect(result.totalEarningsPaise).toBe(5600000); expect(result.totalNetPaise).toBe(5600000);
  });
  it('distinguishes fixed annual and monthly amounts and earning/deduction categories',()=>{
    const result=monthlyPayroll([employee],[component('Monthly',{calculationType:'fixed',fixedAmountPeriod:'monthly',calculationValue:2000}),component('Annual',{calculationType:'fixed',fixedAmountPeriod:'annual',calculationValue:1200,category:'deduction'})]);
    expect(result.rows[0].amounts['Monthly']).toEqual({annualPaise:2400000,monthlyPaise:200000});
    expect(result.rows[0].amounts['Annual']).toEqual({annualPaise:120000,monthlyPaise:10000});
    expect(result.totalDeductionsPaise).toBe(10000);expect(result.totalNetPaise).toBe(190000);
  });
  it('includes hidden components in calculations and dependency resolution without displaying them',()=>{
    const result=monthlyPayroll([employee],[component('Hidden',{showInPayslip:false}),component('Visible',{calculationBaseType:'salary_component',calculationBaseComponentId:'Hidden'})]);
    expect(result.visibleComponents.map(c=>c.name)).toEqual(['Visible']); expect(result.totalEarningsPaise).toBe(5600000);
  });
  it('sums rounded monthly paise, preserves fixed monthly values and does not mutate inputs',()=>{
    const employees=[{...employee,annualCtc:1000},{...employee,annualCtc:1000}];
    const components=[component('Annual',{calculationValue:100}),component('Monthly',{calculationType:'fixed',fixedAmountPeriod:'monthly',calculationValue:2000.01})];
    const before=JSON.stringify([employees,components]); const result=monthlyPayroll(employees,components);
    expect(result.componentTotals['Annual']).toBe(16666);expect(result.rows[0].amounts['Monthly'].monthlyPaise).toBe(200001);
    expect(result.totalEarningsPaise).toBe(416668);expect(JSON.stringify([employees,components])).toBe(before);
    expect(payrollCurrency(4000000)).toBe('₹40,000.00');
    expect(monthlyPayroll([{...employee,annualCtc:1.005}],[component('All',{calculationValue:100})]).rows[0].amounts['All'].annualPaise).toBe(101);
  });
  it('rejects cycles, missing/inactive bases and incomplete configurations instead of using zero',()=>{
    expect(()=>monthlyPayroll([employee],[component('A',{calculationBaseType:'salary_component',calculationBaseComponentId:'B'}),component('B',{calculationBaseType:'salary_component',calculationBaseComponentId:'A'})])).toThrow('Circular');
    for(const base of [[],[component('B',{status:'inactive'})]]) expect(()=>monthlyPayroll([employee],[component('A',{calculationBaseType:'salary_component',calculationBaseComponentId:'B'}),...base])).toThrow('missing or inactive');
    for(const c of [component('Bad',{calculationValue:101}),component('Bad',{calculationValue:NaN}),component('Bad',{category:'invalid'}),component('Bad',{calculationType:'fixed',fixedAmountPeriod:null})]) expect(()=>monthlyPayroll([employee],[c])).toThrow();
  });
  it('does not fabricate net pay when deductions exceed earnings or use inactive components',()=>{
    const result=monthlyPayroll([employee],[component('D',{category:'deduction'}),component('Ignored',{status:'inactive'})]);
    expect(result.totalNetPaise).toBeNull();expect(result.components).toHaveLength(4);
  });
  it('requires employees, active configuration and valid CTC',()=>{
    expect(()=>monthlyPayroll([],[component('A')])).toThrow('No employees');expect(()=>actualPayroll([employee],[])).toThrow('Mandatory component BASIC');
    for(const annualCtc of [NaN,Infinity,-1,Number.MAX_VALUE]) expect(()=>monthlyPayroll([{...employee,annualCtc}],[component('A')])).toThrow();
  });
  it('keeps the year-aware payroll month workflow',()=>{
    expect(payrollMonths(new Date(2026,11,31))).toHaveLength(12);expect(payrollMonths(new Date(2027,0,1))[0].label).toBe('January 2027');
    expect(payrollPeriod('2027-10',new Date(2027,0,1))).toEqual({year:2027,month:9});expect(()=>payrollPeriod('2026-10',new Date(2027,0,1))).toThrow();
  });
});


describe('Mandatory wage component validation',()=>{
  it('requires three configured percentages and honors saved component bases',()=>{
    for(const code of ['BASIC','DA','RA']){
      expect(()=>actualPayroll([employee],required.filter(c=>c.code!==code))).toThrow(`Mandatory component ${code}`);
      for(const invalid of [{calculationValue:null},{calculationValue:101},{calculationType:'fixed',fixedAmountPeriod:'annual'},{status:'inactive'}])expect(()=>actualPayroll([employee],required.map(c=>c.code===code?{...c,...invalid}:c))).toThrow(`Mandatory component ${code}`);
    }
    const result=actualPayroll([employee],[component('RA',{calculationBaseType:'salary_component',calculationBaseComponentId:'DA',calculationValue:50}),component('DA',{calculationBaseType:'salary_component',calculationBaseComponentId:'BASIC',calculationValue:10}),component('BASIC')]);
    expect(result.rows[0].amounts['RA']).toEqual({annualPaise:2400000,monthlyPaise:200000});
    expect(result.totalEarningsPaise).toBe(4600000);
  });
});

describe('Backend annual calculation reporting adapter',()=>{
  it('uses solved monthly values and includes allowances without changing report totals',()=>{
    const configs = [...required,component('ALLOWANCE',{category:'allowance',calculationBaseType:'gross_wages'})];
    const solved = [{components:configs.map(c=>({componentId:c._id!,annual:c.code==='ALLOWANCE'?12000:0,monthly:c.code==='ALLOWANCE'?1000:0}))}];
    const result = actualPayroll([employee],configs,solved);
    expect(result.rows[0].amounts['ALLOWANCE']).toEqual({annualPaise:1200000,monthlyPaise:100000});
    expect(result.totalEarningsPaise).toBe(100000);
    expect(result.totalNetPaise).toBe(100000);
    expect(()=>actualPayroll([employee],configs,[])).toThrow('Missing backend payroll');
  });
});
