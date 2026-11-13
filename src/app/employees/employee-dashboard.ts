import { Component, inject, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../auth/auth';
import { PsButton, PsCard, PsCardTitle, PsPageHeader } from '../shared/ui';

export function employeeGreeting(firstName: string | undefined, hour: number) {
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return greeting + (firstName?.trim() ? ', ' + firstName.trim() : '') + '!';
}

@Component({
  selector: 'app-employee-dashboard',
  imports: [RouterLink, PsButton, PsCard, PsCardTitle, PsPageHeader],
  template: `<ps-page-header
      eyebrow="EMPLOYEE PORTAL"
      [title]="greeting()"
      subtitle="Welcome to your PayStream employee portal."
    />
    <ps-card
      ><span cardTitle>Your information</span>
      <p>View your employee details and Pay Checks in My Profile.</p>
      <a psButton routerLink="/employee/my-profile">My Profile</a>
    </ps-card>`,
})
export class EmployeeDashboard implements OnDestroy {
  private readonly auth = inject(Auth);
  readonly greeting = signal(employeeGreeting(this.auth.user()?.firstName, new Date().getHours()));
  private readonly timer = setInterval(
    () => this.greeting.set(employeeGreeting(this.auth.user()?.firstName, new Date().getHours())),
    60_000,
  );
  ngOnDestroy() {
    clearInterval(this.timer);
  }
}
