import { Component, effect, ElementRef, inject, input, Renderer2, viewChild } from '@angular/core';
import { ACTION_ICONS, PsAction } from './action-icons';

@Component({
  selector: 'ps-icon', standalone: true,
  template: '<svg #svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"></svg>',
  styles: [':host{display:inline-flex;flex:none;width:var(--icon-sm);height:var(--icon-sm)} :host(.md){width:var(--icon-md);height:var(--icon-md)} svg{width:100%;height:100%;stroke-width:var(--icon-stroke)}'],
  host: { 'aria-hidden': 'true', '[class.md]': 'size() === "md"' },
})
export class PsIcon {
  readonly action = input.required<PsAction>();
  readonly size = input<'sm' | 'md'>('sm');
  private readonly svg = viewChild<ElementRef<SVGElement>>('svg');
  private readonly renderer = inject(Renderer2);
  constructor() {
    effect(() => {
      const svg = this.svg()?.nativeElement;
      if (!svg) return;
      const glyph = ACTION_ICONS[this.action()];
      for (const child of Array.from(svg.childNodes)) this.renderer.removeChild(svg, child);
      for (const [tag, attributes] of glyph ?? []) {
        const child = this.renderer.createElement(tag, 'svg');
        for (const [key, value] of Object.entries(attributes)) this.renderer.setAttribute(child, key, value);
        this.renderer.appendChild(svg, child);
      }
    });
  }
}
