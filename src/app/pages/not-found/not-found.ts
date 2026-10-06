import { Component, inject } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { HttpStatusService } from '../../core/services/http-status.service';
import { Button } from '../../components/button/button';

@Component({
  imports: [Button],
  selector: 'app-not-found',
  templateUrl: './not-found.html',
})
export class NotFound {
  protected readonly language = inject(LanguageService);
  protected readonly m = this.language.m;

  constructor() {
    inject(HttpStatusService).set(404);
  }
}
