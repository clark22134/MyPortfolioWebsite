import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { ChatbotService } from './chatbot.service';

/**
 * Build a Response whose body streams the supplied UTF-8 chunks.
 */
function sseResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i++]));
      } else {
        controller.close();
      }
    },
  });
  return new Response(stream, { status });
}

/** Yield to both micro- and macrotask queues so chained .then()s and
 *  body-stream reads (Response.json()) settle. */
async function flushAsync(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

describe('ChatbotService', () => {
  let service: ChatbotService;
  let fetchSpy: Mock;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatbotService);
    fetchSpy = vi.fn();
    (window as any).fetch = fetchSpy;
  });

  it('starts with a greeting message and unknown availability', () => {
    expect(service.messages().length).toBe(1);
    expect(service.messages()[0].role).toBe('assistant');
    expect(service.streaming()).toBe(false);
    expect(service.available()).toBeNull();
  });

  describe('checkHealth', () => {
    it('flips available() to true when the backend reports ready', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ available: true }), { status: 200 }),
      );
      service.checkHealth();
      await flushAsync();
      expect(service.available()).toBe(true);
    });

    it('flips available() to false when fetch rejects', async () => {
      fetchSpy.mockRejectedValue(new Error('network down'));
      service.checkHealth();
      await flushAsync();
      expect(service.available()).toBe(false);
    });

    it('flips available() to false when the backend returns non-OK', async () => {
      fetchSpy.mockResolvedValue(new Response('nope', { status: 503 }));
      service.checkHealth();
      await flushAsync();
      expect(service.available()).toBe(false);
    });
  });

  describe('send', () => {
    it('appends a user + assistant message, accumulates tokens and citations from SSE', async () => {
      const citations = [
        { index: 1, title: 'About', section: 'About', source: 'home' },
      ];
      fetchSpy.mockResolvedValue(
        sseResponse([
          'event: token\ndata: Hello',
          ' world\n\nevent: citations\ndata: ' + JSON.stringify(citations) + '\n\n',
          'event: done\ndata: \n\n',
        ]),
      );

      // lastValueFrom resolves on completion, which fires inside `.finally()`
      // after the SSE stream has been fully drained and `streaming()` has
      // been flipped back to false.
      await lastValueFrom(service.send('Tell me about Clark'), {
        defaultValue: undefined,
      });

      const list = service.messages();
      // greeting + user + assistant
      expect(list.length).toBe(3);
      expect(list[1].role).toBe('user');
      expect(list[1].content).toBe('Tell me about Clark');
      const assistant = list[2];
      expect(assistant.role).toBe('assistant');
      expect(assistant.content).toContain('Hello');
      expect(assistant.citations).toEqual(citations);
      expect(assistant.pending).toBe(false);
      expect(service.streaming()).toBe(false);
    });

    it('is a no-op when text is blank', async () => {
      await firstValueFrom(service.send('   '), { defaultValue: undefined });
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(service.messages().length).toBe(1);
    });

    it('marks the assistant message as errored when fetch rejects', async () => {
      fetchSpy.mockRejectedValue(new Error('boom'));
      await lastValueFrom(service.send('hello'), { defaultValue: undefined });

      const assistant = service.messages()[2];
      expect(assistant.error).toBe(true);
      expect(assistant.pending).toBe(false);
      expect(assistant.content).toContain("couldn't reach");
      expect(service.streaming()).toBe(false);
    });

    it('marks the assistant message as errored when the backend returns non-2xx', async () => {
      fetchSpy.mockResolvedValue(new Response('rate limited', { status: 429 }));
      await lastValueFrom(service.send('hello'), { defaultValue: undefined });

      const assistant = service.messages()[2];
      expect(assistant.error).toBe(true);
      expect(service.streaming()).toBe(false);
    });
  });

  describe('reset', () => {
    it('keeps the greeting and discards everything else', async () => {
      fetchSpy.mockResolvedValue(
        sseResponse(['event: token\ndata: hi\n\nevent: done\ndata: \n\n']),
      );
      await lastValueFrom(service.send('something'), { defaultValue: undefined });
      expect(service.messages().length).toBe(3);

      service.reset();
      expect(service.messages().length).toBe(1);
      expect(service.messages()[0].role).toBe('assistant');
    });
  });
});
