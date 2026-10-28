import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { EmployeeList } from './employees/employee-list';
import { Settings } from './settings/settings';
describe('Payroll workspace routes', () => {
  it('preserves employees and navigates to settings with persisted components', async () => {
    await TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{path: '', component: EmployeeList}, {path: 'settings', component: Settings}])] }).compileComponents();
    const harness = await RouterTestingHarness.create('/');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:3000/employees').flush([]);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('No employees found.');
    await harness.navigateByUrl('/settings');
    http.expectOne('http://localhost:3000/salary-components').flush([]);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('No salary components configured.');
    http.verify();
  });
});
