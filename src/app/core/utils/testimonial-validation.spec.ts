import { TestimonialSubmission } from '../interfaces/testimonial';
import { invalidTestimonialFields } from './testimonial-validation';

describe('invalidTestimonialFields', () => {
  const valid: TestimonialSubmission = {
    name: 'Ada Lovelace',
    role: 'CTO at Analytical Engines',
    email: 'ada@example.com',
    testimonial: 'Great to work with.',
  };
  const check = (changes: Partial<TestimonialSubmission>) =>
    invalidTestimonialFields({ ...valid, ...changes });

  it('accepts valid values', () => {
    expect(check({})).toEqual([]);
  });

  it('accepts values at their limits after trimming', () => {
    expect(
      check({
        name: `  ${'a'.repeat(100)}  `,
        role: 'r'.repeat(100),
        email: `${'e'.repeat(188)}@example.com`,
        testimonial: ` ${'t'.repeat(500)} `,
      }),
    ).toEqual([]);
  });

  it('counts characters, not UTF-16 units', () => {
    expect(check({ name: `A${'😀'.repeat(99)}` })).toEqual([]);
  });

  it.each(['name', 'role'] as const)('rejects an invalid %s (RF-14, RF-15)', (field) => {
    expect(check({ [field]: '' })).toEqual([field]);
    expect(check({ [field]: '   ' })).toEqual([field]);
    expect(check({ [field]: 'a'.repeat(101) })).toEqual([field]);
    expect(check({ [field]: 'Ada\nLovelace' })).toEqual([field]);
    expect(check({ [field]: 'Ada\rLovelace' })).toEqual([field]);
    expect(check({ [field]: '😀😀' })).toEqual([field]);
    expect(check({ [field]: '​​' })).toEqual([field]);
    expect(check({ [field]: '---' })).toEqual([field]);
  });

  it('accepts letters of any script and digits', () => {
    expect(check({ name: 'Ñandú', role: '42' })).toEqual([]);
    expect(check({ name: 'иван' })).toEqual([]);
  });

  it('rejects an invalid email (RF-16)', () => {
    expect(check({ email: '' })).toEqual(['email']);
    expect(check({ email: 'ada' })).toEqual(['email']);
    expect(check({ email: 'ada@example' })).toEqual(['email']);
    expect(check({ email: 'a da@example.com' })).toEqual(['email']);
    expect(check({ email: `${'e'.repeat(189)}@example.com` })).toEqual(['email']);
  });

  it('rejects an invalid testimonial (RF-17)', () => {
    expect(check({ testimonial: '' })).toEqual(['testimonial']);
    expect(check({ testimonial: '  \n ' })).toEqual(['testimonial']);
    expect(check({ testimonial: 't'.repeat(501) })).toEqual(['testimonial']);
  });

  it('accepts line breaks inside the testimonial', () => {
    expect(check({ testimonial: 'First line.\nSecond line.' })).toEqual([]);
  });

  it('lists every invalid field in form order', () => {
    expect(invalidTestimonialFields({ name: '', role: '', email: '', testimonial: '' })).toEqual([
      'name',
      'role',
      'email',
      'testimonial',
    ]);
  });
});
