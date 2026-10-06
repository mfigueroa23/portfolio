import { Lang } from '../i18n/language';

// Mirrors the API content collections. `position` is the display order set by the owner;
// projects and experience entries are ordered by recency instead (Spec 003 RF-141, RF-142).
export type ContentCollection =
  | 'experiences'
  | 'projects'
  | 'testimonials'
  | 'highlights'
  | 'social-links'
  | 'technologies'
  | 'contact-info';

interface ContentItem {
  id: number;
  /**
   * Language of the item's texts: the API returns a translated item in Spanish on Spanish
   * pages and an untranslated one entirely in English (Spec 004 RF-149 to RF-152).
   */
  lang?: Lang;
}

interface PositionedItem extends ContentItem {
  position: number;
}

export interface Experience extends ContentItem {
  period: string;
  role: string;
  company: string;
  description: string;
  technologies: string[];
  current: boolean;
  /** `YYYY-MM`, or `null` for entries created before start dates existed. */
  startDate: string | null;
  body?: string | null;
  /** Body rendered by the API (trusted HTML). */
  bodyHtml?: string | null;
}

export interface Project extends ContentItem {
  slug: string;
  /** Spanish slug; the Spanish URL uses `slug` when it is null (RF-169). */
  slugEs?: string | null;
  title: string;
  description: string;
  image: string;
  tags: string[];
  link: string | null;
  github: string | null;
  /** ISO instant of the first publication. */
  publishedAt: string;
}

export interface ProjectDetail extends Project {
  body: string | null;
  bodyHtml: string | null;
}

export interface Certification extends PositionedItem {
  name: string;
  issuer: string;
  /** Calendar date `YYYY-MM-DD`. */
  issueDate: string;
  expiryDate: string | null;
  credentialId: string | null;
  verificationUrl: string | null;
  fileUrl: string | null;
}

export interface TocEntry {
  level: 2 | 3;
  text: string;
  id: string;
}

export interface PostReference {
  title: string;
  url: string;
}

export interface PostSummary extends ContentItem {
  slug: string;
  /** Spanish slug; the Spanish URL uses `slug` when it is null (RF-169). */
  slugEs?: string | null;
  title: string;
  summary: string;
  coverUrl: string | null;
  tags: string[];
  /** ISO instant of the first publication. */
  publishedAt: string;
  readingMinutes: number;
}

export interface PostDetail extends PostSummary {
  bodyHtml: string;
  toc: TocEntry[];
  references: PostReference[];
}

export interface PostPage {
  items: PostSummary[];
  page: number;
  /** 0 when no post is published. */
  totalPages: number;
  total: number;
  /** Display name of the filtered tag. */
  tag: string | null;
}

export interface Testimonial extends PositionedItem {
  quote: string;
  author: string;
  role: string;
  /** Photo URL; `null` shows the author's initials instead (RF-87, RF-91). */
  avatar: string | null;
}

export interface Highlight extends PositionedItem {
  icon: string;
  title: string;
  description: string;
}

export interface SocialLink extends PositionedItem {
  icon: string;
  href: string;
}

export interface Technology extends PositionedItem {
  name: string;
}

export interface ContactInfo extends PositionedItem {
  icon: string;
  label: string;
  value: string;
  href: string;
}
