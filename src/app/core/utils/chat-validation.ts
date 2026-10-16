/** The agent API's limit for `mensaje` (`Field(min_length=1, max_length=2000)`, Spec 001 RF-12). */
export const MAX_MESSAGE_LENGTH = 2000;

export interface MessageCheck {
  /** What is sent: the message without surrounding whitespace. */
  text: string;
  /** Characters of `text`, counted as code points like Pydantic, so an emoji is one. */
  length: number;
  tooLong: boolean;
  canSend: boolean;
}

/** Mirrors the API rules on the trimmed message (RF-11, RF-12); the API still validates it. */
export function checkMessage(value: string): MessageCheck {
  const text = value.trim();
  const length = Array.from(text).length;
  const tooLong = length > MAX_MESSAGE_LENGTH;
  return { text, length, tooLong, canSend: length > 0 && !tooLong };
}
