import { Lang, localizePath } from '../app/core/i18n/language';
import { en } from '../app/core/i18n/messages.en';
import { es } from '../app/core/i18n/messages.es';
import { PostSummary } from '../app/core/interfaces/content';

const FEEDS = { en: en.feed, es: es.feed };

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** RFC 822 date with a numeric UTC offset, e.g. `Sat, 03 Oct 2026 23:30:00 +0000`. */
function rfc822(iso: string): string {
  return new Date(iso).toUTCString().replace('GMT', '+0000');
}

function item(post: PostSummary, siteUrl: string, lang: Lang): string {
  // Spanish items link to their Spanish URL, with the English slug as fallback (RF-144).
  const slug = lang === 'es' ? (post.slugEs ?? post.slug) : post.slug;
  const link = `${siteUrl}${localizePath(`/blog/${slug}`, lang)}`;
  const categories = post.tags.map((tag) => `\n      <category>${escapeXml(tag)}</category>`);
  return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(post.summary)}</description>
      <pubDate>${rfc822(post.publishedAt)}</pubDate>${categories.join('')}
    </item>`;
}

/**
 * RSS 2.0 feed of the given posts (the API's latest 20, newest first) with absolute links
 * (RF-107); a valid channel without items when nothing is published (RF-108). The Spanish feed
 * lives at `/es/blog/rss.xml` with a Spanish channel (Spec 004 RF-143).
 */
export function buildRssFeed(posts: PostSummary[], siteUrl: string, lang: Lang = 'en'): string {
  const blog = `${siteUrl}${localizePath('/blog', lang)}`;
  const { title, description } = FEEDS[lang];
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(blog)}</link>
    <description>${escapeXml(description)}</description>
    <language>${lang}</language>
    <atom:link href="${escapeXml(`${blog}/rss.xml`)}" rel="self" type="application/rss+xml"/>${posts
      .map((post) => item(post, siteUrl, lang))
      .join('')}
  </channel>
</rss>
`;
}
