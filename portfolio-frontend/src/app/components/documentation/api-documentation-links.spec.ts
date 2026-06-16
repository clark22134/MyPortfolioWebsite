declare const process: { cwd(): string };
declare function require(moduleName: string): unknown;

const { readFileSync } = require('fs') as { readFileSync(path: string, encoding: string): string };
const { resolve } = require('path') as { resolve(...paths: string[]): string };
const apiDocumentation = readFileSync(resolve(process.cwd(), 'public/docs/API_DOCUMENTATION.md'), 'utf8');

function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s/g, '-')
    .trim();
}

describe('API documentation table of contents', () => {
  it('links every in-page table-of-contents item to an existing heading', () => {
    const headingIds = new Set(
      [...apiDocumentation.matchAll(/^#{1,6}\s+(.+)$/gm)].map(match => headingId(match[1]))
    );
    const tocSection = apiDocumentation.match(/## Table of Contents\n\n(?<toc>(?:\s*- .+\n)+)/)?.groups?.['toc'] ?? '';
    const tocFragments = [...tocSection.matchAll(/\]\(#([^)]+)\)/g)].map(match => match[1]);
    const tocLines = tocSection.trimEnd().split('\n');
    const portfolioLineIndex = tocLines.findIndex(line => line.includes('#1--portfolio-api'));
    const assistantLineIndex = tocLines.findIndex(line => line.includes('#17-portfolio-assistant-chatbot'));

    expect(tocFragments).toContain('17-portfolio-assistant-chatbot');
    expect(tocFragments).not.toContain('4--portfolio-assistant-api');
    expect(tocLines[assistantLineIndex].startsWith('  - ')).toBe(true);
    expect(assistantLineIndex).toBe(portfolioLineIndex + 1);
    expect(tocFragments).not.toHaveLength(0);
    for (const fragment of tocFragments) {
      expect(headingIds.has(fragment), `Missing heading for #${fragment}`).toBe(true);
    }
  });
});
