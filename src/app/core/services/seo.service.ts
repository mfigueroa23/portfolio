import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DEFAULT_SHARE_IMAGE, SITE_NAME, SITE_URL } from '../config/site';
import { Alternates, Lang, localizePath } from '../i18n/language';
import { LanguageService } from '../i18n/language.service';

export interface PageSeo {
  title: string;
  description: string;
  /** Path of the page, starting with `/`, in either language. */
  path: string;
  /** Absolute URL of the page's own image; the site's default image otherwise. */
  image?: string | null;
  type?: 'website' | 'article';
  /** The page in each language, when they differ by more than `/es` (e.g. Spanish slugs). */
  alternates?: Alternates;
  /** `title` is already the full title (the home), so the site name is not appended. */
  fullTitle?: boolean;
}

/** Tags describing the default image in `index.html`; wrong for any other image. */
const DEFAULT_IMAGE_TAGS = ['og:image:type', 'og:image:width', 'og:image:height'];

const FEED_SELECTOR = 'link[rel="alternate"][type="application/rss+xml"]';

/** Title, description, canonical URL, language versions and sharing tags of each page. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly language = inject(LanguageService);

  public set({
    title,
    description,
    path,
    image,
    type = 'website',
    alternates,
    fullTitle: isFullTitle = false,
  }: PageSeo): void {
    const lang = this.language.lang();
    const m = this.language.m();
    const versions = alternates ?? { en: localizePath(path, 'en'), es: localizePath(path, 'es') };
    const fullTitle = isFullTitle ? title : `${title} — ${SITE_NAME}`;
    // Each language version is its own canonical URL (RF-140).
    const url = `${SITE_URL}${versions[lang]}`;
    const shareImage = image || DEFAULT_SHARE_IMAGE;
    const other: Lang = lang === 'en' ? 'es' : 'en';

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:image', content: shareImage });
    // Sharing metadata declares the page language and its other version (RF-141).
    this.meta.updateTag({ property: 'og:locale', content: this.localeOf(lang) });
    this.meta.updateTag({ property: 'og:locale:alternate', content: this.localeOf(other) });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:url', content: url });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: shareImage });
    if (image) {
      this.meta.updateTag({ property: 'og:image:alt', content: title });
      DEFAULT_IMAGE_TAGS.forEach((property) => this.meta.removeTag(`property="${property}"`));
    } else {
      this.meta.updateTag({ property: 'og:image:alt', content: m.seo.defaultImageAlt });
    }
    this.link('link[rel="canonical"]', { rel: 'canonical' }).setAttribute('href', url);
    // Both versions, with English as the default for other languages (RF-137 to RF-139).
    for (const [hreflang, target] of [
      ['en', versions.en],
      ['es', versions.es],
      ['x-default', versions.en],
    ]) {
      this.link(`link[rel="alternate"][hreflang="${hreflang}"]`, {
        rel: 'alternate',
        hreflang,
      }).setAttribute('href', `${SITE_URL}${target}`);
    }
    this.language.setAlternates(versions);
    this.document.head.querySelector(FEED_SELECTOR)?.remove();
  }

  /** Declares the blog feed of the page language for feed readers (RF-109, RF-143). */
  public feedLink(): void {
    const head = this.document.head;
    if (head.querySelector(FEED_SELECTOR)) return;
    const link = this.document.createElement('link');
    link.setAttribute('rel', 'alternate');
    link.setAttribute('type', 'application/rss+xml');
    link.setAttribute('title', this.language.m().feed.title);
    link.setAttribute('href', `${SITE_URL}${this.language.href('/blog/rss.xml')}`);
    head.appendChild(link);
  }

  private localeOf(lang: Lang): string {
    return lang === 'en' ? 'en_US' : 'es_ES';
  }

  private link(selector: string, attributes: Record<string, string>): HTMLLinkElement {
    const existing = this.document.head.querySelector<HTMLLinkElement>(selector);
    if (existing) return existing;
    const link = this.document.createElement('link');
    Object.entries(attributes).forEach(([name, value]) => link.setAttribute(name, value));
    this.document.head.appendChild(link);
    return link;
  }
}
