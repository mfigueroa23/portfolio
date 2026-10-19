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
      { href: '/#certifications', label: nav.certifications },
      { href: '/#blog', label: nav.blog },
      { href: '/#testimonials', label: nav.testimonials },
    ].map((link) => ({ ...link, href: this.language.href(link.href) }));
  })();
  public readonly isMobileMenuOpen = signal(false);
  public readonly mobileIcon = computed(
    () => `fa-solid fa-${this.isMobileMenuOpen() ? 'x' : 'bars'} fa-xl`,
  );
  public showMenu = (): void => {
    this.isMobileMenuOpen.update((open) => !open);
  };
  /**
   * Closes the phone menu once an option is chosen. The options are plain links, and a section
   * of the same page changes only the hash, so nothing else would close it (Spec 007 RF-25, D6).
   */
  public closeMenu(event: Event): void {
    if ((event.target as Element | null)?.closest('a')) this.isMobileMenuOpen.set(false);
  }
  protected onScroll(): void {
    this.isScrolled.set(window.scrollY > 50);
  }
}
