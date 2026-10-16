import { SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { renderChatMarkdown } from './chat-markdown';

const LINK_ATTRS = 'target="_blank" rel="noopener noreferrer"';

describe('renderChatMarkdown', () => {
  describe('safety', () => {
    it('escapes HTML instead of rendering it', () => {
      expect(renderChatMarkdown('<script>alert(1)</script>')).toBe(
        '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
      );
      expect(renderChatMarkdown('<img src=x onerror="alert(1)">')).toBe(
        '<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</p>',
      );
    });

    it('keeps entities and quotes as text', () => {
      expect(renderChatMarkdown(`Tom & Jerry's "show" &amp;`)).toBe(
        '<p>Tom &amp; Jerry&#39;s &quot;show&quot; &amp;amp;</p>',
      );
    });

    it('renders links with other schemes as their plain text', () => {
      expect(renderChatMarkdown('[click](javascript:alert(1))')).toBe('<p>click</p>');
      expect(renderChatMarkdown('[img](data:text/html;base64,PHNjcmlwdD4=)')).toBe('<p>img</p>');
      expect(renderChatMarkdown('[rel](/projects)')).toBe('<p>rel</p>');
    });

    it('escapes an attribute break-out inside a link URL', () => {
      expect(renderChatMarkdown('[x](https://a.com/"onmouseover="alert(1))')).toBe(
        `<p><a href="https://a.com/&quot;onmouseover=&quot;alert(1)" ${LINK_ATTRS}>x</a></p>`,
      );
    });
  });

  describe('inline formatting', () => {
    it('renders bold, italic and inline code', () => {
      expect(renderChatMarkdown('**Angular** and *Node.js* with `pnpm build`')).toBe(
        '<p><strong>Angular</strong> and <em>Node.js</em> with <code>pnpm build</code></p>',
      );
    });

    it('does not format inside inline code', () => {
      expect(renderChatMarkdown('`**not bold** <b>`')).toBe(
        '<p><code>**not bold** &lt;b&gt;</code></p>',
      );
    });

    it('opens http, https and mailto links in a new tab', () => {
      expect(renderChatMarkdown('See [the blog](https://marco.figueroa-sanchez.com/blog).')).toBe(
        `<p>See <a href="https://marco.figueroa-sanchez.com/blog" ${LINK_ATTRS}>the blog</a>.</p>`,
      );
      expect(renderChatMarkdown('[mail](mailto:marco@example.com)')).toBe(
        `<p><a href="mailto:marco@example.com" ${LINK_ATTRS}>mail</a></p>`,
      );
    });

    it('formats the text of a link', () => {
      expect(renderChatMarkdown('[**bold** link](https://a.com)')).toBe(
        `<p><a href="https://a.com" ${LINK_ATTRS}><strong>bold</strong> link</a></p>`,
      );
    });

    it('keeps unclosed markers as literal text', () => {
      expect(renderChatMarkdown('Marco is **a software')).toBe('<p>Marco is **a software</p>');
      expect(renderChatMarkdown('an *open marker')).toBe('<p>an *open marker</p>');
      expect(renderChatMarkdown('run `pnpm')).toBe('<p>run `pnpm</p>');
      expect(renderChatMarkdown('[the blog](https://a.c')).toBe('<p>[the blog](https://a.c</p>');
    });

    it('does not treat spaced asterisks as emphasis', () => {
      expect(renderChatMarkdown('2 * 3 * 4')).toBe('<p>2 * 3 * 4</p>');
    });
  });

  describe('blocks', () => {
    it('splits paragraphs on blank lines and keeps single line breaks', () => {
      expect(renderChatMarkdown('First line\nsecond line\n\nNew paragraph')).toBe(
        '<p>First line<br>second line</p><p>New paragraph</p>',
      );
    });

    it('renders bullet and numbered lists', () => {
      expect(renderChatMarkdown('Stack:\n- Angular\n* Node.js\n• Kubernetes')).toBe(
        '<p>Stack:</p><ul><li>Angular</li><li>Node.js</li><li>Kubernetes</li></ul>',
      );
      expect(renderChatMarkdown('1. Build\n2) Deploy')).toBe(
        '<ol><li>Build</li><li>Deploy</li></ol>',
      );
    });

    it('renders a heading line as a bold paragraph', () => {
      expect(renderChatMarkdown('### Experience\nThree years')).toBe(
        '<p><strong>Experience</strong></p><p>Three years</p>',
      );
    });

    it('renders fenced code blocks verbatim and escaped', () => {
      expect(renderChatMarkdown('Run:\n```bash\npnpm build && echo **done** <ok>\n```\nDone')).toBe(
        '<p>Run:</p><pre><code>pnpm build &amp;&amp; echo **done** &lt;ok&gt;</code></pre><p>Done</p>',
      );
    });

    it('renders an unclosed fence as a code block up to the end, as during a reveal', () => {
      expect(renderChatMarkdown('```\nline 1\nline 2')).toBe(
        '<pre><code>line 1\nline 2</code></pre>',
      );
    });

    it('normalizes Windows line breaks and returns nothing for blank text', () => {
      expect(renderChatMarkdown('a\r\nb')).toBe('<p>a<br>b</p>');
      expect(renderChatMarkdown('  \n ')).toBe('');
    });
  });

  it("survives Angular's sanitizer with link targets intact", () => {
    const sanitizer = TestBed.inject(DomSanitizer);
    const html = renderChatMarkdown(
      '**Hi** see [blog](https://a.com)\n- one\n\n```\ncode\n```\n`x`',
    );

    expect(sanitizer.sanitize(SecurityContext.HTML, html)).toBe(html);
  });
});
