import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Citation returned by the backend matching the bracketed numbers in
 * the streamed answer (e.g. "[1]").
 */
export interface ChatCitation {
  index: number;
  title: string;
  section: string;
  source: string;
}

/**
 * Single message stored in the chatbot UI.
 *
 * Streaming assistant messages mutate `content` in place as tokens arrive.
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: ChatCitation[];
  pending?: boolean;
  error?: boolean;
  timestamp: number;
}

/**
 * Client for the portfolio assistant.
 *
 * Uses the Fetch + ReadableStream API directly (rather than EventSource)
 * because we need to POST a JSON body to /api/chatbot/stream. This matches
 * the SSE wire format produced by Spring's SseEmitter.
 *
 * State:
 *  - `available()` — health flag (false until /health responds true).
 *  - `messages()`  — reactive ordered list of messages for the UI.
 *  - `streaming()` — true while a response is in flight.
 */
@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly baseUrl = '/api/chatbot';
  private conversationId = this.makeId();

  readonly messages = signal<ChatMessage[]>([
    {
      id: this.makeId(),
      role: 'assistant',
      content:
        "Hi! I'm Clark's portfolio assistant. Ask me anything about his projects, " +
        'experience, technologies, accessibility work, or AI projects.',
      timestamp: Date.now(),
    },
  ]);
  readonly streaming = signal(false);
  readonly available = signal<boolean | null>(null);

  /** Probe the backend so the launcher can show a degraded state. */
  checkHealth(): void {
    fetch(`${this.baseUrl}/health`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((j) => this.available.set(!!j.available))
      .catch(() => this.available.set(false));
  }

  reset(): void {
    this.conversationId = this.makeId();
    this.messages.set([this.messages()[0]]);
  }

  /**
   * Send a message and stream the response.
   * Returns an Observable so the caller can also unsubscribe / ignore it.
   */
  send(text: string): Observable<void> {
    const trimmed = text.trim();
    return new Observable((subscriber) => {
      if (!trimmed || this.streaming()) {
        subscriber.complete();
        return;
      }

      const userMsg: ChatMessage = {
        id: this.makeId(),
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };
      const assistantMsg: ChatMessage = {
        id: this.makeId(),
        role: 'assistant',
        content: '',
        pending: true,
        timestamp: Date.now(),
      };
      this.messages.update((list) => [...list, userMsg, assistantMsg]);
      this.streaming.set(true);

      const controller = new AbortController();

      fetch(`${this.baseUrl}/stream`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ message: trimmed, conversationId: this.conversationId }),
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok || !response.body) {
            throw new Error(`HTTP ${response.status}`);
          }
          return this.consumeSse(response.body, assistantMsg.id);
        })
        .then(() => subscriber.next())
        .catch((err) => {
          this.patchMessage(assistantMsg.id, (m) => {
            m.pending = false;
            m.error = true;
            if (!m.content) {
              m.content =
                err?.name === 'AbortError'
                  ? 'Stopped.'
                  : "Sorry, I couldn't reach the assistant. Please try again.";
            }
          });
        })
        .finally(() => {
          this.streaming.set(false);
          this.patchMessage(assistantMsg.id, (m) => (m.pending = false));
          subscriber.complete();
        });

      return () => controller.abort();
    });
  }

  // ---------- internals ----------

  private async consumeSse(body: ReadableStream<Uint8Array>, msgId: string): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Per the SSE spec, events are separated by a blank line. Each event has
    // optional `event:` and `data:` lines. Our backend emits:
    //   event: token   -> data is a raw text fragment
    //   event: citations -> data is JSON array
    //   event: done    -> data empty
    //   event: error   -> data is a string
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        this.handleSseEvent(rawEvent, msgId);
      }
    }
  }

  private handleSseEvent(raw: string, msgId: string): void {
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of raw.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      // Do NOT strip the leading character after 'data:' — OpenAI token chunks
      // frequently start with a space (e.g. " context") that carries the
      // inter-word gap. Stripping it causes words to concatenate with no spaces.
      else if (line.startsWith('data:')) dataLines.push(line.slice(5));
    }
    const data = dataLines.join('\n');

    if (event === 'token') {
      this.patchMessage(msgId, (m) => {
        m.content += data;
        m.pending = false;
      });
    } else if (event === 'citations') {
      try {
        const citations: ChatCitation[] = JSON.parse(data);
        this.patchMessage(msgId, (m) => (m.citations = citations));
      } catch {
        /* ignore malformed citation payload */
      }
    } else if (event === 'error') {
      this.patchMessage(msgId, (m) => {
        m.error = true;
        m.pending = false;
        if (!m.content) m.content = data || 'Something went wrong.';
      });
    }
  }

  private patchMessage(id: string, mutate: (m: ChatMessage) => void): void {
    this.messages.update((list) =>
      list.map((m) => {
        if (m.id !== id) return m;
        const next = { ...m };
        mutate(next);
        return next;
      }),
    );
  }

  private makeId(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}
