import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PsTooltip } from './ps-tooltip';

@Component({ changeDetection: ChangeDetectionStrategy.Default, imports: [PsTooltip], template: '<button psTooltip="Save changes" aria-describedby="original" (click)="calls = calls + 1">Save</button><span psTooltip="Unavailable" tabindex="0"><button disabled>Disabled</button></span>' })
class Host { calls = 0; }
describe('PsTooltip', () => {
  afterEach(() => vi.useRealTimers());
  it('opens after hover delay, stays hoverable, closes on leave and cleans up', () => {
    vi.useFakeTimers(); const f = TestBed.createComponent(Host); f.changeDetectorRef.markForCheck(); f.detectChanges();
    const button = f.nativeElement.querySelector('button') as HTMLButtonElement;
    button.dispatchEvent(new MouseEvent('mouseenter')); vi.advanceTimersByTime(299);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
    vi.advanceTimersByTime(1); const tip = document.querySelector('[role=tooltip]') as HTMLElement;
    expect(tip.textContent).toBe('Save changes'); expect(button.getAttribute('aria-describedby')).toContain(tip.id);
    button.dispatchEvent(new MouseEvent('mouseleave')); tip.dispatchEvent(new MouseEvent('mouseenter')); vi.advanceTimersByTime(500);
    expect(document.querySelector('[role=tooltip]')).toBe(tip);
    tip.dispatchEvent(new MouseEvent('mouseleave')); vi.advanceTimersByTime(300);
    expect(document.querySelector('[role=tooltip]')).toBeNull(); expect(button.getAttribute('aria-describedby')).toBe('original');
    f.destroy(); vi.runAllTimers(); expect(document.querySelector('[role=tooltip]')).toBeNull();
  });
  it('opens immediately on keyboard focus, dismisses with Escape and preserves clicks/descriptions', () => {
    const f = TestBed.createComponent(Host); f.changeDetectorRef.markForCheck(); f.detectChanges(); const button = f.nativeElement.querySelector('button') as HTMLButtonElement;
    button.dispatchEvent(new FocusEvent('focusin')); expect(document.querySelector('[role=tooltip]')).not.toBeNull();
    button.click(); expect(f.componentInstance.calls).toBe(1);
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('[role=tooltip]')).toBeNull(); expect(button.getAttribute('aria-describedby')).toBe('original');
    button.dispatchEvent(new FocusEvent('focusout')); expect(document.querySelector('[role=tooltip]')).toBeNull();
  });
  it('supports disabled controls through an explicit focusable wrapper', () => {
    const f = TestBed.createComponent(Host); f.changeDetectorRef.markForCheck(); f.detectChanges(); const span = f.nativeElement.querySelector('span') as HTMLElement;
    span.dispatchEvent(new FocusEvent('focusin')); expect(document.querySelector('[role=tooltip]')?.textContent).toBe('Unavailable');
    span.dispatchEvent(new FocusEvent('focusout')); expect(document.querySelector('[role=tooltip]')).toBeNull();
  });
});
