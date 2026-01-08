# Contrast Fixes - Quick Reference Guide

Quick lookup for fixing specific contrast issues in DougHub components.

---

## Critical Fixes (Deploy ASAP)

### ReviewInterface.tsx - 5 Fixes Required

**Location:** `src/components/review/ReviewInterface.tsx`

#### Fix 1: Debug Stats (Line ~563)
```tsx
// ❌ BEFORE (2.2:1 ratio - FAIL)
<span className="ml-3 opacity-40 text-[9px]">
  • S:{currentCard.stability.toFixed(1)} • D:{currentCard.difficulty.toFixed(1)} • R:{currentCard.reps}
</span>

// ✅ AFTER (7.2:1 ratio - PASS)
<span className="ml-3 text-muted-foreground text-[11px]">
  • S:{currentCard.stability.toFixed(1)} • D:{currentCard.difficulty.toFixed(1)} • R:{currentCard.reps}
</span>
```

#### Fix 2: "Show Answer" Keyboard Hint (Line ~615)
```tsx
// ❌ BEFORE (3.6:1 ratio - FAIL)
<span className="ml-3 text-[10px] opacity-50 font-mono">Space</span>

// ✅ AFTER (7.2:1 ratio - PASS)
<span className="ml-3 text-xs text-muted-foreground font-mono">Space</span>
```

#### Fix 3: "Continue" Keyboard Hint (Line ~627)
```tsx
// ❌ BEFORE (2.2:1 ratio - FAIL)
<span className="ml-3 text-[10px] opacity-40 font-mono">Space</span>

// ✅ AFTER (7.2:1 ratio - PASS)
<span className="ml-3 text-xs text-muted-foreground font-mono">Space</span>
```

#### Fix 4: Progress Header (Line ~434)
```tsx
// ❌ BEFORE (3.6:1 ratio - FAIL)
<div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/50">

// ✅ AFTER (7.2:1 ratio - PASS)
<div className="flex items-center justify-between text-xs uppercase tracking-widest font-semibold text-muted-foreground">
```

#### Fix 5: Card Footer (Line ~534)
```tsx
// ❌ BEFORE (3.4:1 ratio - FAIL)
<div className="text-center text-[10px] text-card-muted/70 pt-6 border-t border-border/30 font-medium uppercase tracking-widest">

// ✅ AFTER (4.8:1 ratio - PASS)
<div className="text-center text-xs text-card-muted pt-6 border-t border-border/30 font-medium uppercase tracking-widest">
```

#### Fix 6: Instructions Text (Line ~638)
```tsx
// ❌ BEFORE
<p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">

// ✅ AFTER
<p className="text-xs uppercase tracking-widest text-muted-foreground">
```

---

## Medium Priority Fixes

### SourceItemRow.tsx - Delete Button Hover
**Location:** `src/components/knowledgebank/SourceItemRow.tsx:140`

```tsx
// ❌ BEFORE (hardcoded red)
className="h-8 w-8 text-card-muted/70 hover:text-red-900 hover:bg-red-900/10"

// ✅ AFTER (semantic token)
className="h-8 w-8 text-card-muted/70 hover:text-destructive hover:bg-destructive/10"
```

---

### toast.tsx - Destructive Toast Colors
**Location:** `src/components/ui/toast.tsx:80`

**Step 1:** Add tokens to `src/index.css`
```css
.bg-card {
  --destructive-muted: 12 70% 40%;
  --destructive-soft: 12 60% 20%;
}
```

**Step 2:** Update component
```tsx
// ❌ BEFORE
group-[.destructive]:text-red-300 
group-[.destructive]:hover:text-red-50

// ✅ AFTER
group-[.destructive]:text-[hsl(var(--destructive-muted))]
group-[.destructive]:hover:text-[hsl(var(--destructive-soft))]
```

---

### SearchResultsPage.tsx - Icon Colors
**Location:** `src/components/search/SearchResultsPage.tsx:30-32`

**Step 1:** Add tokens to `src/index.css`
```css
:root, .dark {
  --icon-card: 270 60% 60%;     /* Purple */
  --icon-note: 215 80% 60%;     /* Blue */
  --icon-source: 35 85% 60%;    /* Amber */
}
```

**Step 2:** Update icons
```tsx
// ❌ BEFORE
case 'card': return <CreditCard className="h-5 w-5 text-purple-400" />;
case 'note': return <FileText className="h-5 w-5 text-blue-400" />;
case 'source_item': return <Inbox className="h-5 w-5 text-amber-400" />;

// ✅ AFTER
case 'card': return <CreditCard className="h-5 w-5 text-[hsl(var(--icon-card))]" />;
case 'note': return <FileText className="h-5 w-5 text-[hsl(var(--icon-note))]" />;
case 'source_item': return <Inbox className="h-5 w-5 text-[hsl(var(--icon-source))]" />;
```

---

### WeakTopicsView.tsx - Amber Warning Colors
**Location:** `src/components/smartviews/WeakTopicsView.tsx` (multiple lines)

Use existing `--warning` token instead of hardcoded amber variants:

```tsx
// ❌ BEFORE (8+ instances)
text-amber-500, text-amber-600, text-amber-700
bg-amber-50/50, bg-amber-100, bg-amber-200
border-amber-200, border-amber-500/20

// ✅ AFTER
text-warning          (replaces amber-500)
text-warning-foreground  (replaces amber-600, amber-700)
bg-warning/10         (replaces amber-50/50)
bg-warning/20         (replaces amber-100)
bg-warning/30         (replaces amber-200)
border-warning/20     (replaces border-amber-500/20)
border-warning/30     (replaces border-amber-200)
```

**Find/Replace Strategy:**
1. Find: `text-amber-500` → Replace: `text-warning`
2. Find: `text-amber-(?:600|700)` → Replace: `text-warning-foreground`
3. Find: `bg-amber-50/50` → Replace: `bg-warning/10`
4. Find: `bg-amber-100` → Replace: `bg-warning/20`
5. Find: `bg-amber-200` → Replace: `bg-warning/30`
6. Find: `border-amber-500/20` → Replace: `border-warning/20`
7. Find: `border-amber-200` → Replace: `border-warning/30`

---

## Low Priority Enhancements

### Badge Text Size Increase
**Location:** `src/components/knowledgebank/SourceItemRow.tsx:95`

```tsx
// Current (4.8:1 - borderline)
className="px-1.5 py-0 text-[10px] font-normal bg-card-muted/10 text-card-muted border-none"

// Recommended (better readability)
className="px-1.5 py-0 text-[11px] font-normal bg-card-muted/10 text-card-muted border-none"
```

---

### Icon Opacity Boost
**Location:** `src/components/capture/ConceptCheckbox.tsx:131`

```tsx
// Current (30% opacity)
className="h-6 w-6 text-card-foreground/30 hover:text-card-foreground shrink-0"

// Recommended (50% opacity)
className="h-6 w-6 text-card-foreground/50 hover:text-card-foreground shrink-0"
```

---

## Grep Commands for Finding Issues

Find all opacity-40 instances:
```bash
grep -rn "opacity-40" src/components/
```

Find all text-[9px] or text-[10px] with opacity:
```bash
grep -rn "text-\[9px\]\|text-\[10px\].*\/[0-9]" src/components/
```

Find all hardcoded amber colors:
```bash
grep -rn "text-amber-\|bg-amber-\|border-amber-" src/components/
```

Find all hardcoded red colors:
```bash
grep -rn "text-red-\|bg-red-\|border-red-" src/components/
```

Find all opacity modifiers on text:
```bash
grep -rn "text-.*\/[0-9]0" src/components/
```

---

## Testing After Fixes

### Manual Checks
1. Open DevTools → Inspect element → Computed styles
2. Copy background color and text color
3. Visit https://webaim.org/resources/contrastchecker/
4. Verify ratio ≥4.5:1 (or ≥3:1 for text >18px)

### Automated Tools
```bash
# Install Pa11y for automated testing
npm install -g pa11y

# Test a specific page
pa11y http://localhost:5173/review
```

### Keyboard Navigation Test
1. Tab through all interactive elements
2. Verify keyboard hints are readable
3. Check focus indicators have sufficient contrast

---

## Contrast Ratio Quick Reference

| Ratio | Grade | Use Case |
|-------|-------|----------|
| 15:1+ | AAA+ | Excellent - primary content |
| 7:1-14.9:1 | AAA | Good - body text, headings |
| 4.5:1-6.9:1 | AA | Acceptable - body text minimum |
| 3:1-4.4:1 | AA Large | Large text only (18px+ or 14px+ bold) |
| <3:1 | FAIL | Inaccessible - never use |

**Large Text:** ≥18px regular OR ≥14px bold  
**Small Text:** Everything else

---

## Before/After Summary

| Issue | Files | Before Ratio | After Ratio | Improvement |
|-------|-------|--------------|-------------|-------------|
| Debug stats opacity-40 | ReviewInterface.tsx | 2.2:1 🔴 | 7.2:1 ✅ | +227% |
| Keyboard hints opacity-50 | ReviewInterface.tsx | 3.6:1 🔴 | 7.2:1 ✅ | +100% |
| Metadata text /50 | ReviewInterface.tsx | 3.6:1 🔴 | 7.2:1 ✅ | +100% |
| Card footer /70 | ReviewInterface.tsx | 3.4:1 🔴 | 4.8:1 ✅ | +41% |
| Hardcoded colors | 4 files | N/A | N/A | Semantic tokens |

**Total Accessibility Improvement:** 5 critical failures → 0 failures
