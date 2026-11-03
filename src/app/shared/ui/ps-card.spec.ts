import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PsCard, PsCardActions, PsCardFooter, PsCardSubtitle, PsCardTitle } from './ps-card';

@Component({ changeDetection: ChangeDetectionStrategy.Default, imports: [PsCard, PsCardTitle, PsCardSubtitle, PsCardActions, PsCardFooter], template: '<ps-card [loading]="loading" [empty]="empty"><span cardTitle>Salary</span><span cardSubtitle>Details</span><button cardActions (click)="calls = calls + 1">Edit</button><input value="draft"><div cardFooter><button>Cancel</button><button>Save</button></div></ps-card>' })
class Host { loading = false; empty = false; calls = 0; }
describe('PsCard', () => {
  it('projects title, description, header action, body and footer in order', () => {
    const f = TestBed.createComponent(Host); f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(f.nativeElement.querySelector('h2').textContent).toBe('Salary');
    expect(f.nativeElement.querySelector('.subtitle').textContent).toBe('Details');
    f.nativeElement.querySelector('header button').click(); expect(f.componentInstance.calls).toBe(1);
    expect(f.nativeElement.querySelector('footer').textContent).toContain('CancelSave');
  });
  it('supports loading/empty presentation without destroying projected drafts', () => {
    const f = TestBed.createComponent(Host); f.changeDetectorRef.markForCheck(); f.detectChanges();
    const input = f.nativeElement.querySelector('input'); input.value = 'preserved';
    f.componentInstance.loading = true; f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(f.nativeElement.querySelector('ps-card').getAttribute('aria-busy')).toBe('true');
    expect(f.nativeElement.querySelector('[role=status]').textContent).toContain('Loading');
    f.componentInstance.loading = false; f.componentInstance.empty = true; f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(f.nativeElement.querySelector('[role=status]').textContent).toContain('No records');
    f.componentInstance.empty = false; f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(f.nativeElement.querySelector('input')).toBe(input); expect(input.value).toBe('preserved');
  });
  it('omits optional header/footer when no slots are supplied', () => {
    const f = TestBed.createComponent(PsCard); f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(f.nativeElement.querySelector('header,footer')).toBeNull();
  });
});
