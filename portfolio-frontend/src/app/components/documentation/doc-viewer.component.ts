import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewChecked,
  ElementRef,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { marked } from 'marked';
import mermaid from 'mermaid';

interface DocMeta {
  slug: string;
  title: string;
}

const DOC_MAP: Record<string, string> = {
  SYSTEM_OVERVIEW: 'System Overview',
  ARCHITECTURE: 'Architecture',
  UNIFIED_ARCHITECTURE: 'Unified Architecture',
  UML_DIAGRAMS: 'UML Diagrams',
  TECHNICAL_DESIGN_DECISIONS: 'Technical Design Decisions',
  API_DOCUMENTATION: 'API Documentation',
  TESTING_STRATEGY: 'Testing Strategy',
  PROJECT_HIGHLIGHTS: 'Project Highlights',
  DEVOPS_INFRASTRUCTURE: 'DevOps & Infrastructure',
  SECURITY_CONSIDERATIONS: 'Security Considerations',
  PERFORMANCE_SCALABILITY: 'Performance & Scalability',
  ACCESSIBILITY: 'Accessibility'
};

@Component({
  selector: 'app-doc-viewer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './doc-viewer.component.html',
  styleUrl: './doc-viewer.component.css',
  encapsulation: ViewEncapsulation.None
})
export class DocViewerComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('docContent') docContentRef!: ElementRef<HTMLDivElement>;

  renderedHtml = '';
  docTitle = '';
  loading = true;
  error = false;
  private routeSub!: Subscription;
  private needsMermaidRender = false;
  private needsHeadingIds = false;
  private mermaidInitialized = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe(params => {
      const slug = params.get('slug') ?? '';
      this.docTitle = DOC_MAP[slug] ?? slug.replaceAll('_', ' ');
      this.loadDocument(slug);
    });
  }

  ngAfterViewChecked(): void {
    if (this.needsHeadingIds && this.docContentRef) {
      this.needsHeadingIds = false;
      this.addHeadingIds();
    }
    if (this.needsMermaidRender && this.docContentRef) {
      this.needsMermaidRender = false;
      this.renderMermaid();
    }
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private loadDocument(slug: string): void {
    this.loading = true;
    this.error = false;
    this.renderedHtml = '';

    const url = `docs/${slug}.md`;

    this.http.get(url, { responseType: 'text' }).subscribe({
      next: (markdown) => {
        this.parseMarkdown(markdown);
        this.loading = false;
        this.needsHeadingIds = true;
        this.needsMermaidRender = true;
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  // Set id attributes directly on heading elements after Angular has rendered
  // the sanitized HTML. Angular's [innerHTML] sanitizer strips id attributes,
  // so injecting them via the marked renderer has no effect. Manipulating the
  // DOM directly (same pattern as renderMermaid) bypasses that limitation.
  private addHeadingIds(): void {
    const container = this.docContentRef?.nativeElement;
    if (!container) return;

    const seen = new Map<string, number>();
    container.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6').forEach(heading => {
      const baseId = (heading.textContent ?? '')
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s/g, '-')
        .trim();
      const count = seen.get(baseId) ?? 0;
      seen.set(baseId, count + 1);
      heading.id = count === 0 ? baseId : `${baseId}-${count}`;
    });
  }

  private parseMarkdown(md: string): void {
    const renderer = new marked.Renderer();

    // Override code blocks to handle mermaid
    renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
      if (lang === 'mermaid') {
        return `<pre class="mermaid">${this.escapeHtml(text)}</pre>`;
      }
      const escapedText = this.escapeHtml(text);
      const langClass = lang ? ` class="language-${this.escapeHtml(lang)}"` : '';
      return `<pre class="code-block"><code${langClass}>${escapedText}</code></pre>`;
    };

    marked.setOptions({
      renderer,
      gfm: true,
      breaks: false
    });

    this.renderedHtml = marked.parse(md) as string;
  }

  onContentClick(event: MouseEvent): void {
    if (!(event.target instanceof Element)) return;
    const anchor = event.target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href?.startsWith('#')) {
        event.preventDefault();
        const id = href.slice(1);
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          // Update the URL fragment without triggering Angular's router
          history.pushState(null, '', href);
          // Move focus to the heading so screen readers announce the section
          if (!el.hasAttribute('tabindex')) {
            el.setAttribute('tabindex', '-1');
          }
          el.focus({ preventScroll: true });
        }
      }
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  private async renderMermaid(): Promise<void> {
    if (!this.mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#1a3a1a',
          primaryTextColor: '#00cc33',
          primaryBorderColor: '#00cc33',
          lineColor: '#00cc33',
          secondaryColor: '#1a1a2e',
          tertiaryColor: '#0a0a0a',
          mainBkg: '#141414',
          nodeBorder: '#00cc33',
          clusterBkg: '#0d1a0d',
          clusterBorder: '#00cc33',
          titleColor: '#00cc33',
          edgeLabelBackground: '#0a0a0a',
          nodeTextColor: '#e0e0e0',
          actorTextColor: '#e0e0e0',
          actorBorder: '#00cc33',
          actorBkg: '#141414',
          activationBorderColor: '#00cc33',
          activationBkgColor: '#1a3a1a',
          sequenceNumberColor: '#00cc33',
          sectionBkgColor: '#141414',
          altSectionBkgColor: '#0d1a0d',
          sectionBkgColor2: '#1a1a2e',
          taskBorderColor: '#00cc33',
          taskBkgColor: '#1a3a1a',
          taskTextColor: '#e0e0e0',
          activeTaskBorderColor: '#00ff41',
          activeTaskBkgColor: '#1a5a1a',
          gridColor: '#333',
          doneTaskBkgColor: '#0d3d0d',
          doneTaskBorderColor: '#00cc33',
          critBkgColor: '#3a1a1a',
          critBorderColor: '#ff4444',
          todayLineColor: '#00ff41',
          labelColor: '#e0e0e0',
          labelTextColor: '#e0e0e0',
          loopTextColor: '#00cc33',
          noteBorderColor: '#00cc33',
          noteBkgColor: '#1a3a1a',
          noteTextColor: '#e0e0e0',
          signalColor: '#00cc33',
          signalTextColor: '#e0e0e0'
        },
        flowchart: { curve: 'basis', useMaxWidth: true },
        sequence: { useMaxWidth: true },
        gantt: { useMaxWidth: true },
        er: { useMaxWidth: true }
      });
      this.mermaidInitialized = true;
    }

    const container = this.docContentRef?.nativeElement;
    if (!container) return;

    const mermaidBlocks = container.querySelectorAll<HTMLPreElement>('pre.mermaid');
    if (mermaidBlocks.length === 0) return;

    // Process each mermaid block
    for (let i = 0; i < mermaidBlocks.length; i++) {
      const block = mermaidBlocks[i];
      const code = block.textContent ?? '';
      const id = `mermaid-${Date.now()}-${i}`;

      try {
        const { svg } = await mermaid.render(id, code);
        block.innerHTML = svg;
        block.classList.add('mermaid-rendered');
      } catch {
        block.innerHTML = `<div class="mermaid-error">
          <span class="error-icon">⚠️</span>
          <span>Diagram could not be rendered</span>
          <pre class="error-source"><code>${this.escapeHtml(code)}</code></pre>
        </div>`;
        block.classList.add('mermaid-error-block');
      }
    }
  }
}
