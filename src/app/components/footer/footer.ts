import { Component, inject } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  imports: [],
  selector: 'app-footer',
  styleUrl: './footer.css',
  templateUrl: './footer.html',
})
export class Footer {
  protected readonly language = inject(LanguageService);
  public readonly currentYear = new Date().getFullYear();
  public footerLinks: { href: string; label: string }[] = (() => {
    const { nav } = this.language.m();
    return [
      { href: '/#about', label: nav.about },
      { href: '/#projects', label: nav.projects },
      { href: '/#experience', label: nav.experience },
      { href: '/#contact', label: nav.contact },
    ].map((link) => ({ ...link, href: this.language.href(link.href) }));
  })();
  public socialLinks: { icon: string; href: string; label: string }[] = [
    { icon: 'fa-brands fa-github', href: 'https://github.com/mfigueroa23', label: 'GitHub' },
    {
      icon: 'fa-brands fa-linkedin',
      href: 'https://www.linkedin.com/in/mfigueroa23',
      label: 'LinkedIn',
    },
    { icon: 'fa-brands fa-x-twitter', href: 'https://x.com/marcoo_f23', label: 'X' },
  ];
}
