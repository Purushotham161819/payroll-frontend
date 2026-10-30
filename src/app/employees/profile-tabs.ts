import { Component, input, model } from '@angular/core';
export type ProfileTab = 'details' | 'history' | 'checks';
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
  styles: [
    `
      .ribbon {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        border-bottom: 1px solid #d8e4dc;
        margin: 20px 0 24px;
        padding: 0 4px;
        scrollbar-width: thin;
      }
      button {
        flex: none;
        border: 0;
        border-bottom: 3px solid transparent;
        border-radius: 6px 6px 0 0;
        background: transparent;
        color: #65756b;
        font: inherit;
        font-size: 14px;
        font-weight: 500;
        padding: 13px 18px;
        cursor: pointer;
        white-space: nowrap;
      }
      button[aria-selected='true'] {
        background: #edf5ef;
        border-bottom-color: #28644a;
        color: #20583f;
        font-weight: 650;
      }
      button:hover {
        background: #f2f7f3;
        color: #20583f;
      }
      button:focus-visible {
        outline: 2px solid #28644a;
        outline-offset: -3px;
      }
      @media (max-width: 600px) {
        button {
          padding: 12px 14px;
        }
      }
    `,
  ],
})
export class ProfileTabs {
  readonly active = model<ProfileTab>('details');
  readonly prefix = input('profile');
  readonly tabs: { id: ProfileTab; label: string }[] = [
    { id: 'details', label: 'Employee Details' },
    { id: 'history', label: 'Employment History' },
    { id: 'checks', label: 'Pay Checks' },
  ];
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
