import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { DocViewerComponent } from './doc-viewer.component';

// `mermaid` is a heavy, browser-oriented ESM dependency only exercised when a
// rendered doc contains a diagram. Stub it so the spec stays deterministic and
// never pulls the real module into the jsdom test environment.
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg id="m"></svg>' }),
  },
}));

describe('DocViewerComponent', () => {
  let component: DocViewerComponent;
  let fixture: ComponentFixture<DocViewerComponent>;
  let httpMock: HttpTestingController;

  function setup(slug: string): void {
    const paramMap$ = new BehaviorSubject<ParamMap>(convertToParamMap({ slug }));
    TestBed.configureTestingModule({
      imports: [DocViewerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: paramMap$.asObservable() },
        },
      ],
    });
    fixture = TestBed.createComponent(DocViewerComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    setup('ARCHITECTURE');
    expect(component).toBeTruthy();
  });

  it('requests the markdown for the route slug and renders it', () => {
    setup('ARCHITECTURE');
    fixture.detectChanges(); // ngOnInit subscribes to the route param map

    const req = httpMock.expectOne('docs/ARCHITECTURE.md');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('text');

    req.flush('# Heading\n\nSome **bold** copy.');

    expect(component.loading).toBe(false);
    expect(component.error).toBe(false);
    expect(component.docTitle).toBe('Architecture');
    expect(component.renderedHtml).toContain('<strong>bold</strong>');
  });

  it('maps a known slug to its friendly title', () => {
    setup('API_DOCUMENTATION');
    fixture.detectChanges();
    httpMock.expectOne('docs/API_DOCUMENTATION.md').flush('# x');
    expect(component.docTitle).toBe('API Documentation');
  });

  it('falls back to a de-slugified title for unknown documents', () => {
    setup('SOME_UNLISTED_DOC');
    fixture.detectChanges();
    httpMock.expectOne('docs/SOME_UNLISTED_DOC.md').flush('# x');
    expect(component.docTitle).toBe('SOME UNLISTED DOC');
  });

  it('sets the error flag when the document cannot be loaded', () => {
    setup('ARCHITECTURE');
    fixture.detectChanges();
    httpMock
      .expectOne('docs/ARCHITECTURE.md')
      .flush('nope', { status: 404, statusText: 'Not Found' });

    expect(component.loading).toBe(false);
    expect(component.error).toBe(true);
    expect(component.renderedHtml).toBe('');
  });

  it('renders fenced code as an escaped code block, not raw HTML', () => {
    setup('ARCHITECTURE');
    fixture.detectChanges();
    httpMock
      .expectOne('docs/ARCHITECTURE.md')
      .flush('```js\nconst x = 1 < 2;\n```');

    expect(component.renderedHtml).toContain('class="code-block"');
    expect(component.renderedHtml).toContain('1 &lt; 2');
  });

  it('intercepts in-page anchor clicks and scrolls to the target heading', () => {
    setup('ARCHITECTURE');
    fixture.detectChanges();
    httpMock.expectOne('docs/ARCHITECTURE.md').flush('# Doc');

    const heading = document.createElement('h2');
    heading.id = 'section-1';
    document.body.appendChild(heading);
    const scrollSpy = vi.spyOn(heading, 'scrollIntoView');

    const anchor = document.createElement('a');
    anchor.setAttribute('href', '#section-1');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', { value: anchor });
    const preventSpy = vi.spyOn(event, 'preventDefault');

    component.onContentClick(event);

    expect(preventSpy).toHaveBeenCalled();
    expect(scrollSpy).toHaveBeenCalled();
    heading.remove();
  });

  it('ignores clicks that are not on an anchor', () => {
    setup('ARCHITECTURE');
    fixture.detectChanges();
    httpMock.expectOne('docs/ARCHITECTURE.md').flush('# Doc');

    const span = document.createElement('span');
    const event = new MouseEvent('click');
    Object.defineProperty(event, 'target', { value: span });

    expect(() => component.onContentClick(event)).not.toThrow();
  });
});
