---
name: vitest-browser-component-testing
description: >-
  Write and review Vitest Browser Mode component tests for React, Vue, Svelte,
  and other UI frameworks. Use when adding component tests, migrating from Jest
  + Testing Library, configuring vitest browser mode, testing user interactions,
  accessibility, async data fetching, or debugging flaky component tests.
---

# Vitest Browser Component Testing

Guidelines from [Vitest component testing docs](https://vitest.dev/guide/browser/component-testing.html). Use **Browser Mode** (real browsers via Playwright, WebdriverIO, or preview) — not DOM simulation — for component tests.

For browser setup and config, see [Browser Mode docs](https://vitest.dev/guide/browser/). This skill covers **component testing patterns**, not browser configuration.

## When to Apply

- Writing new component tests (`.test.tsx`, `.spec.tsx`)
- Reviewing or fixing flaky/failing component tests
- Migrating Jest + Testing Library tests to Vitest
- Testing forms, modals, async data, error boundaries, or accessibility
- Choosing isolation vs integration test strategy

## Core Principles

Component tests sit between unit and E2E tests. They should be **fast**, **isolated**, and **behavior-focused**.

### Test the contract, not internals

| Do | Don't |
|----|-------|
| Props in → rendered output / events out | Internal state variables |
| User clicks, typing, keyboard nav | Direct `setState` or private methods |
| Loading, error, empty states | CSS class names as assertions |
| Callbacks invoked with expected args | Implementation function names in test titles |

### Priority hierarchy

1. **Critical user paths** — always test
2. **Error handling** — failure scenarios
3. **Edge cases** — empty data, extreme values
4. **Accessibility** — focus, ARIA, keyboard
5. **Performance** — large datasets, animations (when relevant)

## Stack for This Project

This repo uses **React 19** + **Vitest 4**. Prefer:

```tsx
import { render } from 'vitest-browser-react'
import { page, userEvent } from 'vitest/browser'
```

Official packages exist for Vue (`vitest-browser-vue`), Svelte (`vitest-browser-svelte`), etc. For unsupported frameworks, bridge Testing Library via `page.elementLocator()` — see [patterns.md](patterns.md).

## Key API Differences (vs Jest + Testing Library)

```tsx
// DOM assertions — always await and use expect.element (auto-retries)
await expect.element(page.getByText('Submit')).toBeInTheDocument()
await expect.element(page.getByRole('button')).toBeVisible()
await expect.element(modal).toHaveAttribute('aria-modal', 'true')
await expect.element(document.activeElement).toHaveFocus()

// User interactions — vitest/browser, not @testing-library/user-event
await page.getByRole('button', { name: /submit/i }).click()
await page.getByLabelText(/email/i).fill('user@example.com')
await userEvent.keyboard('{Tab}')
await userEvent.selectOptions(page.getByLabelText(/category/i), 'Electronics')

// Module mocking — use import() syntax
vi.mock(import('../components/UserCard'), () => ({
  default: vi.fn(({ user }) => <div>User: {user.name}</div>),
}))
```

**No `page.locator()`** — use specific `getByRole`, `getByLabelText`, `getByText`, `getByTestId`. Chain with `.or()` for fallback queries:

```tsx
const btn = page.getByRole('button', { name: /submit/i })
  .or(page.getByTestId('submit-button'))
  .or(page.getByText('Submit'))
```

## Test Strategies

### Isolation — mock dependencies

- **API requests**: prefer [MSW](https://vitest.dev/guide/mocking/requests) over `vi.fn()` on fetch
- **Child components**: `vi.mock(import('...'))` to focus on parent logic
- Assert loading → success transitions with `await expect.element(...)`

### Integration — test collaboration

- Render parent + real children with realistic mock data
- Exercise filters, forms, and data flow across components
- Verify sibling updates after parent callbacks

## Best Practices Checklist

- [ ] Run in Browser Mode for CI/CD (real CSS, events, browser APIs)
- [ ] Use `page.getByRole()` and accessible names over test IDs when possible
- [ ] Test keyboard navigation, focus, and ARIA on interactive components
- [ ] Mock external APIs (MSW) — keep tests fast and deterministic
- [ ] Write behavior-focused test names: `shows error when email is invalid`, not `calls validateEmail`
- [ ] Use `await expect.element()` for all DOM assertions (handles async rendering)

## Common Patterns

Detailed code examples: [patterns.md](patterns.md)

| Scenario | Approach |
|----------|----------|
| Stateful components | Render → interact via `page.getByRole` → assert DOM updates |
| Data fetching | MSW `setupWorker` + `beforeAll`/`afterEach`/`afterAll`; override handlers per test for error states |
| Parent-child communication | `vi.fn()` callback + assert call args + assert sibling UI updates |
| Form validation | Submit empty → partial fill → invalid format → successful submit |
| Error boundaries | Render safe state → `rerender` with throwing child → assert fallback |
| Accessibility | Focus on open, ARIA attrs, Escape to close, focus trap with Tab/Shift+Tab |

## Test File Conventions

```tsx
test('shows error message when email format is invalid', async () => {
  render(<ContactForm onSubmit={vi.fn()} />)

  await page.getByLabelText(/email/i).fill('invalid-email')
  await page.getByRole('button', { name: /send/i }).click()

  await expect.element(page.getByText('Please enter a valid email')).toBeInTheDocument()
})
```

- One behavior per test when practical
- Prefer role/label queries: `getByRole`, `getByLabelText`
- Always `await` interactions and `expect.element` assertions

## Debugging Failed Tests

1. **Browser DevTools** — set `headless: false` temporarily; inspect DOM, console, network
2. **Vitest browser UI** — open the browser URL from terminal for visual inspection
3. **Element counts** — `page.getByRole('button').length` or `.all()` to list accessible names
4. **Visibility** — `await expect.element(el).toBeVisible()` prints DOM on failure
5. **Async** — rely on `expect.element` auto-retry; avoid manual `setTimeout`

```tsx
// Debug accessible names when getByRole fails
for (const button of page.getByRole('button').all()) {
  const el = button.element()
  console.log(el.getAttribute('aria-label') || el.textContent)
}
```

## Migration from Jest + Testing Library

| Before (Jest) | After (Vitest Browser) |
|---------------|------------------------|
| `@testing-library/react` render | `vitest-browser-react` render |
| `expect(...).toBeInTheDocument()` | `await expect.element(...).toBeInTheDocument()` |
| `@testing-library/user-event` | `page` clicks/fills + `userEvent` from `vitest/browser` |

Most test logic stays the same; update imports and make DOM assertions async.

## Anti-Patterns

```tsx
// Bad — implementation detail
test('sets isSubmitting to true', () => { ... })
component.setState({ email: 'x' })

// Bad — sync DOM assertion
expect(screen.getByText('Loaded')).toBeInTheDocument()

// Bad — CSS class assertion
expect(container.querySelector('.error')).toBeTruthy()

// Good — user-facing behavior
test('disables submit button while form is submitting', async () => {
  render(<ContactForm />)
  await page.getByRole('button', { name: /send/i }).click()
  await expect.element(page.getByRole('button', { name: /send/i })).toBeDisabled()
})
```

## References

- [Component Testing Guide](https://vitest.dev/guide/browser/component-testing.html)
- [Browser Mode](https://vitest.dev/guide/browser/)
- [Assertion API](https://vitest.dev/guide/browser/assertions)
- [Interactivity API](https://vitest.dev/guide/browser/interactivity-api)
- [Mocking Requests (MSW)](https://vitest.dev/guide/mocking/requests)
- Code examples: [patterns.md](patterns.md)
