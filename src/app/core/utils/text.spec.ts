import { accentTitle, tagKey } from './text';

describe('tagKey', () => {
  it('lowercases the tag and replaces spaces with hyphens', () => {
    expect(tagKey('Next JS')).toBe('next-js');
    expect(tagKey(' Angular ')).toBe('angular');
    expect(tagKey('Cloud  Native')).toBe('cloud-native');
  });
});

describe('accentTitle', () => {
  it('splits off the last word', () => {
    expect(accentTitle('Portfolio platform')).toEqual({ lead: 'Portfolio', accent: 'platform' });
  });

  it('keeps a one-word title whole', () => {
    expect(accentTitle('Portfolio')).toEqual({ lead: 'Portfolio', accent: '' });
  });
});
