import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';
@Directive({ selector: '[appPageTransition]', exportAs: 'pageTransition' })
export class PageTransition implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private animation?: Animation; private frame?: number;
  private readonly motion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  private readonly changed = () => { if (this.motion?.matches) this.cancel(); };
  ngAfterViewInit() { this.motion?.addEventListener?.('change', this.changed); this.enter(); }
  enter() {
    this.cancel();
    if (this.motion?.matches || typeof this.element.nativeElement.animate !== 'function') return;
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined;
      if (!this.motion?.matches) this.animation = this.element.nativeElement.animate(
        [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }],
        { duration: 180, easing: 'cubic-bezier(.2,.7,.3,1)' },
      );
    });
  }
  private cancel() { if (this.frame !== undefined) cancelAnimationFrame(this.frame); this.frame = undefined; this.animation?.cancel(); this.animation = undefined; }
  ngOnDestroy() { this.cancel(); this.motion?.removeEventListener?.('change', this.changed); }
}
