import { TestBed } from '@angular/core/testing';
import { PayrollGenerator } from './payroll-generator';
import { PayrollReportService } from './payroll-report.service';
describe('Component selection UI',()=>{
  it('loads configured components each time, supports select/deselect all and submits display IDs',async()=>{
    let components=[{componentId:'basic',name:'Basic',mandatory:true},{componentId:'new',name:'New & Special',mandatory:false}];
    const calls:any[]=[];
    TestBed.configureTestingModule({providers:[{provide:PayrollReportService,useValue:{components:async()=>components,download:async(...args:any[])=>{calls.push(args);return 'report.pdf';}}}]});
    const instance=TestBed.runInInjectionContext(()=>new PayrollGenerator());
    await instance.loadComponents();
    expect(instance.selection()).toEqual(['new']);
    instance.deselectAll(); expect(instance.selection()).toEqual([]);
    instance.selectAll(); expect(instance.selection()).toEqual(['new']);
    instance.toggle('new',false); expect(instance.selection()).toEqual([]);
    components=[...components,{componentId:'later',name:'Added later',mandatory:false}];
    await instance.loadComponents(); expect(instance.selection()).toEqual(['new','later']);
    const before=instance.selection(); instance.move(1,0); expect(instance.components()[0].componentId).toBe('new'); expect(instance.selection()).toEqual(before);
    instance.selected=instance.months[0].value;
    instance.deselectAll(); await instance.generate();
    expect(calls[0][2]).toEqual([]); expect(calls[0][3]).toEqual(instance.components().map(c=>c.componentId));
  });
});
