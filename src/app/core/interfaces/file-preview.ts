// File preview (Spec 008): the dialog shared by the resume and certificate previews.
import { Lang } from '../i18n/language';

/** A loaded file the preview can draw: a PDF, or an image the browser decodes. */
export interface PreviewFile {
  kind: 'pdf' | 'image';
  /** The response's content type, without parameters. */
  mime: string;
  data: Uint8Array<ArrayBuffer>;
}

/** Why a preview shows an error: 404, anything else, no answer in time, or a file it cannot draw. */
export type PreviewFailure = 'not-found' | 'generic' | 'timeout' | 'unsupported';

/** Outcome of one load; loaders never throw. */
export type PreviewResult = { ok: true; file: PreviewFile } | { ok: false; reason: PreviewFailure };

/** The dialog texts both dictionary blocks share (plan 008 D1). */
export interface PreviewTexts {
  close: string;
  download: string;
  downloadLabel: string;
  retry: string;
  loading: string;
  page: (page: number, total: number) => string;
  errors: { notFound: string; generic: string; timeout: string; unsupported?: string };
}

/** What a preview dialog opens: its title, texts, loader and download name (plan 008 D1). */
export interface PreviewSource {
  title: string;
  /** Set when the file is in another language than the page (Spec 008 RF-07). */
  lang: Lang | null;
  texts: PreviewTexts;
  load: (signal: AbortSignal) => Promise<PreviewResult>;
  fileName: (file: PreviewFile) => string;
  /** The failure shown when the loaded file cannot be drawn. */
  renderFailure: PreviewFailure;
}
