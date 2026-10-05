import { Component, afterNextRender, computed, signal } from '@angular/core';
import { Button } from '../button/button';

@Component({
  imports: [Button],
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
  public readonly isScrolled = signal(false);
  public navLinks: { href: string; label: string }[] = [
    { href: '/#about', label: 'About' },
    { href: '/#projects', label: 'Projects' },
    { href: '/#experience', label: 'Experience' },
    { href: '/#testimonials', label: 'Testimonials' },
    { href: '/blog', label: 'Blog' },
  ];
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
