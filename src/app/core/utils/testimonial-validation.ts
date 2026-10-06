import { TestimonialField, TestimonialSubmission } from '../interfaces/testimonial';

// Same rules as the API's `SubmitTestimonialDto` (RF-14 to RF-17). Lengths count code points,
// like class-validator's `Length`.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const LINE_BREAK = /[\r\n]/;

const length = (value: string): number => Array.from(value).length;

const isValidLine = (value: string): boolean =>
  length(value) >= 1 &&
  length(value) <= 100 &&
  !LINE_BREAK.test(value) &&
  LETTER_OR_DIGIT.test(value);

const rules: Record<TestimonialField, (value: string) => boolean> = {
  name: isValidLine,
  role: isValidLine,
  email: (value) => length(value) <= 200 && EMAIL_PATTERN.test(value),
  testimonial: (value) => length(value) >= 1 && length(value) <= 500,
};

/** Fields whose trimmed value breaks the API rules, in form order. */
export function invalidTestimonialFields(values: TestimonialSubmission): TestimonialField[] {
  return (Object.keys(rules) as TestimonialField[]).filter(
    (field) => !rules[field](values[field].trim()),
  );
}
