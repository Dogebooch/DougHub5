# DougHub UI Theme Specification: "Midnight Teal"

> A calm, focused design system for post-shift medical professionals

## Design Philosophy

**Core Aesthetic:** Professional minimalism with organic warmth. Inspired by Obsidian's focused simplicity, Notion's spacious layouts, and Linear's smart navigation patterns.

**Target User State:** Exhausted after 12-hour shifts, zero tolerance for visual noise or decision fatigue.

**Key Principles:**
1. **Calm over flashy** – Subdued shadows, subtle borders, muted accents
2. **Dense but breathable** – Compact elements with strategic whitespace
3. **Guide the workflow** – Visual hierarchy leads users through capture→review flow
4. **One place for everything** – Sidebar + search eliminate navigation anxiety

---

## Color Palette

### Semantic Tokens (HSL format for CSS variables)

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `95 10% 9%` | Main app background (deep charcoal-green) |
| `--foreground` | `37 25% 88%` | Primary text (warm off-white) |
| `--card` | `38 34% 86%` | Card surfaces (warm cream) |
| `--card-foreground` | `120 20% 10%` | Text on cards (near-black) |
| `--primary` | `175 30% 45%` | Teal accent (actions, focus) |
| `--primary-foreground` | `120 10% 6%` | Text on primary buttons |
| `--secondary` | `35 20% 14%` | Secondary surfaces |
| `--muted` | `120 8% 18%` | Sidebar, disabled states |
| `--muted-foreground` | `35 15% 65%` | Subtle text |
| `--accent` | `38 45% 42%` | Amber accent (warnings) |
| `--destructive` | `12 40% 48%` | Error states |
| `--border` | `120 8% 14%` | Default borders |
| `--ring` | `175 30% 45%` | Focus rings |

### Grade Button Colors (distinct from base theme)
These remain colorful for clear differentiation during review:

| Grade | Background | Semantic |
|-------|------------|----------|
| Again (Forgot) | `#8c3a2e` | Deep terracotta |
| Hard (Struggled) | `#b58135` | Amber gold |
| Good (Recalled) | `#3d5e7a` | Steel blue |
| Easy (Mastered) | `#3e5e40` | Forest green |

---

## Spacing Scale

Base unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Icon gaps, minimal spacing |
| `space-2` | 8px | Inline element gaps |
| `space-3` | 12px | Button internal padding |
| `space-4` | 16px | Card internal padding |
| `space-5` | 20px | Component margins |
| `space-6` | 24px | Section spacing |
| `space-8` | 32px | Major section gaps |
| `space-10` | 40px | Page margins |
| `space-12` | 48px | Large page margins |

---

## Typography Scale

Font families:
- **Sans:** Inter (UI elements, buttons, labels)
- **Serif:** Newsreader (card content, reading surfaces)

| Element | Size | Weight | Line Height | Font |
|---------|------|--------|-------------|------|
| H1 (page title) | 24px | 600 | 1.2 | Sans |
| H2 (section) | 18px | 600 | 1.3 | Sans |
| H3 (card title) | 16px | 600 | 1.4 | Sans |
| Body | 16px | 400 | 1.5 | Sans |
| Card front | 24px | 500 | 1.4 | Serif |
| Card back | 18px | 400 | 1.5 | Serif |
| Caption | 12px | 500 | 1.3 | Sans |
| Label | 10px | 700 | 1.2 | Sans (uppercase, tracking) |

---

## Layout Specifications

### Header
| Property | Value |
|----------|-------|
| Height | 56px |
| Padding | `px-4 py-2` |
| Background | `bg-black/30` + `backdrop-blur-xl` |
| Border | `border-b border-white/10` |
| Logo size | 24×24px |
| Title size | 16px (text-base) |

### Sidebar
| Property | Value |
|----------|-------|
| Width (expanded) | 220px |
| Width (collapsed) | 56px |
| Background | `bg-muted/50` |
| Border | `border-r border-white/10` |
| Item height | 40px |
| Item padding | `px-3 py-2` |
| Active indicator | Left border 2px primary |

### Content Area
| Property | Value |
|----------|-------|
| Max width | 800px (centered) |
| Padding | `px-6 py-8` |
| Card max width | 640px (review mode) |

### Cards
| Property | Value |
|----------|-------|
| Border radius | 16px (`rounded-2xl`) |
| Padding | 24px (`p-6`) |
| Shadow | `shadow-lg` (not heavy) |
| Border | `border border-black/10` |

### Buttons
| Size | Height | Padding | Font |
|------|--------|---------|------|
| sm | 32px | px-3 | 13px |
| default | 36px | px-4 | 14px |
| lg | 44px | px-6 | 15px |
| icon | 36×36px | - | - |

### Floating Action Button (Quick Dump)
| Property | Value |
|----------|-------|
| Size | 48×48px |
| Position | Fixed, bottom-right (24px offset) |
| Background | Primary gradient |
| Shadow | `shadow-lg` |
| Border radius | Full (circle) |

---

## Border Radius Hierarchy

| Element | Radius |
|---------|--------|
| Page cards | 16px (`rounded-2xl`) |
| Buttons | 8px (`rounded-lg`) |
| Inputs | 8px (`rounded-lg`) |
| Badges | 6px (`rounded-md`) |
| Sidebar items | 6px (`rounded-md`) |
| FAB | Full (`rounded-full`) |

---

## Shadow Hierarchy

| Level | Box Shadow | Usage |
|-------|------------|-------|
| subtle | `0 1px 2px rgba(0,0,0,0.05)` | Inputs |
| default | `0 4px 6px -1px rgba(0,0,0,0.1)` | Cards |
| lg | `0 10px 15px -3px rgba(0,0,0,0.2)` | Elevated cards, modals |
| heavy | `0 20px 40px -10px rgba(0,0,0,0.4)` | Hero cards (sparingly) |

---

## Animation Tokens

| Property | Value | Usage |
|----------|-------|-------|
| `--transition-fast` | 150ms ease-out | Hover states, toggles |
| `--transition-normal` | 250ms ease-out | View changes |
| `--transition-slow` | 400ms ease-out | Large animations |

Standard transition: `transition-all duration-150`

---

## Smart Views (Sidebar Navigation)

| View | Icon | Badge | Route State |
|------|------|-------|-------------|
| Today | Calendar | Due count | `today` |
| Inbox | Inbox | Pending count | `inbox` |
| Queue | List | Quick dump count | `queue` |
| Review | Play | Due now | `review` |
| Capture | Plus | - | `capture` |
| Notebook | Book | - | `notebook` |
| Topics | Tag | - | `topics` |
| Stats | BarChart | - | `stats` |
| Settings | Settings | - | `settings` |

**Weak Topics Section:** Appears below main nav when low-ease cards exist.

---

## Implementation TODOs

<!-- These comments are for future implementation reference -->

- [ ] TODO: Implement Inbox view (status='inbox' filter)
- [ ] TODO: Implement Today view (due cards + recent captures)
- [ ] TODO: Implement Queue view (quick dumps pending)
- [ ] TODO: Implement Notebook view (topic pages)
- [ ] TODO: Implement Topics browser
- [ ] TODO: Implement Stats dashboard
- [ ] TODO: Implement Weak Topics (low-ease card grouping)
- [ ] TODO: Add sidebar collapse animation
- [ ] TODO: Persist sidebar collapsed state to localStorage

---

## Accessibility

- Minimum contrast ratio: 4.5:1 for all text
- Focus rings: 2px solid primary with 2px offset
- Keyboard navigation: Tab through all interactive elements
- Reduced motion: Respect `prefers-reduced-motion`
