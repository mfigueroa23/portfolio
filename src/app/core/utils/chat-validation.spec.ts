import { checkMessage, MAX_MESSAGE_LENGTH } from './chat-validation';

describe('checkMessage', () => {
  it('mirrors the agent API limit of 2000 characters', () => {
    expect(MAX_MESSAGE_LENGTH).toBe(2000);
  });

  it('cannot send an empty or whitespace-only message', () => {
    for (const value of ['', '   ', '\n\t ']) {
      expect(checkMessage(value)).toEqual({ text: '', length: 0, tooLong: false, canSend: false });
    }
  });

  it('sends the trimmed text and counts its length after trimming', () => {
    expect(checkMessage('  Hi Marco \n')).toEqual({
      text: 'Hi Marco',
      length: 8,
      tooLong: false,
      canSend: true,
    });
  });

  it('accepts 1 and 2000 characters and blocks 2001', () => {
    expect(checkMessage('a').canSend).toBe(true);
    expect(checkMessage('a'.repeat(2000))).toMatchObject({ length: 2000, canSend: true });
    expect(checkMessage('a'.repeat(2001))).toMatchObject({
      length: 2001,
      tooLong: true,
      canSend: false,
    });
  });

  it('ignores surrounding spaces when checking the limit', () => {
    expect(checkMessage(`  ${'a'.repeat(2000)}  `).canSend).toBe(true);
  });

  it('counts code points like the API, so an emoji is one character', () => {
    expect(checkMessage('👋').length).toBe(1);
    expect(checkMessage('👋'.repeat(2000)).canSend).toBe(true);
    expect(checkMessage('👋'.repeat(2001)).tooLong).toBe(true);
  });
});
