import { Component, inject } from '@angular/core';
import { HttpStatusService } from '../../core/services/http-status.service';
import { Button } from '../../components/button/button';

@Component({
  imports: [Button],
  selector: 'app-unavailable',
  templateUrl: './unavailable.html',
})
export class Unavailable {
  constructor() {
    inject(HttpStatusService).set(503);
  }
}
