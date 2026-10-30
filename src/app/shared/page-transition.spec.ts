import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PageTransition } from './page-transition';
@Component({ imports: [PageTransition], template: '<header>Stable header</header><main appPageTransition>Destination content</main>' })
class Host {}
describe('Restrained page transitions', () => {
  let reduce: boolean, handler: (() => void) | undefined, frames: Map<number, FrameRequestCallback>, counter: number;
  let animate: ReturnType<typeof vi.fn>, cancel: ReturnType<typeof vi.fn>, remove: ReturnType<typeof vi.fn>;
  let original: PropertyDescriptor | undefined;
  beforeEach(() => {
    reduce = false; frames = new Map(); counter = 0; cancel = vi.fn(); remove = vi.fn(); animate = vi.fn(function(this: HTMLElement) { return { cancel } as any; });
    original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'animate'); Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
    vi.stubGlobal('matchMedia', () => ({ get matches() { return reduce; }, addEventListener: (_: string, listener: () => void) => handler = listener, removeEventListener: remove }));
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++counter, callback); return counter; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  });
  afterEach(() => { TestBed.resetTestingModule(); if (original) Object.defineProperty(HTMLElement.prototype, 'animate', original); else delete (HTMLElement.prototype as any).animate; vi.unstubAllGlobals(); });
  function flush() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(0)); }
  it('animates only main content for 180ms without altering rendered data', () => {
    const fixture = TestBed.createComponent(Host); fixture.detectChanges(); flush();
    expect(animate).toHaveBeenCalledTimes(1); expect(animate.mock.contexts[0].tagName).toBe('MAIN'); expect(animate.mock.calls[0][1].duration).toBe(180);
    expect(fixture.nativeElement.querySelector('main').textContent).toBe('Destination content'); fixture.destroy(); expect(cancel).toHaveBeenCalled();
  });
  it('coalesces fast route activations and cancels an older animation', () => {
    const fixture = TestBed.createComponent(Host); fixture.detectChanges(); const transition = fixture.debugElement.query(By.directive(PageTransition)).injector.get(PageTransition);
    transition.enter(); transition.enter(); flush(); expect(animate).toHaveBeenCalledTimes(1); transition.enter(); expect(cancel).toHaveBeenCalledTimes(1); flush(); expect(animate).toHaveBeenCalledTimes(2);
  });
  it('skips animation when reduced motion is requested and responds to preference changes', () => {
    reduce = true; const fixture = TestBed.createComponent(Host); fixture.detectChanges(); flush(); expect(animate).not.toHaveBeenCalled();
    reduce = false; const transition = fixture.debugElement.query(By.directive(PageTransition)).injector.get(PageTransition); transition.enter(); flush(); reduce = true; handler?.(); expect(cancel).toHaveBeenCalled(); fixture.destroy(); expect(remove).toHaveBeenCalled();
  });
});
