const fs=require('fs');
const {annualPayroll}=require('D:/projects/payroll-backend/src/payroll-generator/annual-payroll.ts');
const {SalaryCalculationService}=require('D:/projects/payroll-backend/src/payroll-generator/salary-calculation.service.ts');
const engine=new SalaryCalculationService();
const components=['BASIC','DA','RA'].map((code,i)=>({_id:code,code,category:'earning',calculationBaseType:'annual_ctc',calculationType:'percentage',calculationValue:[40,10,15][i],showInPayslip:true,status:'active'}));
const rates={wageCap:180000,annualEsiCeilingLimit:252000,isEpfCeilingApplicable:true,epsEmployerContributionPercentage:8.33,epfEmployerContributionPercentage:3.67,esiEmployerContributionPercentage:3.25,epfEmployeeContributionPercentage:12,esiEmployeeContributionPercentage:0.75};
const cases=[{name:'eligible',ctc:180000,components,rates},{name:'above-esi-ceiling',ctc:1200000,components,rates},{name:'decimal-ctc',ctc:1255000.5,components,rates},{name:'allowance-and-formula',ctc:1200000,components:[...components,{_id:'BONUS',code:'BONUS',category:'allowance',calculationBaseType:'annual_ctc',calculationType:'fixed',calculationValue:12000,fixedAmountPeriod:'annual',showInPayslip:true,status:'active'},{_id:'DEDUCTION',code:'DEDUCTION',category:'deduction',calculationBaseType:'annual_ctc',calculationType:'formula',formula:'annualCtc * 1%',calculationValue:null,showInPayslip:true,status:'active'}],rates}];

const {monthlyAmount,sumMoney}=require('D:/projects/payroll-backend/src/run-payroll/run-payroll.service.ts');
const {applyPayrollTax}=require('D:/projects/payroll-backend/src/income-tax/payroll-tax.ts');
const {calculateAnnualTax}=require('D:/projects/payroll-backend/src/income-tax/tax-engine.ts');
const rules=JSON.parse(fs.readFileSync('D:/projects/payroll-frontend/artifacts/phase4f-employee-tax/tax-before.json'))[0].rules;
cases.push({name:'high-income',ctc:2400000,components,rates});
const evidence=cases.flatMap(c=>[false,true].map(configured=>{const calculation=engine.calculateAnnual(c.ctc,c.components,c.rates),a=calculation.annual;
const base={id:'synthetic',employeeId:'synthetic',firstName:'Fixture',lastName:c.name,grossPay:monthlyAmount(a.annualGrossWages),employerContributions:sumMoney([a.employerEpfContribution,a.employerEpsContribution,a.employerEsiContribution].map(monthlyAmount)),deductions:monthlyAmount(a.annualTotalDeductions),netPay:monthlyAmount(a.annualNetPay),components:calculation.components.map(x=>({name:x.code,category:x.category,amount:x.monthly,showInPayslip:x.showInPayslip})),calculation};
const taxRules={...rules,mappings:calculation.components.filter(x=>x.category!=='deduction').map(x=>({componentId:x.componentId,type:'taxable',legalReference:'Synthetic fixture'}))};
const taxResult=configured?calculateAnnualTax(calculation,taxRules):null;const tax=taxResult?{calculationId:'synthetic',inputHash:'synthetic',yearCode:'SYNTHETIC_FY',regime:'new',legislation:'Fixture',configurationVersion:'fixture',profileVersion:1,annualTds:taxResult.annualTds,allocation:taxResult.allocation,monthIndex:0,amount:taxResult.allocation[0]}:undefined;
return {name:c.name+(configured?'-configured-tds':'-no-tax-profile'),employee:{annualCtc:c.ctc,payFrequency:'Monthly'},settings:c.rates,components:c.components,calculation,taxResult,check:applyPayrollTax(base,tax)};}));
const file='D:/projects/payroll-frontend/artifacts/phase4g-dropdown-spec/calculations-'+process.argv[2]+'.json';fs.writeFileSync(file,JSON.stringify(evidence,null,2));console.log(file);
