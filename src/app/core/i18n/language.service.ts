import { PlatformLocation } from '@angular/common';
import { computed, DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { Alternates, Lang, langFromPath, localizePath } from './language';
import { en, Messages } from './messages.en';
import { es } from './messages.es';

const MESSAGES: Record<Lang, Messages> = { en, es };

/** One year, in seconds (RF-126). */
const REMEMBER_SECONDS = 365 * 24 * 60 * 60;

/** The cookie nginx reads to skip the first-visit language redirect (RF-126, RF-128). */
export function langCookie(lang: Lang): string {
  return `lang=${lang}; Max-Age=${REMEMBER_SECONDS}; Path=/; SameSite=Lax; Secure`;
}

/**
 * Language of the page, taken from its URL, and its interface texts (RF-131). Every link of
 * the site is a full page load, so the language is fixed for the life of the app; reading the
 * platform location (not the router) makes it known before the first navigation ends, on the
 * server and in the browser.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly path = inject(PlatformLocation).pathname || '/';
  private readonly override = signal<Alternates | null>(null);

  public readonly lang = signal<Lang>(langFromPath(this.path)).asReadonly();
  /** Interface texts in the page language. */
  public readonly m = computed(() => MESSAGES[this.lang()]);
  /** This page in each language; pages whose slugs differ per language override it. */
  public readonly alternates = computed<Alternates>(
    () =>
      this.override() ?? { en: localizePath(this.path, 'en'), es: localizePath(this.path, 'es') },
  );

  constructor() {
    // Declares the page language (RF-136); the prerendered and server HTML carry it.
    this.document.documentElement.lang = this.lang();
  }

  public setAlternates(alternates: Alternates): void {
    this.override.set(alternates);
  }

  /** A site path in the page language, for internal links. */
  public href(path: string): string {
    return localizePath(path, this.lang());
  }

  /** The language to declare on an item shown in another language than the page (RF-152). */
  public itemLang(item: { lang?: Lang }): Lang | null {
    return item.lang && item.lang !== this.lang() ? item.lang : null;
  }

  public remember(lang: Lang): void {
    this.document.cookie = langCookie(lang);
  }
}
