// Safe Markdown subset for the assistant's replies (Spec 001 RF-17, plan D7). The text is
// HTML-escaped before any rule runs, so the output can only hold the tags written here; raw
// HTML in a reply is shown as text. Markers that are not closed yet (mid-reveal) stay literal.

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const LINK_ATTRS = 'target="_blank" rel="noopener noreferrer"';
const SAFE_URL = /^(?:https?:\/\/|mailto:)/i;

const FENCE = /^\s*```/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;
const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

const CODE_SPAN = /`([^`\n]+)`/g;
// The URL may hold one level of balanced parentheses, as in `javascript:alert(1)`.
const LINK = /\[([^\]\n]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;
const BOLD = /\*\*(\S(?:[^*\n]*?\S)?)\*\*/g;
const ITALIC = /(^|[^*\w])\*(\S(?:[^*\n]*?\S)?)\*(?![*\w])/g;

// Rendered spans are parked behind U+0000 markers so later rules don't touch their content;
// the input never holds U+0000, it is stripped first.
const SLOT = /\u0000(\d+)\u0000/g;

const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (char) => ESCAPES[char]);

const emphasis = (html: string): string =>
  html.replace(BOLD, '<strong>$1</strong>').replace(ITALIC, '$1<em>$2</em>');

function inline(text: string): string {
  const slots: string[] = [];
  const park = (html: string): string => `\u0000${slots.push(html) - 1}\u0000`;
  const restore = (html: string): string => html.replace(SLOT, (_, i) => restore(slots[+i]));

  const html = escapeHtml(text)
    .replace(CODE_SPAN, (_, code: string) => park(`<code>${code}</code>`))
    .replace(LINK, (_, label: string, url: string) =>
      park(
        SAFE_URL.test(url)
          ? `<a href="${url}" ${LINK_ATTRS}>${emphasis(label)}</a>`
          : emphasis(label),
      ),
    );
  return restore(emphasis(html));
}

type List = { tag: 'ul' | 'ol'; items: string[] };

/** A reply as HTML: paragraphs, line breaks, lists, code blocks, emphasis, code and links. */
export function renderChatMarkdown(markdown: string): string {
  const lines = markdown
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const out: string[] = [];
  let paragraph: string[] = [];
  let list: List | null = null;

  const flush = (): void => {
    if (paragraph.length) out.push(`<p>${paragraph.map(inline).join('<br>')}</p>`);
    if (list) {
      const items = list.items.map((item) => `<li>${inline(item)}</li>`).join('');
      out.push(`<${list.tag}>${items}</${list.tag}>`);
    }
    paragraph = [];
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (FENCE.test(line)) {
      // An unclosed fence runs to the end, so a code block keeps its look while revealed.
      flush();
      const code: string[] = [];
      while (++i < lines.length && !FENCE.test(lines[i])) code.push(lines[i]);
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      out.push(`<p><strong>${inline(heading[1])}</strong></p>`);
      continue;
    }
    const bullet = BULLET.exec(line);
    const item = bullet ?? NUMBERED.exec(line);
    if (item) {
      const tag = bullet ? 'ul' : 'ol';
      if (paragraph.length || (list as List | null)?.tag !== tag) flush();
      list ??= { tag, items: [] };
      list.items.push(item[1]);
      continue;
    }
    if (list) flush();
    paragraph.push(line.trim());
  }
  flush();
  return out.join('');
}
