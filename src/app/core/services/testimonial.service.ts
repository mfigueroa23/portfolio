import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../config/api';
import { ApiMessage } from '../interfaces/contact';
import { TestimonialSubmission } from '../interfaces/testimonial';
import { apiErrorText } from '../utils/api-error';

@Injectable({ providedIn: 'root' })
export class TestimonialService {
  private readonly http = inject(HttpClient);

  /** Resolves with the API's success text; rejects with the text to show the visitor. */
  public async submit(values: TestimonialSubmission): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiMessage>(`${API_URL}/testimonials`, values),
      );
      return response.message;
    } catch (error) {
      throw new Error(apiErrorText(error));
    }
  }
}
