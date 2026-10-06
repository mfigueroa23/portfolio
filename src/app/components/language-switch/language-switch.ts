import { Component, inject } from '@angular/core';
import { Lang } from '../../core/i18n/language';
import { LanguageService } from '../../core/i18n/language.service';

/**
 * "EN" / "ES" links to this page in each language (RF-121 to RF-126). Plain links, so they work
 * before hydration and without JavaScript; a click also remembers the choice for nginx.
 */
@Component({
  selector: 'app-language-switch',
  templateUrl: './language-switch.html',
})
export class LanguageSwitch {
  protected readonly language = inject(LanguageService);
  protected readonly options: { lang: Lang; label: string }[] = [
    { lang: 'en', label: 'EN' },
    { lang: 'es', label: 'ES' },
  ];
}
