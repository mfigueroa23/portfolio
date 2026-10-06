import { langFromPath, localizePath } from './language';

describe('langFromPath', () => {
  it.each([
    ['/', 'en'],
    ['/blog', 'en'],
    ['/espresso', 'en'],
    ['/projects/es', 'en'],
    ['/es', 'es'],
    ['/es/', 'es'],
    ['/es/blog/tag/angular', 'es'],
    ['/es?x=1', 'es'],
    ['/es#about', 'es'],
  ])('reads %s as %s', (path, lang) => {
    expect(langFromPath(path)).toBe(lang);
  });
});

describe('localizePath', () => {
  it.each([
    ['/', '/es'],
    ['/experience', '/es/experience'],
    ['/blog/tag/angular', '/es/blog/tag/angular'],
    ['/#about', '/es#about'],
    ['/blog?page=2', '/es/blog?page=2'],
    ['/es', '/es'],
    ['/es/blog', '/es/blog'],
  ])('puts %s under /es as %s', (path, expected) => {
    expect(localizePath(path, 'es')).toBe(expected);
  });

  it.each([
    ['/es', '/'],
    ['/es/', '/'],
    ['/es/experience', '/experience'],
    ['/es/blog/tag/angular', '/blog/tag/angular'],
    ['/es#contact', '/#contact'],
    ['/blog', '/blog'],
    ['/', '/'],
    ['/espresso', '/espresso'],
  ])('takes %s out of /es as %s', (path, expected) => {
    expect(localizePath(path, 'en')).toBe(expected);
  });
});
