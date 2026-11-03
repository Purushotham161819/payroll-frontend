import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { PsButton } from './ps-button';
import { provideRouter, Router, RouterLink } from '@angular/router';

@Component({ imports: [PsButton, RouterLink], template: '<a psButton variant="ghost" icon="back" routerLink="/employees" [state]="{returnStatus: \'All\'}">Back to Employees</a>' })
class LinkHost {}

@Component({ changeDetection: ChangeDetectionStrategy.Default, imports: [PsButton], template: '<button psButton [variant]="variant" [disabled]="disabled" [loading]="loading" [icon]="icon" [iconPosition]="position" (click)="calls = calls + 1">Save</button>' })
class Host {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary';
  disabled = false; loading = false; calls = 0;
  icon: 'save' | null = null; position: 'start' | 'end' = 'start';
}
describe('PsButton', () => {
  it('preserves a real anchor, router href and navigation state with the shared ghost treatment', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'employees', component: LinkHost }])] });
    const f = TestBed.createComponent(LinkHost); f.detectChanges();
    const link = f.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/employees');
    expect(link.hasAttribute('type')).toBe(false);
    expect(link.hasAttribute('disabled')).toBe(false);
    expect(link.querySelector('button')).toBeNull();
    expect(link.dataset['variant']).toBe('ghost');
    expect(link.textContent?.trim()).toBe('Back to Employees');
    expect(link.querySelector('svg')).not.toBeNull();
    link.click(); await f.whenStable();
    expect(TestBed.inject(Router).url).toBe('/employees');
    expect(TestBed.inject(Location).getState()).toMatchObject({ returnStatus: 'All' });
    expect(TestBed.inject(Router).lastSuccessfulNavigation()?.extras.state).toEqual({ returnStatus: 'All' });
  });
  async function setup() {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const f = TestBed.createComponent(Host); f.changeDetectorRef.markForCheck(); f.detectChanges();
    return { f, host: f.componentInstance, button: f.nativeElement.querySelector('button') as HTMLButtonElement };
  }
  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)('renders variant %s on a native button and preserves its handler', async variant => {
    const { f, host, button } = await setup(); host.variant = variant; f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(button.dataset['variant']).toBe(variant);
    expect(button.type).toBe('button'); expect(button.textContent).toContain('Save');
    button.click(); expect(host.calls).toBe(1);
  });
  it('disables native activation while disabled or loading, then restores it', async () => {
    const { f, host, button } = await setup();
    host.disabled = true; f.changeDetectorRef.markForCheck(); f.detectChanges(); button.click(); expect(host.calls).toBe(0);
    host.disabled = false; host.loading = true; f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(button.disabled).toBe(true); expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('.spinner')?.getAttribute('aria-hidden')).toBe('true');
    button.click(); expect(host.calls).toBe(0);
    host.loading = false; f.changeDetectorRef.markForCheck(); f.detectChanges(); button.click(); expect(host.calls).toBe(1);
  });
  it('renders the approved optional icon and trailing placement without changing the label', async () => {
    const { f, host, button } = await setup(); host.icon = 'save'; host.position = 'end'; f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(button.classList.contains('trailing')).toBe(true);
    expect(button.querySelector('svg path')?.getAttribute('d')).toBe('M20 6 9 17l-5-5');
    expect(button.querySelector('ps-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(button.textContent).toContain('Save');
  });
  it('supports native-style boolean inputs and a caller-supplied loading label', () => {
    const f = TestBed.createComponent(PsButton);
    f.componentRef.setInput('loading', ''); f.componentRef.setInput('loadingLabel', 'Saving…'); f.detectChanges();
    const button = f.nativeElement as HTMLButtonElement;
    expect(f.componentInstance.nativeElement).toBe(button);
    expect(button.disabled).toBe(true); expect(button.textContent).toContain('Saving…');
    f.componentRef.setInput('loading', 'false'); f.componentRef.setInput('disabled', ''); f.detectChanges();
    expect(button.disabled).toBe(true); expect(button.hasAttribute('aria-busy')).toBe(false);
  });
});
