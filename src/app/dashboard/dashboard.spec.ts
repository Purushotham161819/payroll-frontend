import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Auth } from '../auth/auth';
import { Dashboard, dashboardGreeting } from './dashboard';

describe('Dashboard workforce overview', () => {
  afterEach(() => vi.useRealTimers());
  for (const [hour, minute, expected] of [[4,59,'Good evening'],[5,0,'Good morning'],[11,59,'Good morning'],[12,0,'Good afternoon'],[16,59,'Good afternoon'],[17,0,'Good evening'],[0,0,'Good evening']] as const) {
    it(`greets at local ${hour}:${minute}`, () => expect(dashboardGreeting(new Date(2026,10,4,hour,minute))).toBe(expected));
  }
  async function setup() {
    await TestBed.configureTestingModule({ imports:[Dashboard], providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])] }).compileComponents();
    const fixture=TestBed.createComponent(Dashboard), http=TestBed.inject(HttpTestingController);
    fixture.detectChanges(); return {fixture,http};
  }
  it('loads backend workforce and payroll KPIs without downloading employee records', async () => {
    const {fixture,http}=await setup();
    expect(fixture.componentInstance.employeeLoading()).toBe(true);
    http.expectOne('http://localhost:3000/reports/dashboard').flush({activeEmployees:2,activeEmployeeIds:['a','legacy'],annualRunRate:360000,monthlyRunRate:30000});
    http.expectOne('http://localhost:3000/contractors').flush([{status:'Active'},{status:'Inactive'},{status:'Active'}]);
    fixture.detectChanges();
    expect(fixture.componentInstance.employeeCount()).toBe(2);
    expect(fixture.componentInstance.annualRunRate()).toBe(360000);
    expect(fixture.componentInstance.monthlyRunRate()).toBe(30000);
    http.expectNone('http://localhost:3000/employees');
    TestBed.inject(Auth).user.set({id:'u',email:'u@example.test',firstName:'Ada'});
    expect(fixture.componentInstance.greeting).toMatch(/, Ada!$/);
    TestBed.inject(Auth).user.set({id:'u',email:'u@example.test',firstName:'  '});
    expect(fixture.componentInstance.greeting).not.toContain(',');
    expect(fixture.componentInstance.contractorCount()).toBe(2);
    expect(fixture.componentInstance.employeeIds()).toBe('a,legacy');
    http.verify();fixture.destroy();
  });
  it('keeps an independent zero visible on error and retries only the failed source', async () => {
    const {fixture,http}=await setup();
    http.expectOne('http://localhost:3000/reports/dashboard').flush({activeEmployees:0,activeEmployeeIds:[],annualRunRate:0,monthlyRunRate:0});
    http.expectOne('http://localhost:3000/contractors').flush({}, {status:503,statusText:'Unavailable'});
    expect(fixture.componentInstance.employeeCount()).toBe(0);
    expect(fixture.componentInstance.contractorCount()).toBe(null);
    expect(fixture.componentInstance.contractorError()).toContain('server');
    fixture.componentInstance.loadContractors();
    http.expectNone('http://localhost:3000/reports/dashboard');
    http.expectOne('http://localhost:3000/contractors').flush([]);
    expect(fixture.componentInstance.contractorCount()).toBe(0);
    expect(fixture.componentInstance.contractorError()).toBe('');
    http.verify();fixture.destroy();
  });
  it('updates the greeting while open and clears the timer on destroy', async () => {
    const {fixture,http}=await setup();
    http.expectOne('http://localhost:3000/reports/dashboard').flush({activeEmployees:0,activeEmployeeIds:[],annualRunRate:0,monthlyRunRate:0});http.expectOne('http://localhost:3000/contractors').flush([]);
    fixture.destroy();http.verify();
    vi.useFakeTimers();vi.setSystemTime(new Date(2026,10,4,11,59,45));
    const clockFixture=TestBed.createComponent(Dashboard);clockFixture.detectChanges();
    http.expectOne('http://localhost:3000/reports/dashboard').flush({activeEmployees:0,activeEmployeeIds:[],annualRunRate:0,monthlyRunRate:0});http.expectOne('http://localhost:3000/contractors').flush([]);
    expect(clockFixture.componentInstance.greeting).toBe('Good morning');
    vi.advanceTimersByTime(30_000);
    expect(clockFixture.componentInstance.greeting).toBe('Good afternoon');
    clockFixture.destroy();expect(vi.getTimerCount()).toBe(0);http.verify();
  });
});
