import { Component, input } from '@angular/core';
@Component({
  selector: 'app-action-icon',
  template: `<svg
    viewBox="0 0 24 24"
    [class.warning]="name() === 'warning'"
    aria-hidden="true"
    focusable="false"
  >
    @switch (name()) {
      @case ('users') {
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        <circle cx="9" cy="7" r="4" />
      }
      @case ('history') {
        <path d="M3 11a9 9 0 1 1 2.6 7M3 4v7h7M12 7v5l3 2" />
      }
      @case ('table') {
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M3 15h18M9 3v18" />
      }
      @case ('edit') {
        <path d="m15 4 5 5M4 20l4-1L21 6l-5-5L3 14l-1 7Z" />
      }
      @case ('save') {
        <path d="M4 3h13l4 4v14H3V3h1ZM7 3v6h10V3M7 21v-8h10v8" />
      }
      @case ('warning') {
        <path d="m12 3 10 18H2L12 3ZM12 9v5M12 17h.01" />
      }
      @case ('close') {
        <path d="m6 6 12 12M6 18 18 6" />
      }
      @case ('refresh') {
        <path d="M20 11a8 8 0 1 0-2.34 6.66M20 4v7h-7" />
      }
      @case ('eye') {
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      }
      @case ('download') {
        <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
      }
    }
  </svg>`,
  styles: [
    `
      :host {
        display: inline-flex;
        width: 18px;
        height: 18px;
      }
      svg.warning {
        color: #8a5a16;
      }
      svg {
        width: 100%;
        height: 100%;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.7;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    `,
  ],
})
export class ActionIcon {
  readonly name = input.required<
    'users' | 'refresh' | 'eye' | 'download' | 'history' | 'table' | 'edit' | 'save' | 'warning' | 'close'
  >();
}
