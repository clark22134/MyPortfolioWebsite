import { Routes } from '@angular/router';

export const AI_CHATBOT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./ai-chatbot.component')
      .then(m => m.AiChatbotComponent)
  }
];
