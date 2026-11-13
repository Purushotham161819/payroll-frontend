import { Component, input, model } from '@angular/core';
export type ProfileTab = 'details' | 'history' | 'tax' | 'checks' | 'permissions';
@Component({
  selector: 'app-profile-tabs',
  template: `<nav class="ribbon" role="tablist" aria-label="Employee profile">
    @for (tab of tabs; track tab.id) {
      <button
        type="button"
        role="tab"
        [id]="prefix() + '-' + tab.id + '-tab'"
        [attr.aria-controls]="prefix() + '-' + tab.id + '-panel'"
        [attr.aria-selected]="active() === tab.id"
        [tabIndex]="active() === tab.id ? 0 : -1"
        (click)="active.set(tab.id)"
        (keydown)="navigate($event, $index)"
      >
        {{ tab.label }}
      </button>
    }
  </nav>`,
  styleUrl: './profile-tabs.css',
})
export class ProfileTabs {
  readonly active = model<ProfileTab>('details');
  readonly prefix = input('profile');
  readonly showTax = input(true);
  readonly showHistory = input(true);
  readonly showPermissions = input(false);
  get tabs(): { id: ProfileTab; label: string }[] {
    return [
      { id: 'details', label: 'Employee Details' },
      { id: 'history', label: 'Employment History' },
      { id: 'tax', label: 'Income Tax / TDS' },
      { id: 'checks', label: 'Pay Checks' },
      { id: 'permissions', label: 'Permissions' },
    ].filter(
      (tab) => (tab.id !== 'tax' || this.showTax()) && (tab.id !== 'history' || this.showHistory()) && (tab.id !== 'permissions' || this.showPermissions()),
    ) as { id: ProfileTab; label: string }[];
  }
  navigate(event: KeyboardEvent, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % this.tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + this.tabs.length - 1) % this.tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = this.tabs.length - 1;
    else return;
    event.preventDefault();
    this.active.set(this.tabs[next].id);
    (event.currentTarget as HTMLElement).parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role=tab]')
      [next]?.focus();
  }
}
