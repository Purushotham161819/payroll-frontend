import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../auth/auth';
@Component({
  selector: 'app-settings-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: ` <h1>Settings</h1>
    <nav aria-label="Settings sections">
      @if (auth.user()?.role === 'admin') {
        <a
          routerLink="/settings/organization"
          routerLinkActive="selected"
          ariaCurrentWhenActive="page"
          >Organization Settings</a
        >
      }
      <a
        routerLink="/settings"
        [routerLinkActiveOptions]="{ exact: true }"
        routerLinkActive="selected"
        ariaCurrentWhenActive="page"
        >Salary Components</a
      >
      <a
        routerLink="/settings/statutory-deductions"
        routerLinkActive="selected"
        ariaCurrentWhenActive="page"
        >Statutory Deductions</a
      >
      @if (auth.user()?.role === 'admin') {
        <a
          routerLink="/settings/tax-configuration"
          routerLinkActive="selected"
          ariaCurrentWhenActive="page"
          >Tax Configuration</a
        >
      }
      @if (auth.user()?.role === 'admin') {
        <a routerLink="/settings/contractors" routerLinkActive="selected" ariaCurrentWhenActive="page">Contractor Settings</a>
      }
    </nav>`,
  styles: [
    `
      :host {
        display: block;
        color: #233d2e;
      }
      h1 {
        font-size: 30px;
        line-height: 1.2;
        margin: 0 0 24px;
      }
      nav {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        border-bottom: 1px solid #d8e4dc;
        margin: 0 0 24px;
        padding: 0;
      }
      a {
        padding: 12px 16px;
        border-bottom: 3px solid transparent;
        color: #28644a;
        text-decoration: none;
        font-size: 13px;
        font-weight: 600;
        line-height: 20px;
      }
      a.selected {
        border-color: #28644a;
        background: #edf5ef;
      }
      a:hover {
        background: #f3f7f3;
      }
      a:focus-visible {
        outline: 2px solid #28644a;
        outline-offset: -2px;
      }
      @media (max-width: 600px) {
        a {
          padding: 10px 8px;
        }
      }
    `,
  ],
})
export class SettingsTabs {
  readonly auth = inject(Auth);
}
