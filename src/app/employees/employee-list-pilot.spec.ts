import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { EmployeeList } from './employee-list';
import { EmployeeService } from './employee.service';

const people = [1000000, 75000, 125500.5].map((annualCtc, i) => ({
  _id: 'id-' + i, employeeId: 'EMP00' + (i + 1), firstName: 'Employee ' + i,
  lastName: 'Pilot', email: 'pilot' + i + '@example.test', annualCtc,
  dateOfBirth: '1990-09-15', hireDate: '2020-01-01', createdAt: '2026-10-30T18:00:00Z',
  status: i === 2 ? 'Terminated' : 'Active', payFrequency: 'Monthly',
}));

describe('Employees design-system pilot', () => {
  function setup() {
    const getPage = vi.fn((_page:number,_size:number,status:string) => { const items=structuredClone(people).filter(e=>status==='All'||e.status===status);return of({items,total:items.length,page:1,pageSize:10}); });
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(),
      { provide: EmployeeService, useValue: { getPage } }] });
    const f = TestBed.createComponent(EmployeeList); f.detectChanges();
    return { f, page: f.componentInstance, getPage };
  }
  it('renders all original columns with Actions last and one primary header action', () => {
    const { f } = setup();
    const headers = [...f.nativeElement.querySelectorAll('th')].map((n: HTMLElement) => n.textContent?.trim());
    expect(headers).toEqual(['Employee ID', 'First Name', 'Last Name', 'Email', 'Date of Birth',
      'Hire Date', 'Annual CTC', 'Pay Frequency', 'Status', 'Created Date', 'Actions']);
    expect(f.nativeElement.querySelectorAll('ps-page-header button[data-variant=primary]').length).toBe(1);
    expect(f.nativeElement.querySelector('ps-page-header button[data-variant=primary]').id).toBe('add-employee');
    expect(f.nativeElement.querySelector('ps-card .body').classList.contains('table-body')).toBe(true);
    expect(f.nativeElement.querySelectorAll('table input[type=checkbox]').length).toBe(0);
  });
  it('uses shared currency/date/status presentation without changing records while loading filtered pages', () => {
    const { f, page, getPage } = setup(); const before = structuredClone(people);
    page.changeFilter('All'); f.detectChanges();
    expect([...f.nativeElement.querySelectorAll('td.number')].map((n: HTMLElement) => n.textContent?.trim()))
      .toEqual(['₹10,00,000', '₹75,000', '₹1,25,500.50']);
    expect(f.nativeElement.textContent).toContain('15 Sep 1990');
    expect([...f.nativeElement.querySelectorAll('ps-status-badge')].map((n: HTMLElement) => n.dataset['tone']))
      .toEqual(['success', 'success', 'danger']);
    expect(people).toEqual(before); expect(getPage).toHaveBeenCalledTimes(2);
  });
  it('keeps the original CDK trigger on the labelled native button and existing add/refresh handlers', () => {
    const { f, page, getPage } = setup();
    const trigger = f.nativeElement.querySelector('button[psIconButton][action=more]') as HTMLButtonElement;
    expect(trigger.type).toBe('button'); expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-label')).toBe('Actions for Employee 0 Pilot');
    expect(trigger.querySelector('button')).toBeNull();
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(document.querySelector('[role=tooltip]')?.textContent).toBe('Actions for Employee 0 Pilot');
    const refresh = f.nativeElement.querySelector('button[cardActions]') as HTMLButtonElement;
    refresh.click(); expect(getPage).toHaveBeenCalledTimes(2);
    vi.spyOn(page, 'add'); (f.nativeElement.querySelector('#add-employee') as HTMLButtonElement).click();
    expect(page.add).toHaveBeenCalledOnce();
  });
});
