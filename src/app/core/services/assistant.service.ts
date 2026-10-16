import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { AGENT_URL } from '../config/agent';
import { AgentChatRequest, AgentChatResponse, AgentResult } from '../interfaces/assistant';

/** How long a reply may take before the request is aborted (Spec 001 RF-28). */
export const REPLY_TIMEOUT_MS = 30_000;

/** Statuses on which the agent explains the failure in `respuesta` (RF-26). */
const AGENT_ERROR_STATUSES = [500, 503];

const GENERIC: AgentResult = { ok: false, reason: 'generic' };

/** The non-blank `respuesta` of a body, or `null` for anything else (HTML, other shapes). */
function respuestaOf(body: unknown): string | null {
  const text = (body as Partial<AgentChatResponse> | null)?.respuesta;
  return typeof text === 'string' && text.trim() ? text : null;
}

/** Talks to the personal assistant API (`POST {AGENT_URL}/chat`). */
@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly http = inject(HttpClient);

  /**
   * Sends one message of the conversation `chatId`. Resolves with the outcome and never rejects
   * (plan D5): the agent's text on 500/503, a generic failure for any other error, including
   * network and CORS failures (RF-27), and a timeout once the request is aborted (RF-28).
   */
  public async send(chatId: string, message: string): Promise<AgentResult> {
    const body: AgentChatRequest = { chat_id: chatId, mensaje: message };
    try {
      const response = await firstValueFrom(
        this.http
          .post<AgentChatResponse>(`${AGENT_URL}/chat`, body)
          .pipe(timeout(REPLY_TIMEOUT_MS)),
      );
      const text = respuestaOf(response);
      return text ? { ok: true, text } : GENERIC;
    } catch (error) {
      if (error instanceof TimeoutError) return { ok: false, reason: 'timeout' };
      if (error instanceof HttpErrorResponse && AGENT_ERROR_STATUSES.includes(error.status)) {
        const text = respuestaOf(error.error);
        if (text) return { ok: false, reason: 'api', text };
      }
      return GENERIC;
    }
  }
}
