import { Component, inject } from '@angular/core';
import { HttpStatusService } from '../../core/services/http-status.service';
import { Button } from '../../components/button/button';

@Component({
  imports: [Button],
  selector: 'app-not-found',
  templateUrl: './not-found.html',
})
export class NotFound {
  constructor() {
    inject(HttpStatusService).set(404);
  }
}
