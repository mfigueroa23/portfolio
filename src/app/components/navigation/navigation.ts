import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { Button } from '../button/button';
import { LanguageSwitch } from '../language-switch/language-switch';

@Component({
  imports: [Button, LanguageSwitch],
  selector: 'app-navigation',
  styleUrl: './navigation.css',
  templateUrl: './navigation.html',
  host: {
    '(window:scroll)': 'onScroll()',
  },
})
export class Navigation {
  constructor() {
    afterNextRender(() => this.onScroll());
  }
  protected readonly language = inject(LanguageService);
  public readonly isScrolled = signal(false);
  // Links stay in the page language (the section links point at its home).
  public navLinks: { href: string; label: string }[] = (() => {
    const { nav } = this.language.m();
    return [
      { href: '/#about', label: nav.about },
      { href: '/#projects', label: nav.projects },
      { href: '/#experience', label: nav.experience },
      { href: '/#testimonials', label: nav.testimonials },
      { href: '/blog', label: nav.blog },
    ].map((link) => ({ ...link, href: this.language.href(link.href) }));
  })();
  public readonly isMobileMenuOpen = signal(false);
  public readonly mobileIcon = computed(
    () => `fa-solid fa-${this.isMobileMenuOpen() ? 'x' : 'bars'} fa-xl`,
  );
  public showMenu = (): void => {
    this.isMobileMenuOpen.update((open) => !open);
  };
  protected onScroll(): void {
    this.isScrolled.set(window.scrollY > 50);
  }
}
