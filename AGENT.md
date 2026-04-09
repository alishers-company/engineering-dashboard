# Engineering Dashboard — Agent Implementation Guide

You are the **GLM-4.5-Air** implementation agent for this repository.
Follow the issue scope exactly and build production-quality interactive pages.
Build EXACTLY what the user described — not a generic template.

## Project: Engineering Dashboard
**Primary goal:** The dashboard helps teams track and optimize engineering performance metrics.
**Target users:** Development team leads, managers
**Pages:** Home, Metric details, Historical trends, Metrics
**Sections:** Hero, Code quality, defect density, test coverage, Who it is for, Primary call to action
**Features:** Code quality, defect density, test coverage, Metric details, Historical trends, Responsive layout
**Copy tone:** Tailored and concrete
**Theme:** background #f3f6fb, surface #ffffff, accent #2563eb, text #0f172a

## Core Rules
- All pages must be **static client-side only** (GitHub Pages compatible).
- Use **only** HTML, CSS, and vanilla JavaScript. No frameworks, no build tools, no npm.
- Commit finished work directly to the default branch.
- Do not introduce server runtimes, backend APIs, databases, or secrets.


## GLM HTML Prototype Mode

When you are generating an `.html` file, treat it like a premium standalone prototype page, even though this repo keeps shared CSS in `styles.css` and shared JavaScript in `script.js`.

- Output ONLY raw HTML for HTML files. The first characters must be `<!DOCTYPE html>` and the file must end with `</html>`.
- Keep `<link rel="stylesheet" href="./styles.css">` and `<script src="./script.js"></script>` intact.
- Build a polished, real-feeling product page with meaningful copy. Never use lorem ipsum, "coming soon", or filler placeholders.
- Each HTML page should include at least 5 meaningful sections. If the brief is thin, add sensible sections like social proof, FAQ, pricing, testimonials, timeline, or CTA banner.
- Use lowercase hyphenated section ids and make navigation/CTA links point to real ids that exist in the page.
- The first/main page should include a bold hero section with a clear headline and primary call to action. Secondary pages should still open with a strong intro block.
- Use realistic domain-appropriate placeholder content: names, pricing, headlines, descriptions, FAQs, and testimonials that match the product category.
- For photos or mock imagery, use varied `https://picsum.photos/seed/{unique-name}/{width}/{height}` URLs. For icons, use inline SVG or Unicode only.
- Include at least one expandable or modal-style detail surface whenever the product brief suggests details, contact, booking, pricing, or feature drill-downs.
- JavaScript hooks must be real: every selector used by `script.js` should correspond to elements that exist in the HTML.
- Be careful with JavaScript strings: escape apostrophes inside single-quoted strings as `\'`, and never use smart quotes.


## Design System

The `styles.css` file ships with a complete design-token system. You MUST use these tokens everywhere
instead of hard-coded values. This guarantees visual consistency:

```
/* Already defined in :root — just USE them: */
var(--bg)  var(--surface)  var(--accent)  var(--text)
var(--accent-light)  var(--accent-hover)  var(--muted)  var(--border)
var(--space-xs..4xl)  var(--text-xs..hero)
var(--shadow-xs..xl)  var(--shadow-glow)
var(--radius-sm..full)
var(--ease-out)  var(--ease-spring)  var(--duration-fast/normal/slow)
```

Animation keyframes already defined: `fadeIn`, `fadeUp`, `fadeDown`, `slideInLeft`, `slideInRight`, `scaleIn`, `shimmer`, `float`, `pulse`, `gradient`.

Use `.reveal` class + JS `IntersectionObserver` to add `.is-visible` for scroll animations.

## Visual Design Reference (target: Stripe / Linear / Vercel quality)

### Hero Section Pattern
```css
.hero {
  min-height: 80vh;
  display: flex; align-items: center; justify-content: center;
  text-align: center;
  background: linear-gradient(135deg, var(--bg) 0%, var(--surface) 50%, color-mix(in srgb, var(--accent) 5%, var(--bg)) 100%);
  position: relative; overflow: hidden;
}
.hero::before { /* subtle gradient orb */
  content: ''; position: absolute; width: 600px; height: 600px;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 15%, transparent), transparent 70%);
  top: -200px; right: -100px; pointer-events: none;
}
.hero h1 {
  font-size: var(--text-hero); font-weight: 800;
  letter-spacing: -0.04em; line-height: 1.05;
  background: linear-gradient(135deg, var(--text), var(--accent));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
```

### Glass Card Pattern
```css
.glass-card {
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--space-xl);
  transition: transform var(--duration-normal) var(--ease-out),
              box-shadow var(--duration-normal) var(--ease-out);
}
.glass-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}
```

### Gradient Button Pattern
```css
.btn-primary {
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  color: white; font-weight: 600; font-size: var(--text-sm);
  border: none; cursor: pointer;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 30%, transparent);
  transition: all var(--duration-normal) var(--ease-spring);
}
.btn-primary:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--accent) 40%, transparent);
}
```

### Sticky Nav with Blur
```css
.navbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  padding: var(--space-md) var(--space-2xl);
  background: color-mix(in srgb, var(--bg) 80%, transparent);
  backdrop-filter: blur(12px) saturate(150%);
  border-bottom: 1px solid var(--border);
  transition: background var(--duration-normal);
}
```

### Feature Grid with Staggered Animation
```css
.features { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-lg); }
.feature-card {
  padding: var(--space-xl); border-radius: var(--radius-lg);
  background: var(--surface); border: 1px solid var(--border);
  transition: all var(--duration-normal) var(--ease-out);
}
.feature-card:hover { border-color: var(--accent); box-shadow: var(--shadow-glow); transform: translateY(-2px); }
.feature-icon {
  width: 48px; height: 48px; border-radius: var(--radius-md);
  background: var(--accent-light); display: flex; align-items: center; justify-content: center;
  margin-bottom: var(--space-md); font-size: 1.5rem;
}
```

### Section Spacing & Dividers
```css
section { padding: var(--space-4xl) var(--space-2xl); }
.section-label {
  font-size: var(--text-xs); font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.15em; color: var(--accent); margin-bottom: var(--space-sm);
}
.section-title {
  font-size: var(--text-3xl); font-weight: 800;
  letter-spacing: -0.03em; margin-bottom: var(--space-lg);
}
.container { max-width: 1200px; margin: 0 auto; padding: 0 var(--space-lg); }
```

## Quality Standards

### HTML
- Use semantic HTML5: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`.
- Every interactive element must have `aria-*` attributes.
- Include `<meta name="viewport">` and `<link rel="preconnect" href="https://fonts.googleapis.com">`.
- Add Google Fonts `<link>` for Inter font (weights 400, 500, 600, 700, 800).
- Use SVG inline or CSS for all icons — never image URLs.
- Add `data-testid` attributes on key sections.

### CSS
- Use the design tokens from `:root` — NEVER hard-code colors, spacing, or font sizes.
- Mobile-first responsive design with breakpoints at 768px and 1024px.
- Every interactive element needs `hover`, `focus-visible`, and `active` states.
- Use CSS Grid for page layouts, Flexbox for component internals.
- Apply `transition` on all interactive elements using the token durations.
- Use `backdrop-filter: blur()` for glass effects on nav and cards.
- Use `background: linear-gradient()` for visual depth in hero and CTA sections.
- Add `::before` / `::after` pseudo-elements for decorative gradient orbs.
- Cards must elevate on hover (`translateY(-4px)` + shadow increase).
- Use `clamp()` vars for fluid typography — never fixed `px` font sizes.
- Section padding should use `var(--space-4xl)` for generous whitespace.

### JavaScript
- Use `IntersectionObserver` to toggle `.is-visible` on `.reveal` elements for scroll animations.
- Smooth scroll for anchor links.
- Mobile hamburger menu with animated open/close.
- Active nav link highlighting on scroll.
- Add staggered delays to card animations using `transitionDelay`.
- Tab/accordion components only if relevant to the page content.
- All code inside `DOMContentLoaded`.

## Anti-Patterns (DO NOT)
- Do not output placeholder text like "Lorem ipsum" or "Coming soon".
- Do not create empty sections or stub functions.
- Do not use `alert()` or `document.write()`.
- Do not use inline `style=` attributes (except for stagger delays).
- Do not leave `console.log` in production code.
- Do not use fixed pixel values for spacing — always use `var(--space-*)`.
- Do not hard-code colors — always reference `var(--accent)`, `var(--text)`, etc.
- Do not create flat, boring layouts — every section must have visual depth via shadows, gradients, or blur.