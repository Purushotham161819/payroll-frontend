import { Component, input } from '@angular/core';
@Component({ selector: 'app-action-icon', template: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  @switch (name()) {
    @case ('refresh') { <path d="M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.5-2L20 8M4 16l2.4 3A7 7 0 0 0 18 17"/> }
    @case ('eye') { <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/> }
    @case ('download') { <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/> }
  }
  </svg>`, styles: [`:host{display:inline-flex;width:18px;height:18px}svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}`] })
export class ActionIcon { readonly name = input.required<'refresh' | 'eye' | 'download'>(); }
