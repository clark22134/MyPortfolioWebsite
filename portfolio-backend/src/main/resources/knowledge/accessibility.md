---
title: Accessibility Approach
category: accessibility
source: accessibility-page
---

# Accessibility Approach

Every site Clark builds targets **WCAG 2.1 AA** compliance and is verified
both automatically and manually. The full Accessibility Statement lives at
`/accessibility` on this site, and the deep technical write-up is in
`docs/ACCESSIBILITY.md`.

## Standards

- WCAG 2.1 Level AA across all pages.
- Section 508 alignment for U.S. federal context.
- ARIA Authoring Practices for interactive widgets.

## What is implemented

- **Skip-to-main-content** link on every page.
- Visible, high-contrast focus indicators (`*:focus-visible` rule in
  `portfolio-frontend/src/styles.scss`).
- Semantic landmarks: `header`, `nav`, `main`, `footer`.
- ARIA labels on icon-only buttons and decorative SVGs marked
  `aria-hidden="true"`.
- Live regions for status updates (`role="status"` / `aria-live="polite"`).
- Resizable text via `rem` units, no fixed-pixel typography on body content.
- Reduced-motion support via `prefers-reduced-motion`.
- Persistent **Accessibility Toolbar** component for runtime adjustments
  (font size, contrast, motion).
- Color contrast verified against WCAG AA thresholds (4.5:1 normal text,
  3:1 large text and UI components).

## How it is tested

- **Automated**: `@axe-core/puppeteer` suite in
  `portfolio-frontend/a11y-tests/` runs against every page via
  `npm run test:a11y`.
- **Manual**: keyboard-only walkthroughs and screen-reader passes
  (NVDA on Windows, VoiceOver on macOS / iOS).
- **CI**: a11y tests run on every pull request.

## Chatbot accessibility

The portfolio chatbot specifically:

- Uses `role="dialog"` with `aria-modal="true"` when open.
- Traps focus inside the chat panel and restores focus to the launcher on
  close.
- Provides ARIA labels for the launcher button, message log, and input.
- Streams responses into an `aria-live="polite"` region so screen readers
  announce new content without interrupting the user.
- Is fully keyboard operable: `Esc` closes, `Enter` sends, `Tab` cycles.
