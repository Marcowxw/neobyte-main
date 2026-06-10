import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

type TransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => unknown;
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT) as TransitionDocument;
  private readonly storageKey = 'neobyte-theme';

  readonly theme = signal<ThemeMode>(this.resolveInitialTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  toggleTheme(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(nextTheme: ThemeMode): void {
    if (nextTheme === this.theme()) {
      return;
    }

    if (this.document.startViewTransition) {
      this.document.startViewTransition(() => {
        this.commitTheme(nextTheme);
      });
      return;
    }

    this.commitTheme(nextTheme);
  }

  private commitTheme(nextTheme: ThemeMode): void {
    this.theme.set(nextTheme);
    this.applyTheme(nextTheme);
    this.persistTheme(nextTheme);
  }

  private applyTheme(theme: ThemeMode): void {
    const root = this.document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
    this.applyBodyThemeClass(theme);
    this.updateThemeColor(theme);
  }

  private applyBodyThemeClass(theme: ThemeMode): void {
    const body = this.document.body;
    body.classList.toggle('theme-light', theme === 'light');
    body.classList.toggle('theme-dark', theme === 'dark');
  }

  private persistTheme(theme: ThemeMode): void {
    try {
      this.document.defaultView?.localStorage.setItem(this.storageKey, theme);
    } catch {
      // Si localStorage no está disponible, el tema sigue funcionando en memoria.
    }
  }

  private updateThemeColor(theme: ThemeMode): void {
    const metaThemeColor = this.document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!metaThemeColor) {
      return;
    }

    metaThemeColor.content = theme === 'light' ? '#ceff8c' : '#143731';
  }

  private resolveInitialTheme(): ThemeMode {
    const storedTheme = this.readStoredTheme();
    if (storedTheme) {
      return storedTheme;
    }

    const prefersLight = this.document.defaultView?.matchMedia('(prefers-color-scheme: light)').matches ?? false;
    return prefersLight ? 'light' : 'dark';
  }

  private readStoredTheme(): ThemeMode | null {
    try {
      const storedTheme = this.document.defaultView?.localStorage.getItem(this.storageKey);
      return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null;
    } catch {
      return null;
    }
  }
}