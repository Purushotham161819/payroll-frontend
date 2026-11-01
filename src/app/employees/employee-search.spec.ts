import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { EmployeeList } from './employee-list';
import { EmployeeService } from './employee.service';

const people = [
  {_id:'a',employeeId:'EMP001',firstName:'Ada',lastName:'Lovelace',status:'Active',annualCtc:1400000.50},
  {_id:'b',employeeId:'EMP002',firstName:'Grace',lastName:'Hopper',status:'Terminated',annualCtc:1000000},
  {_id:'c',employeeId:'EMP003',firstName:'Alan',lastName:'Turing',annualCtc:100000},
] as any;
function setup() {
  const getAll = vi.fn(() => of(people));
  TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),{provide:EmployeeService,useValue:{getAll}}]});
  const fixture = TestBed.createComponent(EmployeeList); fixture.detectChanges();
  return {fixture,page:fixture.componentInstance,getAll};
}
describe('Employee directory search', () => {
  it.each(['emp001','ADA','love','Ada Lovelace','  aDA   LoVELace  '])('matches %s locally without changing records or making extra requests', query => {
    const {fixture,page,getAll} = setup(); const before = structuredClone(page.allEmployees());
    const input = fixture.nativeElement.querySelector('#employee-search') as HTMLInputElement;
    input.value=query;input.dispatchEvent(new Event('input'));fixture.detectChanges();
    expect(page.employees().map(e=>e._id)).toEqual(['a']);
    expect(page.allEmployees()).toEqual(before);expect(getAll).toHaveBeenCalledTimes(1);
  });
  it('combines search with status, shows an empty state and restores the current filter on clear', () => {
    const {fixture,page,getAll}=setup();
    page.searchTerm.set('Grace');fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No employees match your search');
    page.changeFilter('All');fixture.detectChanges();expect(page.employees().map(e=>e._id)).toEqual(['b']);
    page.changeFilter('Terminated');page.searchTerm.set('missing');fixture.detectChanges();expect(page.employees()).toEqual([]);
    (fixture.nativeElement.querySelector('[aria-label="Clear employee search"]') as HTMLButtonElement).click();fixture.detectChanges();
    expect(page.employees().map(e=>e._id)).toEqual(['b']);expect(document.activeElement?.id).toBe('employee-search');
    page.searchTerm.set('   ');expect(page.employees().map(e=>e._id)).toEqual(['b']);
    expect(getAll).toHaveBeenCalledTimes(1);
  });
  it('preserves payroll eligibility and directory navigation independently of search', () => {
    const {fixture,page}=setup();page.searchTerm.set('Ada');fixture.detectChanges();
    const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    page.runPayroll();expect(navigate).toHaveBeenLastCalledWith(['/payroll/run'],{queryParams:{employees:'a,c',returnStatus:'Active'}});
    const link=fixture.nativeElement.querySelector('td.name a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/employees/a?returnStatus=Active');
    link.click();expect(navigate).toHaveBeenLastCalledWith(['/employees','a'],expect.objectContaining({queryParams:{returnStatus:'Active'}}));
  });
});
