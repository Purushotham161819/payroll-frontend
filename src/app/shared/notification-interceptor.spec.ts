import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { notificationInterceptor } from './notification-interceptor';
import { NotificationService } from './notification.service';
describe('API notification errors', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([notificationInterceptor])),
        provideHttpClientTesting(),
      ],
    }),
  );
  it('shows error rather than success, preserves the error and excludes routine session probes', () => {
    const http = TestBed.inject(HttpClient),
      requests = TestBed.inject(HttpTestingController),
      n = TestBed.inject(NotificationService);
    let failed = false;
    http.post('http://localhost:3000/users', {}).subscribe({ error: () => (failed = true) });
    requests
      .expectOne('http://localhost:3000/users')
      .flush({ message: 'private server details' }, { status: 500, statusText: 'Error' });
    expect(failed).toBe(true);
    expect(n.current()?.kind).toBe('error');
    expect(n.current()?.message).not.toContain('private server details');
    n.dismiss();
    http.get('http://localhost:3000/auth/me').subscribe({ error: () => {} });
    requests
      .expectOne('http://localhost:3000/auth/me')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(n.current()).toBeNull();
    requests.verify();
  });
  it('does not invent success for a 2xx response', () => {
    const http = TestBed.inject(HttpClient),
      requests = TestBed.inject(HttpTestingController),
      n = TestBed.inject(NotificationService);
    http.post('http://localhost:3000/users', {}).subscribe();
    requests.expectOne('http://localhost:3000/users').flush({ invitationSent: false });
    expect(n.current()).toBeNull();
    requests.verify();
  });
  it('keeps genuine errors visible on other payroll operations and malformed preview responses', () => {
    const http = TestBed.inject(HttpClient), requests = TestBed.inject(HttpTestingController), notifications = TestBed.inject(NotificationService);
    for (const [path, preview] of [
      ['/payroll/runs/draft', { period: '2026-11', checks: [], validationIssues: [{ message: 'Review required' }] }],
      ['/payroll/runs/preview', { period: '2026-11', checks: [], validationIssues: [] }],
    ] as const) {
      const url = 'http://localhost:3000' + path;
      let failed = false;
      http.post(url, { period: '2026-11' }).subscribe({error: () => { failed = true; }});
      requests.expectOne(url).flush({code:'PAYROLL_EMPLOYEE_REVIEW_REQUIRED',payrollPreview:preview},{status:409,statusText:'Conflict'});
      expect(failed).toBe(true);
      expect(notifications.current()?.kind).toBe('error');
      notifications.dismiss();
    }
    requests.verify();
  });

});
