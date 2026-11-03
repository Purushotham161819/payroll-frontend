import { Component, ComponentRef, Directive, effect, ElementRef, HostListener, inject, input, OnDestroy, Renderer2 } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';

@Component({
  selector: 'ps-tooltip-panel', standalone: true,
  template: '{{ text }}',
  host: { role: 'tooltip' },
  styles: [':host{display:block;max-width:var(--tooltip-max);padding:var(--space-1) var(--space-2);border-radius:var(--radius-sm);background:var(--brand-900);color:var(--ink-on-dark);font:var(--type-helper);overflow-wrap:anywhere;box-shadow:var(--shadow-none)}'],
})
export class PsTooltipPanel { text = ''; }

@Directive({ selector: '[psTooltip]', standalone: true })
export class PsTooltip implements OnDestroy {
  readonly psTooltip = input('');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly overlay = inject(Overlay);
  private ref?: OverlayRef;
  private panel?: ComponentRef<PsTooltipPanel>;
  private timer?: ReturnType<typeof setTimeout>;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private readonly id = 'ps-tip-' + crypto.randomUUID();
  private hover = false;
  private focus = false;
  private dismissed = false;
  private defaultText?: () => string;
  setDefaultText(text: () => string): void { this.defaultText = text; }
  private tooltipText(): string { return this.psTooltip() || this.defaultText?.() || ''; }

  constructor() {
    effect(() => {
      const text = this.tooltipText();
      if (!text.trim()) this.hide();
      else if (this.panel) { this.panel.instance.text = text; this.panel.changeDetectorRef.detectChanges(); }
    });
  }

  @HostListener('mouseenter') enter(): void { this.hover = true; this.dismissed = false; this.schedule(); }
  @HostListener('mouseleave') leave(): void { this.hover = false; if (!this.focus) this.scheduleHide(); }
  @HostListener('focusin') focusIn(): void { this.focus = true; this.dismissed = false; this.show(); }
  @HostListener('focusout') focusOut(): void { this.focus = false; if (!this.hover) this.hide(); }
  @HostListener('document:keydown.escape') escape(): void { this.dismissed = true; this.hide(); }

  private schedule(): void {
    clearTimeout(this.hideTimer);
    clearTimeout(this.timer);
    const delay = parseFloat(getComputedStyle(this.host).getPropertyValue('--tooltip-delay')) || 300;
    this.timer = setTimeout(() => this.show(), delay);
  }
  private show(): void {
    clearTimeout(this.hideTimer);
    clearTimeout(this.timer);
    if (!this.tooltipText().trim() || this.ref || this.dismissed || (!this.hover && !this.focus)) return;
    const gap = parseFloat(getComputedStyle(this.host).getPropertyValue('--tooltip-gap')) || 6;
    const position = this.overlay.position().flexibleConnectedTo(this.host).withPush(true).withPositions([
      { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -gap },
      { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: gap },
    ]);
    this.ref = this.overlay.create({ positionStrategy: position, scrollStrategy: this.overlay.scrollStrategies.reposition() });
    this.panel = this.ref.attach(new ComponentPortal(PsTooltipPanel));
    this.panel.instance.text = this.tooltipText();
    const element = this.panel.location.nativeElement as HTMLElement;
    element.id = this.id;
    element.addEventListener('mouseenter', () => { this.hover = true; clearTimeout(this.hideTimer); });
    element.addEventListener('mouseleave', () => { this.hover = false; if (!this.focus) this.scheduleHide(); });
    const described = (this.host.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    this.renderer.setAttribute(this.host, 'aria-describedby', [...described, this.id].join(' '));
    this.panel.changeDetectorRef.detectChanges();
  }
  private hide(): void {
    clearTimeout(this.timer);
    clearTimeout(this.hideTimer);
    this.ref?.dispose(); this.ref = undefined; this.panel = undefined;
    const ids = (this.host.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(id => id && id !== this.id);
    if (ids.length) this.renderer.setAttribute(this.host, 'aria-describedby', ids.join(' '));
    else this.renderer.removeAttribute(this.host, 'aria-describedby');
  }
  private scheduleHide(): void { this.hideTimer = setTimeout(() => { if (!this.hover && !this.focus) this.hide(); }, 300); }
  ngOnDestroy(): void { this.hide(); }
}
