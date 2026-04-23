import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeSignal = signal<'light' | 'dark'>('light');
  public theme = this.themeSignal.asReadonly();

  constructor() {
    const saved = localStorage.getItem('retail_os_theme') as 'light' | 'dark';
    if (saved) {
      this.themeSignal.set(saved);
    }

    effect(() => {
      const current = this.themeSignal();
      document.documentElement.setAttribute('data-theme', current);
      localStorage.setItem('retail_os_theme', current);
    });
  }

  toggleTheme() {
    this.themeSignal.update(t => t === 'light' ? 'dark' : 'light');
  }

  setTheme(theme: 'light' | 'dark') {
    this.themeSignal.set(theme);
  }
}
