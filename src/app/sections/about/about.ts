import { Component, inject } from '@angular/core';
import { Highlight } from '../../core/interfaces/content';
import { LanguageService } from '../../core/i18n/language.service';
import { ContentService } from '../../core/services/content.service';

@Component({
  imports: [],
  selector: 'app-about',
  styleUrl: './about.css',
  templateUrl: './about.html',
})
export class About {
  protected readonly language = inject(LanguageService);
  protected readonly m = this.language.m;
  public readonly highlights = inject(ContentService).collection<Highlight>('highlights');
}
