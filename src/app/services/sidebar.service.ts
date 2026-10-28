import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private readonly STORAGE_KEY = 'retail_os_sidebar_open';
  
  // Defaults to open unless user previously closed it
  public isOpen = signal<boolean>(localStorage.getItem(this.STORAGE_KEY) !== 'false');

  toggle() {
    this.isOpen.update(open => {
      const next = !open;
      try {
        localStorage.setItem(this.STORAGE_KEY, String(next));
      } catch (e) {
        // Fallback if local storage restricted
      }
      return next;
    });
  }

  close() {
    this.isOpen.set(false);
    try {
      localStorage.setItem(this.STORAGE_KEY, 'false');
    } catch (e) {}
  }

  open() {
    this.isOpen.set(true);
    try {
      localStorage.setItem(this.STORAGE_KEY, 'true');
    } catch (e) {}
  }
}
