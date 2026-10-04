import { PostSummary } from '../app/core/interfaces/content';

const TITLE = 'Marco Figueroa — Blog';
const DESCRIPTION = 'Write-ups on building, deploying and running software.';

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

function item(post: PostSummary, siteUrl: string): string {
  const link = `${siteUrl}/blog/${post.slug}`;
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
 * (RF-107); a valid channel without items when nothing is published (RF-108).
 */
export function buildRssFeed(posts: PostSummary[], siteUrl: string): string {
  const blog = `${siteUrl}/blog`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(TITLE)}</title>
    <link>${escapeXml(blog)}</link>
    <description>${escapeXml(DESCRIPTION)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(`${blog}/rss.xml`)}" rel="self" type="application/rss+xml"/>${posts
      .map((post) => item(post, siteUrl))
      .join('')}
  </channel>
</rss>
`;
}
