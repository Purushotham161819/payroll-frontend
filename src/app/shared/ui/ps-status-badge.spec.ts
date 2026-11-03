import { TestBed } from '@angular/core/testing';
import { PsStatusBadge } from './ps-status-badge';

describe('PsStatusBadge', () => {
  it.each([
    ['Active', 'success'], ['active', 'success'], ['Terminated', 'danger'], ['Draft', 'neutral'],
    ['Submitted', 'info'], ['Pending', 'warning'], ['Approved', 'success'], ['Rejected', 'danger'],
    ['Paid', 'success'], ['Expired', 'danger'], ['Processing', 'info'], ['On Hold', 'warning'],
    ['Needs Review', 'neutral'], ['Ineligible', 'neutral'], ['Not Processed', 'neutral'],
    ['Payment Pending', 'neutral'], ['Calculated', 'neutral'], ['estimate_saved', 'neutral'],
    ['Published', 'neutral'], ['Unpublished / superseded', 'neutral'], ['Unexpected code', 'neutral'],
    ['__proto__', 'neutral'],
  ])('maps %s to approved or fallback tone %s without mutating the value', (status, tone) => {
    const f = TestBed.createComponent(PsStatusBadge); f.componentRef.setInput('status', status); f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(f.nativeElement.getAttribute('data-tone')).toBe(tone);
    expect(f.nativeElement.textContent.trim()).toBe(status === 'active' ? 'Active' : status);
    expect(f.componentInstance.status()).toBe(status);
    expect(f.nativeElement.querySelector('button,a')).toBeNull();
  });
});
