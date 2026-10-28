import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PayrollReportService } from './payroll-report.service';
import { annualColumns, resultColumnOptions, requiredResultKeys, selectedResultKeys, annualReport, AnnualPayrollResponse } from './annual-payroll-report';
import { monthlyReport } from './monthly-payroll-report';
const input=():AnnualPayrollResponse=>({reportComponents:[{componentId:'hra-id',code:'HRA',name:'HRA',mandatory:false,category:'allowance'}],employees:[1,2].map(()=>({employee:{firstName:'A',lastName:'B'},calculation:{annual:Object.fromEntries(annualColumns.map(([key],i)=>[key,1200+i*12])) as any,components:[{componentId:'hra-id',annual:120,monthly:10}]}}))});
describe('Complete report column selection',()=>{
  it('derives every optional aggregate from the actual report mapping',()=>{
    expect(resultColumnOptions.map(c=>c.code)).toEqual(annualColumns.filter(([key])=>!requiredResultKeys.has(key) || key==='annualCoreWages').map(([key])=>key));
    for(const name of ['ER EPS','ER EPF','ER ESI','Gross Wages','Core Wages','Excess Allowance','Compliance Wage Base','Annual CTC','Total Allowances']) expect(resultColumnOptions.some(c=>c.name===name)).toBe(true);
    expect(selectedResultKeys(['hra-id','result:annualGrossWages'])).toEqual(['annualGrossWages']);
    expect(()=>selectedResultKeys(['result:invalid'])).toThrow('Invalid');
  });
  for(const [period,build] of [['Annual',annualReport],['Monthly',monthlyReport]] as const) {
    it(`${period}: deselect all keeps only identification, required components and selected HRA`,()=>{
      const data=input(), before=JSON.stringify(data), report=build(data,[]);
      expect(report.headings).toEqual(['Employee Name','Basic','DA','RA','HRA','Core Wages']);
      expect(report.body[0].length).toBe(6); expect(report.foot.length).toBe(6);
      expect(JSON.stringify(data)).toBe(before);
      data.reportComponents=[];
      expect(build(data,[]).headings).toEqual(['Employee Name','Basic','DA','RA','Core Wages']);
    });
    it(`${period}: each optional aggregate is independently selectable with aligned totals`,()=>{
      const data=input(); data.reportComponents=[];
      const full=build(data);
      for(const {code} of resultColumnOptions.filter(c=>!c.mandatory)) {
        const report=build(data,[code]);
        const index=annualColumns.findIndex(([key])=>key===code)+1;
        expect(report.headings.length).toBe(6);
        const selectedIndex=report.headings.indexOf(full.headings[index]);
        expect(selectedIndex).toBeGreaterThan(0);
        expect(report.body[0][selectedIndex]).toBe(full.body[0][index]);
        expect(report.foot[selectedIndex]).toBe(full.foot[index]);
      }
      expect(build(data,annualColumns.map(([key])=>key))).toEqual(full);
    });
  }
  it('loads configured HRA and all calculated report fields into the same selector',async()=>{
    TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});
    const service=TestBed.inject(PayrollReportService), http=TestBed.inject(HttpTestingController);
    const pending=service.components();
    http.expectOne(request=>request.url.endsWith('/salary-components')).flush([
      ...['BASIC','DA','RA'].map(code=>({_id:code,code,name:code,status:'active',isSystemDefined:true,category:'earning'})),
      {_id:'hra-id',code:'HRA',name:'HRA',status:'active',isSystemDefined:false,category:'allowance'},
    ]);
    const options=await pending;
    expect(options.filter(c=>c.mandatory).map(c=>c.code)).toEqual(['BASIC','DA','RA','annualCoreWages']);
    expect(options.some(c=>c.name==='HRA'&&!c.mandatory)).toBe(true);
    for(const option of resultColumnOptions) expect(options).toContainEqual(option);
    http.verify();
  });
});
