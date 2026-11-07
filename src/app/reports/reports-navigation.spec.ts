import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { WorkspaceLayout } from '../app';
import { Auth } from '../auth/auth';
import { Organization } from '../organization';
describe('Reports navigation order', () => {
  for (const role of ['admin', 'user', 'super_admin'] as const)
    it('keeps Reports last for ' + role + ' without changing permissions', () => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          { provide: Auth, useValue: { user: signal({ role }) } },
          {
            provide: Organization,
            useValue: {
              displayName: signal('Example'),
              load: vi.fn().mockResolvedValue(undefined),
            },
          },
        ],
      });
      const fixture = TestBed.createComponent(WorkspaceLayout);
      fixture.detectChanges();
      const labels = [...fixture.nativeElement.querySelectorAll('nav a')].map((el: any) =>
        el.textContent.trim(),
      );
      expect(labels).toEqual(
        role === 'admin'
          ? ['Dashboard', 'Employees', 'Settings', 'User Management', 'Reports']
          : role === 'user'
            ? ['Dashboard', 'Employees', 'Settings', 'Reports']
            : ['Dashboard', 'Customers & accounts'],
      );
    });
});
