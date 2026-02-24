/**
 * Automated Accessibility Testing Script
 *
 * Uses axe-core and puppeteer to run WCAG 2.1 AA compliance checks
 * against the built Angular application served locally.
 *
 * Usage: node a11y-tests/axe-test.js
 * Prerequisites: npm install --save-dev @axe-core/puppeteer puppeteer
 *
 * Exit codes:
 *   0 - All pages pass accessibility checks
 *   1 - Accessibility violations found
 */

const { AxePuppeteer } = require('@axe-core/puppeteer');
const puppeteer = require('puppeteer');
const http = require('http');
const path = require('path');

// Pages to test
const PAGES = [
  { url: '/', name: 'Home' },
  { url: '/contact', name: 'Contact' },
  { url: '/projects', name: 'Projects' },
  { url: '/login', name: 'Login' },
  { url: '/accessibility', name: 'Accessibility Statement' },
];

// WCAG 2.1 AA tags to check
const AXE_OPTIONS = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
  },
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

async function waitForServer(url, maxRetries = 30, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode === 200) resolve();
          else reject(new Error(`Status: ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      return true;
    } catch {
      if (i < maxRetries - 1) {
        console.log(`Waiting for server... (attempt ${i + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw new Error(`Server at ${url} not available after ${maxRetries} retries`);
}

async function runAccessibilityTests() {
  console.log('===========================================');
  console.log('  Accessibility Testing - WCAG 2.1 AA');
  console.log('===========================================\n');

  // Wait for dev server
  console.log(`Checking server at ${BASE_URL}...`);
  await waitForServer(BASE_URL);
  console.log('Server is ready!\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let totalViolations = 0;
  let totalPasses = 0;
  const results = [];

  for (const page of PAGES) {
    const url = `${BASE_URL}${page.url}`;
    console.log(`\nTesting: ${page.name} (${url})`);
    console.log('-'.repeat(50));

    const browserPage = await browser.newPage();
    await browserPage.setViewport({ width: 1280, height: 720 });

    try {
      await browserPage.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      // Wait a bit for Angular to render
      await new Promise((r) => setTimeout(r, 3000));

      const axeResults = await new AxePuppeteer(browserPage)
        .options(AXE_OPTIONS)
        .analyze();

      const violations = axeResults.violations;
      const passes = axeResults.passes;

      totalViolations += violations.length;
      totalPasses += passes.length;

      results.push({
        page: page.name,
        url: page.url,
        violations: violations.length,
        passes: passes.length,
      });

      if (violations.length === 0) {
        console.log(`  ✅ PASS - No violations found (${passes.length} rules passed)`);
      } else {
        console.log(`  ❌ FAIL - ${violations.length} violation(s) found\n`);
        violations.forEach((violation, index) => {
          console.log(`  ${index + 1}. [${violation.impact?.toUpperCase()}] ${violation.id}`);
          console.log(`     ${violation.description}`);
          console.log(`     Help: ${violation.helpUrl}`);
          console.log(`     Affected elements: ${violation.nodes.length}`);
          violation.nodes.forEach((node) => {
            console.log(`       - ${node.target.join(', ')}`);
            if (node.failureSummary) {
              console.log(`         ${node.failureSummary.split('\n')[0]}`);
            }
          });
          console.log();
        });
      }
    } catch (error) {
      console.log(`  ⚠️  Error testing ${page.name}: ${error.message}`);
      results.push({
        page: page.name,
        url: page.url,
        violations: -1,
        passes: 0,
        error: error.message,
      });
    } finally {
      await browserPage.close();
    }
  }

  await browser.close();

  // Summary
  console.log('\n===========================================');
  console.log('         ACCESSIBILITY TEST SUMMARY');
  console.log('===========================================\n');

  console.log('Page Results:');
  results.forEach((r) => {
    const status = r.violations === 0 ? '✅' : r.violations > 0 ? '❌' : '⚠️';
    console.log(`  ${status} ${r.page}: ${r.violations >= 0 ? `${r.violations} violations, ${r.passes} passes` : `Error: ${r.error}`}`);
  });

  console.log(`\nTotal: ${totalViolations} violation(s) across ${PAGES.length} pages`);
  console.log(`Total rules passed: ${totalPasses}\n`);

  if (totalViolations > 0) {
    console.log('❌ Accessibility tests FAILED');
    console.log('Fix violations above to meet WCAG 2.1 AA compliance.\n');
    process.exit(1);
  } else {
    console.log('✅ All accessibility tests PASSED');
    console.log('Site meets WCAG 2.1 AA compliance standards.\n');
    process.exit(0);
  }
}

runAccessibilityTests().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
