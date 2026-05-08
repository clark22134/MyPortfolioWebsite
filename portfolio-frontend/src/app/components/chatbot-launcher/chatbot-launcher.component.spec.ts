import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { createSpyObj, type SpyObj } from '../../../test-helpers';
import { ChatbotLauncherComponent } from './chatbot-launcher.component';
import { ChatbotService, ChatMessage } from '../../services/chatbot.service';

describe('ChatbotLauncherComponent', () => {
  let fixture: ComponentFixture<ChatbotLauncherComponent>;
  let component: ChatbotLauncherComponent;
  let messagesSig: ReturnType<typeof signal<ChatMessage[]>>;
  let streamingSig: ReturnType<typeof signal<boolean>>;
  let availableSig: ReturnType<typeof signal<boolean | null>>;
  let chatbotSpy: SpyObj<ChatbotService>;

  beforeEach(async () => {
    messagesSig = signal<ChatMessage[]>([
      { id: 'g', role: 'assistant', content: 'hi', timestamp: 0 },
    ]);
    streamingSig = signal(false);
    availableSig = signal<boolean | null>(true);

    chatbotSpy = createSpyObj<ChatbotService>(
      'ChatbotService',
      ['checkHealth', 'send', 'reset'],
      {
        messages: messagesSig as any,
        streaming: streamingSig as any,
        available: availableSig as any,
      },
    );
    chatbotSpy.send.mockReturnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [ChatbotLauncherComponent],
      providers: [{ provide: ChatbotService, useValue: chatbotSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatbotLauncherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('is created and probes health on init', () => {
    expect(component).toBeTruthy();
    expect(chatbotSpy.checkHealth).toHaveBeenCalledTimes(1);
  });

  it('toggle() opens and closes the panel', () => {
    expect((component as any).open).toBe(false);
    (component as any).toggle();
    expect((component as any).open).toBe(true);
    (component as any).toggle();
    expect((component as any).open).toBe(false);
  });

  it('send() with empty draft is a no-op', () => {
    (component as any).draft = '   ';
    (component as any).send();
    expect(chatbotSpy.send).not.toHaveBeenCalled();
  });

  it('send() trims and forwards to the chatbot service, clearing the draft', () => {
    (component as any).draft = '  hello clark  ';
    (component as any).send();
    expect(chatbotSpy.send).toHaveBeenCalledWith('hello clark');
    expect((component as any).draft).toBe('');
  });

  it('does not send while a stream is in flight', () => {
    streamingSig.set(true);
    (component as any).draft = 'hi';
    (component as any).send();
    expect(chatbotSpy.send).not.toHaveBeenCalled();
  });

  it('does not send when the backend is unavailable', () => {
    availableSig.set(false);
    (component as any).draft = 'hi';
    (component as any).send();
    expect(chatbotSpy.send).not.toHaveBeenCalled();
  });

  it('reset() delegates to the service', () => {
    (component as any).reset();
    expect(chatbotSpy.reset).toHaveBeenCalled();
  });

  it('Enter (without shift) submits and prevents default', () => {
    (component as any).draft = 'hi';
    const evt = new KeyboardEvent('keydown', { key: 'Enter' });
    const prevent = vi.spyOn(evt, 'preventDefault');
    (component as any).onKeydown(evt);
    expect(prevent).toHaveBeenCalled();
    expect(chatbotSpy.send).toHaveBeenCalledWith('hi');
  });

  it('Shift+Enter does not submit', () => {
    (component as any).draft = 'hi';
    const evt = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
    (component as any).onKeydown(evt);
    expect(chatbotSpy.send).not.toHaveBeenCalled();
  });

  it('Escape closes the panel', () => {
    (component as any).open = true;
    (component as any).onEscape();
    expect((component as any).open).toBe(false);
  });

  it('renderMarkdown returns HTML for non-empty input and empty string otherwise', () => {
    expect((component as any).renderMarkdown('')).toBe('');
    const html = (component as any).renderMarkdown('**bold**') as string;
    expect(html).toContain('<strong>bold</strong>');
  });

  it('disabled() is true while streaming', () => {
    streamingSig.set(true);
    expect((component as any).disabled()).toBe(true);
  });

  it('disabled() is true when backend unavailable', () => {
    streamingSig.set(false);
    availableSig.set(false);
    expect((component as any).disabled()).toBe(true);
  });
});
