import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-ai-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="chatbot-container">
      <header class="project-header">
        <a routerLink="/projects" class="back-link">← Back to Projects</a>
        <h1>🤖 AI Chatbot</h1>
        <p>An intelligent conversational assistant</p>
      </header>

      <div class="coming-soon-banner">
        <h2>🚧 Under Construction</h2>
        <p>This project is currently being developed. Check back soon!</p>
      </div>

      <!-- Placeholder for future implementation -->
      <div class="chat-preview">
        <div class="chat-window">
          <div class="message bot">
            <span class="avatar">🤖</span>
            <div class="bubble">Hello! I'm the AI assistant. How can I help you today?</div>
          </div>
          <div class="message user">
            <div class="bubble">What can you do?</div>
            <span class="avatar">👤</span>
          </div>
          <div class="message bot">
            <span class="avatar">🤖</span>
            <div class="bubble">I can answer questions, help with code, explain concepts, and have natural conversations. I'll be fully functional soon!</div>
          </div>
        </div>
        <div class="input-area disabled">
          <input type="text" placeholder="Type your message..." disabled />
          <button disabled>Send</button>
        </div>
      </div>

      <div class="tech-stack">
        <h3>Technology Stack</h3>
        <div class="tech-tags">
          <span>Angular 18</span>
          <span>Spring Boot 3</span>
          <span>OpenAI API</span>
          <span>WebSocket</span>
          <span>PostgreSQL</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chatbot-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    .project-header {
      margin-bottom: 2rem;

      .back-link {
        color: #1976d2;
        text-decoration: none;
        font-size: 0.9rem;

        &:hover {
          text-decoration: underline;
        }
      }

      h1 {
        margin: 1rem 0 0.5rem;
        font-size: 2rem;
      }

      p {
        color: #666;
      }
    }

    .coming-soon-banner {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 2rem;

      h2 {
        margin-bottom: 0.5rem;
      }
    }

    .chat-preview {
      background: #f5f5f5;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 2rem;
    }

    .chat-window {
      padding: 1.5rem;
      min-height: 300px;
    }

    .message {
      display: flex;
      align-items: flex-start;
      margin-bottom: 1rem;
      gap: 0.75rem;

      &.user {
        justify-content: flex-end;
      }

      .avatar {
        font-size: 1.5rem;
      }

      .bubble {
        background: white;
        padding: 0.75rem 1rem;
        border-radius: 12px;
        max-width: 70%;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      }

      &.user .bubble {
        background: #1976d2;
        color: white;
      }
    }

    .input-area {
      display: flex;
      padding: 1rem;
      background: white;
      border-top: 1px solid #e0e0e0;

      &.disabled {
        opacity: 0.6;
      }

      input {
        flex: 1;
        padding: 0.75rem 1rem;
        border: 1px solid #ddd;
        border-radius: 8px;
        margin-right: 0.5rem;
      }

      button {
        padding: 0.75rem 1.5rem;
        background: #1976d2;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;

        &:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      }
    }

    .tech-stack {
      h3 {
        margin-bottom: 1rem;
      }

      .tech-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;

        span {
          background: #e8f4fd;
          color: #1976d2;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
        }
      }
    }
  `]
})
export class AiChatbotComponent {}
