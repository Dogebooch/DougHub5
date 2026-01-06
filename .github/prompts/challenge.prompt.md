---
description: Challenge the current plan or implementation for gaps, edge cases, and issues
name: challenge
agent: ask
---

# Challenge Current Plan/Implementation

Perform a critical review identifying:

## Logic & Edge Cases
- Missing steps, incomplete flows, undefined behaviors
- Null/undefined handling, empty arrays/objects, boundary conditions
- Race conditions, stale closures, side effects

## Code Issues
- Broken/incomplete functions, missing returns
- Old/deprecated code, unused variables/imports
- Duplicate code, unnecessary abstractions
- Type safety gaps, `any` types

## React/Hooks (if applicable)
- Missing useEffect dependencies, cleanup functions
- Subscription/event listener leaks
- Missing providers, stale context

## Error Handling & Security
- Missing try/catch, unhandled promises
- Input validation, XSS/SQL injection risks
- Missing auth checks, exposed secrets/API keys

## Performance
- Unnecessary re-renders, missing memoization
- N+1 queries, missing indexes
- Memory leaks, large bundle sizes

---

For each issue: **Severity** | **Location** | **Problem** | **Fix**

Prioritize critical bugs and security issues.
