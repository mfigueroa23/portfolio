import { initials } from './initials';

describe('initials', () => {
  it.each([
    ['Ana María López', 'AL'],
    ['Jean-Luc Picard', 'JP'],
    ['María de la Cruz', 'MC'],
    ['Prince', 'P'],
    ['álvaro núñez', 'ÁN'],
  ])('turns "%s" into "%s" (RF-92)', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });

  it('ignores extra spaces around and between words', () => {
    expect(initials('  ada   lovelace ')).toBe('AL');
  });

  it('keeps an emoji or a digit that starts a word whole', () => {
    expect(initials('🚀 Rocket')).toBe('🚀R');
    expect(initials('Agent 007')).toBe('A0');
  });

  it('keeps non-Latin letters', () => {
    expect(initials('иван петров')).toBe('ИП');
    expect(initials('Ørjan Ødegaard')).toBe('ØØ');
  });

  it('returns an empty string for an empty name', () => {
    expect(initials('   ')).toBe('');
  });
});
