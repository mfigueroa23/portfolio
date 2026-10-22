import { API_URL, isApiUrl, resolveApiUrl } from './api';

describe('resolveApiUrl', () => {
  it('falls back to the production API when the value is not set', () => {
    expect(resolveApiUrl(undefined)).toBe('https://api.figueroa-sanchez.com');
  });

  it('falls back to the production API when the value is empty or blank', () => {
    expect(resolveApiUrl('')).toBe('https://api.figueroa-sanchez.com');
    expect(resolveApiUrl('   ')).toBe('https://api.figueroa-sanchez.com');
  });

  it('uses the given URL without surrounding spaces or trailing slashes', () => {
    expect(resolveApiUrl('http://localhost:3000/')).toBe('http://localhost:3000');
    expect(resolveApiUrl(' http://localhost:3000// ')).toBe('http://localhost:3000');
    expect(resolveApiUrl('https://api.example.com')).toBe('https://api.example.com');
  });
});

describe('API_URL', () => {
  it('uses the production API when the build defines no NG_API_URL', () => {
    expect(API_URL).toBe('https://api.figueroa-sanchez.com');
  });
});

describe('isApiUrl (Spec 008, plan D9)', () => {
  it('accepts a URL on the API origin, with a path and a query (U-API-1, RF-01)', () => {
    expect(isApiUrl('https://api.figueroa-sanchez.com/files/cert-1')).toBe(true);
    expect(isApiUrl('https://api.figueroa-sanchez.com:443/files/cert-1?v=2')).toBe(true);
  });

  it.each([
    'https://example.com/files/cert-1',
    'https://api.figueroa-sanchez.com.evil.tld/files/cert-1',
    'http://api.figueroa-sanchez.com/files/cert-1',
    'https://api.figueroa-sanchez.com:8443/files/cert-1',
  ])('rejects %s, on another origin (U-API-2, RF-02)', (url) => {
    expect(isApiUrl(url)).toBe(false);
  });

  it.each(['/files/cert-1', 'not a url', ''])('rejects %j (U-API-3, RF-02)', (url) => {
    expect(isApiUrl(url)).toBe(false);
  });
});
