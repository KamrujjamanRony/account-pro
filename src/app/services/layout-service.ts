import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly mobileNavOpen = signal(false);

  toggleMobileNav() {
    this.mobileNavOpen.update(v => !v);
  }

  closeMobileNav() {
    this.mobileNavOpen.set(false);
  }
}
