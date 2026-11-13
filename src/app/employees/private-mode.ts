import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
type PrivacyState = { privateMode: boolean; unlockedUntil: number | null; serverNow?: number };
export interface PrivateModeChallenge {
  maskedEmail: string;
  expiresAt: number;
  resendAt: number;
}
@Injectable({ providedIn: 'root' })
export class PrivateMode implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl + '/employee-portal/private-mode';
  readonly unlockedUntil = signal(0);
  readonly locked = computed(() => this.unlockedUntil() === 0);
  readonly revision = signal(0);
  private generation = 0;
  private pendingLock = false;
  private timer?: ReturnType<typeof setInterval>;
  private retry?: ReturnType<typeof setTimeout>;
  private ticks = 0;
  private monotonicUntil = 0;
  private readonly revalidate = () => {
    if (this.unlockedUntil()) { this.reset(false); void this.refresh(); }
  };
  private readonly visible = () => { if (document.visibilityState === 'visible') this.revalidate(); };
  private channel =
    typeof window !== 'undefined' && window.BroadcastChannel
      ? new window.BroadcastChannel('paystream-private-mode')
      : null;
  constructor() {
    if (this.channel) this.channel.onmessage = () => this.reset(false);
    window.addEventListener('focus', this.revalidate);
    window.addEventListener('pageshow', this.revalidate);
    document.addEventListener('visibilitychange', this.visible);
  }
  reset(broadcast = true) {
    clearTimeout(this.retry);
    this.pendingLock = false;
    this.generation++;
    this.unlockedUntil.set(0);
    this.revision.update((value) => value + 1);
    clearInterval(this.timer);
    this.timer = undefined;
    if (broadcast) this.channel?.postMessage('locked');
  }
  private apply(state: PrivacyState) {
    const remaining = state.privateMode ? 0 : Math.max(0, (state.unlockedUntil ?? 0) - (state.serverNow ?? Date.now()));
    if (remaining === 0) {
      if (this.unlockedUntil()) this.reset();
      return;
    }
    this.unlockedUntil.set(Date.now() + remaining);
    this.monotonicUntil = performance.now() + remaining;
    this.revision.update((value) => value + 1);
    if (!this.timer)
      this.timer = setInterval(() => {
        if (Date.now() >= this.unlockedUntil() || performance.now() >= this.monotonicUntil) this.reset();
        else if (++this.ticks % 15 === 0) void this.refresh();
      }, 1000);
  }
  async refresh() {
    const generation = this.generation;
    if (this.pendingLock) {
      try {
        await this.lock();
      } catch {}
      return;
    }
    try {
      const state = await firstValueFrom(this.http.get<PrivacyState>(this.url));
      if (generation === this.generation) this.apply(state);
    } catch {
      if (generation === this.generation) {
        try { await this.lock(); } catch {}
      }
    }
  }
  async request() {
    if (this.pendingLock) await this.lock();
    this.reset();
    return firstValueFrom(this.http.post<PrivateModeChallenge>(this.url + '/request', {}));
  }
  async verify(code: string) {
    const generation = this.generation;
    const state = await firstValueFrom(
      this.http.post<PrivacyState>(this.url + '/verify', { code }),
    );
    if (generation === this.generation) {
      this.pendingLock = false;
      this.apply(state);
    }
  }
  async lock() {
    this.reset();
    this.pendingLock = true;
    const generation = this.generation;
    try {
      await firstValueFrom(this.http.post(this.url + '/lock', {}));
      if (generation === this.generation) this.pendingLock = false;
    } catch (error) {
      if (generation === this.generation)
        this.retry = setTimeout(() => {
          void this.lock().catch(() => {});
        }, 3000);
      throw error;
    }
  }
  ngOnDestroy() {
    window.removeEventListener('focus', this.revalidate);
    window.removeEventListener('pageshow', this.revalidate);
    document.removeEventListener('visibilitychange', this.visible);
    this.reset(false);
    this.channel?.close();
  }
}
