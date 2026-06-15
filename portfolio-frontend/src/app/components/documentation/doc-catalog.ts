export interface DocEntry {
  slug: string;
  title: string;
  sidebarTitle?: string;
  description: string;
  icon: string;
}

export interface DocCategory {
  name: string;
  docs: DocEntry[];
}

export const DOC_CATEGORIES: DocCategory[] = [
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
        sidebarTitle: 'Design Decisions',
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
        sidebarTitle: 'DevOps & Infra',
        description: 'CI/CD pipelines, Docker, Terraform, AWS deployment, and infrastructure-as-code details.',
        icon: '☁️'
      },
      {
        slug: 'SERVERLESS_MIGRATION',
        title: 'Serverless Migration Guide',
        sidebarTitle: 'Serverless Migration',
        description: 'Migration guide covering Lambda, API Gateway, CloudFront, Aurora Serverless, deployment, rollback, and monitoring.',
        icon: '🚀'
      },
      {
        slug: 'SECURITY_CONSIDERATIONS',
        title: 'Security Considerations',
        sidebarTitle: 'Security',
        description: 'Authentication, authorization, OWASP mitigations, CSP, rate limiting, and secrets management.',
        icon: '🔒'
      },
      {
        slug: 'PERFORMANCE_SCALABILITY',
        title: 'Performance & Scalability',
        sidebarTitle: 'Performance',
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

export const DOC_TITLE_MAP: Record<string, string> = DOC_CATEGORIES
  .flatMap(category => category.docs)
  .reduce<Record<string, string>>((titles, doc) => {
    titles[doc.slug] = doc.title;
    return titles;
  }, {});
