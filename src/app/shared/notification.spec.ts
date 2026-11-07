import { TestBed } from '@angular/core/testing';
import { NotificationService, completionSignal } from './notification.service';
import { NotificationModal } from './notification-modal';
describe('Central notifications', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
  });
  it('supports four kinds, ignores blanks and deduplicates active/queued messages', () => {
    const n = TestBed.inject(NotificationService);
    n.success('');
    expect(n.current()).toBeNull();
    n.success('Saved.');
    n.success('Saved.');
    n.warning('Review.');
    n.warning('Review.');
    expect(n.current()?.title).toBe('Success!');
    n.dismiss();
    expect(n.current()?.kind).toBe('warning');
    n.dismiss();
    expect(n.current()).toBeNull();
    n.information('Details.');
    expect(n.current()?.title).toBe('Information.');
    n.error('Failed.');
    expect(n.current()?.title).toBe('Something went wrong.');
  });
  it('permits the same message for a later operation and coalesces feedback from the same source', () => {
    const n = TestBed.inject(NotificationService);
    const s = TestBed.runInInjectionContext(() => completionSignal());
    s.set('Record saved.');
    s.set('Record updated.');
    expect(n.current()?.message).toBe('Record updated.');
    n.dismiss();
    expect(n.current()).toBeNull();
    s.set('Record updated.');
    expect(n.current()?.message).toBe('Record updated.');
    s.set('');
    expect(s()).toBe('');
  });
  it('opens one accessible dialog with OK focus and closes with OK and Escape', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const fixture = TestBed.createComponent(NotificationModal);
    fixture.detectChanges();
    const n = TestBed.inject(NotificationService);
    n.success('Employee saved.');
    await fixture.whenStable();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute('aria-labelledby')).toBe('notification-title');
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Success!');
    expect(fixture.nativeElement.querySelector('button').textContent).toContain('OK');
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('button'));
    n.success('Employee saved.');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('dialog')).toHaveLength(1);
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(opener);
    n.warning('Check this.');
    await fixture.whenStable();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await fixture.whenStable();
    expect(n.current()).toBeNull();
    expect(dialog.open).toBe(false);
    fixture.destroy();
    opener.remove();
  });
});
