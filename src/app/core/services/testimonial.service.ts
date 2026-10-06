import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../config/api';
import { LanguageService } from '../i18n/language.service';
import { ApiMessage } from '../interfaces/contact';
import { TestimonialSubmission } from '../interfaces/testimonial';
import { apiErrorText } from '../utils/api-error';

@Injectable({ providedIn: 'root' })
export class TestimonialService {
  private readonly http = inject(HttpClient);
  private readonly language = inject(LanguageService);

  /**
   * Resolves with the API's success text; rejects with the text to show the visitor. `lang`
   * makes the API answer in the page language (RF-177, RF-178).
   */
  public async submit(values: TestimonialSubmission): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiMessage>(`${API_URL}/testimonials?lang=${this.language.lang()}`, values),
      );
      return response.message;
    } catch (error) {
      throw new Error(apiErrorText(error, this.language.m().forms.sendError));
    }
  }
}
