import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavComponent } from '../nav/nav.component';

interface DocEntry {
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: string;
}

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [CommonModule, RouterModule, NavComponent],
  templateUrl: './documentation.component.html',
  styleUrl: './documentation.component.css'
})
export class DocumentationComponent {
  categories = [
    {
      name: 'Architecture & Design',
      docs: [
        {
          slug: 'SYSTEM_OVERVIEW',
          title: 'System Overview',
          description: 'High-level overview of the entire portfolio platform, its modules, and how they interconnect.',
          icon: '🗺️'
        },
        {
          slug: 'ARCHITECTURE',
          title: 'Architecture',
          description: 'Detailed system architecture with Mermaid diagrams covering frontend, backend, database, and cloud layers.',
          icon: '🏗️'
        },
        {
          slug: 'UNIFIED_ARCHITECTURE',
          title: 'Unified Architecture',
          description: 'Consolidated architectural view across all portfolio sub-projects and shared infrastructure.',
          icon: '🔗'
        },
        {
          slug: 'UML_DIAGRAMS',
          title: 'UML Diagrams',
          description: 'Class diagrams, sequence diagrams, and other UML models rendered with Mermaid.',
          icon: '📐'
        },
        {
          slug: 'TECHNICAL_DESIGN_DECISIONS',
          title: 'Technical Design Decisions',
          description: 'Rationale behind key technology choices, trade-offs, and architectural patterns.',
          icon: '⚖️'
        }
      ]
    },
    {
      name: 'Development & API',
      docs: [
        {
          slug: 'API_DOCUMENTATION',
          title: 'API Documentation',
          description: 'RESTful API endpoints, request/response schemas, authentication flows, and usage examples.',
          icon: '📡'
        },
        {
          slug: 'TESTING_STRATEGY',
          title: 'Testing Strategy',
          description: 'Unit, integration, E2E, and accessibility testing approaches and tooling.',
          icon: '🧪'
        },
        {
          slug: 'PROJECT_HIGHLIGHTS',
          title: 'Project Highlights',
          description: 'Key features, accomplishments, and technical showcases across the portfolio.',
          icon: '⭐'
        }
      ]
    },
    {
      name: 'Infrastructure & Security',
      docs: [
        {
          slug: 'DEVOPS_INFRASTRUCTURE',
          title: 'DevOps & Infrastructure',
          description: 'CI/CD pipelines, Docker, Terraform, AWS deployment, and infrastructure-as-code details.',
          icon: '☁️'
        },
        {
          slug: 'SECURITY_CONSIDERATIONS',
          title: 'Security Considerations',
          description: 'Authentication, authorization, OWASP mitigations, CSP, rate limiting, and secrets management.',
          icon: '🔒'
        },
        {
          slug: 'PERFORMANCE_SCALABILITY',
          title: 'Performance & Scalability',
          description: 'Optimization strategies, caching, lazy loading, CDN, and scalability patterns.',
          icon: '⚡'
        },
        {
          slug: 'ACCESSIBILITY',
          title: 'Accessibility',
          description: 'WCAG 2.1 AA compliance, ARIA landmarks, screen reader support, and accessibility testing.',
          icon: '♿'
        }
      ]
    }
  ];
}
