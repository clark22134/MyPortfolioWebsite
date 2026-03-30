import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface ProjectCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  tags: string[];
  status: 'live' | 'coming-soon' | 'in-progress';
  externalUrl?: string;
  githubUrl?: string;
}

@Component({
  selector: 'app-project-gallery',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './project-gallery.component.html',
  styleUrl: './project-gallery.component.css'
})
export class ProjectGalleryComponent {
  projects: ProjectCard[] = [
    {
      id: 'ats',
      title: 'Applicant Tracking System',
      description: 'A modern ATS with Kanban pipeline boards to move candidates through screening, interviews, offers, and onboarding.',
      icon: '👥',
      route: '',
      tags: ['Angular', 'Spring Boot', 'PostgreSQL', 'Kanban'],
      status: 'live',
      externalUrl: '/ats/',
      githubUrl: 'https://github.com/clark22134/MyPortfolioWebsite'
    },
    {
      id: 'ecommerce',
      title: 'E-Commerce Platform',
      description: 'A full-featured online store with product catalog, shopping cart, secure checkout, and order management.',
      icon: '🛒',
      route: '',
      tags: ['Angular', 'Spring Boot', 'PostgreSQL', 'Stripe'],
      status: 'live',
      externalUrl: '/ecommerce/',
      githubUrl: 'https://github.com/clark22134/MyPortfolioWebsite'
    },
    {
      id: 'ai-chatbot',
      title: 'AI Chatbot',
      description: 'An intelligent conversational assistant powered by LLMs with context awareness and memory.',
      icon: '🤖',
      route: '/projects/ai-chatbot',
      tags: ['Angular', 'Spring Boot', 'OpenAI', 'WebSocket'],
      status: 'coming-soon'
    },
    {
      id: 'real-time-analytics',
      title: 'Real-Time Analytics',
      description: 'Live dashboard with streaming data visualization, charts, and real-time updates via WebSocket.',
      icon: '📊',
      route: '/projects/real-time-analytics',
      tags: ['Angular', 'Spring Boot', 'WebSocket', 'Charts'],
      status: 'coming-soon'
    },
    {
      id: 'code-playground',
      title: 'Code Playground',
      description: 'An online IDE supporting multiple languages with syntax highlighting and live execution.',
      icon: '💻',
      route: '/projects/code-playground',
      tags: ['Angular', 'Spring Boot', 'Docker', 'Monaco Editor'],
      status: 'coming-soon'
    }
  ];
}
