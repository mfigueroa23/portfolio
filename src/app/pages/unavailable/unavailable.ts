import { Component, inject } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { HttpStatusService } from '../../core/services/http-status.service';
import { Button } from '../../components/button/button';

@Component({
  imports: [Button],
  selector: 'app-unavailable',
  templateUrl: './unavailable.html',
})
export class Unavailable {
  protected readonly language = inject(LanguageService);
  protected readonly m = this.language.m;

  constructor() {
    inject(HttpStatusService).set(503);
  }
}
