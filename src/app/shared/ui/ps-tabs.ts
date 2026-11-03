import { Component, input, model } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
export interface PsTab {
  id: string;
  label: string;
  link?: string;
}
@Component({
  selector: 'ps-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `<nav
    class="ribbon"
    [attr.aria-label]="label()"
    [attr.role]="links() ? null : 'tablist'"
  >
    @for (tab of items(); track tab.id) {
      @if (tab.link) {
        <a
          [routerLink]="tab.link"
          routerLinkActive="selected"
          [routerLinkActiveOptions]="{ paths: 'exact', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored' }"
          ariaCurrentWhenActive="page"
          >{{ tab.label }}</a
        >
      } @else {
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
    }
  </nav>`,
  styleUrl: './ps-tabs.scss',
})
export class PsTabs {
  readonly items = input.required<PsTab[]>();
  readonly active = model('details');
  readonly label = input('Sections');
  readonly prefix = input('section');
  links() {
    return this.items().some((t) => !!t.link);
  }
  navigate(event: KeyboardEvent, index: number) {
    const count = this.items().length;
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % count
        : event.key === 'ArrowLeft'
          ? (index + count - 1) % count
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? count - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    this.active.set(this.items()[next].id);
    (event.currentTarget as HTMLElement).parentElement
      ?.querySelectorAll<HTMLButtonElement>('button')
      [next]?.focus();
  }
}
export const PEOPLE_TABS: PsTab[] = [
  { id: 'employees', label: 'Employees', link: '/' },
  { id: 'contractors', label: 'Contractors', link: '/contractors' },
];
