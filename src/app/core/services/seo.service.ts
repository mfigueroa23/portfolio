import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DEFAULT_SHARE_IMAGE, SITE_NAME, SITE_URL } from '../config/site';

export interface PageSeo {
  title: string;
  description: string;
  /** Path of the page's canonical URL, starting with `/`. */
  path: string;
  /** Absolute URL of the page's own image; the site's default image otherwise. */
  image?: string | null;
  type?: 'website' | 'article';
}

/** Tags describing the default image in `index.html`; wrong for any other image. */
const DEFAULT_IMAGE_TAGS = ['og:image:type', 'og:image:width', 'og:image:height'];

/** Title, description, canonical URL and sharing tags of server-rendered pages. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  public set({ title, description, path, image, type = 'website' }: PageSeo): void {
    const fullTitle = `${title} — ${SITE_NAME}`;
    const url = `${SITE_URL}${path}`;
    const shareImage = image || DEFAULT_SHARE_IMAGE;

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:image', content: shareImage });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:url', content: url });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: shareImage });
    if (image) {
      this.meta.updateTag({ property: 'og:image:alt', content: title });
      DEFAULT_IMAGE_TAGS.forEach((property) => this.meta.removeTag(`property="${property}"`));
    }
    this.link('canonical').setAttribute('href', url);
    this.document.head.querySelector('link[rel="alternate"][type="application/rss+xml"]')?.remove();
  }

  /** Declares the blog feed for feed readers (RF-109). */
  public feedLink(): void {
    const head = this.document.head;
    if (head.querySelector('link[rel="alternate"][type="application/rss+xml"]')) return;
    const link = this.document.createElement('link');
    link.setAttribute('rel', 'alternate');
    link.setAttribute('type', 'application/rss+xml');
    link.setAttribute('title', `${SITE_NAME} — Blog`);
    link.setAttribute('href', `${SITE_URL}/blog/rss.xml`);
    head.appendChild(link);
  }

  private link(rel: string): HTMLLinkElement {
    const existing = this.document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (existing) return existing;
    const link = this.document.createElement('link');
    link.setAttribute('rel', rel);
    this.document.head.appendChild(link);
    return link;
  }
}
