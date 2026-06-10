import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';

@Service()
export class AuthService {
  private memoryCache: any = null;
  private storageKey = '*_*';
  private router = inject(Router);

  constructor() {
    // Restore from secure storage on service init
    this.restoreUser();

    // Backup to secure storage before page unload
    window.addEventListener('beforeunload', () => this.backupUser());      // todo: this.backupUser()
  }

  setUser(user: any) {
    this.memoryCache = user;
    this.backupUser(); // Optional: Persist immediately
  }

  getUser() {
    return this.memoryCache;
  }

  deleteUser() {
    this.memoryCache = null;
    localStorage.removeItem(this.storageKey);
    this.router.navigate(['/admin-login']);
  }

  private backupUser() {
    if (this.memoryCache) {
      try {
        const json = JSON.stringify(this.memoryCache);
        const encoded = btoa(encodeURIComponent(json));
        localStorage.setItem(this.storageKey, encoded);
      } catch { }
    }
  }

  private restoreUser() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const json = decodeURIComponent(atob(stored));
        this.memoryCache = JSON.parse(json);
        return;
      } catch {
        localStorage.removeItem(this.storageKey);
      }
    }
  }
}
