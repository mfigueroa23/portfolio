/** Body of `POST /testimonials`; the API validates it again (RF-14 to RF-17). */
export interface TestimonialSubmission {
  name: string;
  role: string;
  email: string;
  testimonial: string;
  /** Honeypot field; the API silently discards the submission when it is not empty. */
  website?: string;
}

export type TestimonialField = 'name' | 'role' | 'email' | 'testimonial';
