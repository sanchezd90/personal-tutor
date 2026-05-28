# Vitest Browser Component Testing — Patterns

Copy-adapt these patterns when implementing tests. All examples assume React; adjust imports for other frameworks.

## Isolation with Mocked Children

```tsx
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'

vi.mock(import('../components/UserCard'), () => ({
  default: vi.fn(({ user }) => <div>User: {user.name}</div>),
}))

test('UserProfile handles loading and data states', async () => {
  const { getByText } = render(<UserProfile userId="123" />)

  await expect.element(getByText('Loading...')).toBeInTheDocument()
  await expect.element(getByText('User: John')).toBeInTheDocument()
})
```

## Integration — Filter and Display

```tsx
test('ProductList filters and displays products correctly', async () => {
  const mockProducts = [
    { id: 1, name: 'Laptop', category: 'Electronics', price: 999 },
    { id: 2, name: 'Book', category: 'Education', price: 29 },
  ]

  const { getByLabelText, getByText, queryByText } = render(
    <ProductList products={mockProducts} />,
  )

  await expect.element(getByText('Laptop')).toBeInTheDocument()
  await expect.element(getByText('Book')).toBeInTheDocument()

  await userEvent.selectOptions(getByLabelText(/category/i), 'Electronics')

  await expect.element(getByText('Laptop')).toBeInTheDocument()
  await expect.element(queryByText('Book')).not.toBeInTheDocument()
})
```

## Testing Library Bridge (unsupported frameworks)

```tsx
import { render } from '@testing-library/solid'
import { page } from 'vitest/browser'

test('Solid component handles user interaction', async () => {
  const { baseElement } = render(() => <Counter initialValue={0} />)
  const screen = page.elementLocator(baseElement)

  await expect.element(screen.getByText('Count: 0')).toBeInTheDocument()
  await screen.getByRole('button', { name: /increment/i }).click()
  await expect.element(screen.getByText('Count: 1')).toBeInTheDocument()
})
```

## Stateful Component

```tsx
test('ShoppingCart manages items correctly', async () => {
  const { getByText } = render(<ShoppingCart />)

  await expect.element(getByText('Your cart is empty')).toBeInTheDocument()

  await page.getByRole('button', { name: /add laptop/i }).click()
  await expect.element(getByText('1 item')).toBeInTheDocument()
  await expect.element(getByText('Laptop - $999')).toBeInTheDocument()

  await page.getByRole('button', { name: /increase quantity/i }).click()
  await expect.element(getByText('2 items')).toBeInTheDocument()
})
```

## Async Data Fetching with MSW

```tsx
import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/api/users/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, name: 'John Doe', email: 'john@example.com' }),
  ),
)

beforeAll(() => worker.start())
afterEach(() => worker.resetHandlers())
afterAll(() => worker.stop())

test('UserProfile handles loading, success, and error states', async () => {
  const { getByText } = render(<UserProfile userId="123" />)
  await expect.element(getByText('John Doe')).toBeInTheDocument()
  await expect.element(getByText('john@example.com')).toBeInTheDocument()

  worker.use(
    http.get('/api/users/:id', () =>
      HttpResponse.json({ error: 'User not found' }, { status: 404 }),
    ),
  )

  const { getByText: getErrorText } = render(<UserProfile userId="999" />)
  await expect.element(getErrorText('Error: User not found')).toBeInTheDocument()
})
```

## Parent-Child Communication

```tsx
test('parent and child components communicate correctly', async () => {
  const mockOnSelectionChange = vi.fn()

  const { getByText } = render(
    <ProductCatalog onSelectionChange={mockOnSelectionChange}>
      <ProductFilter />
      <ProductGrid />
    </ProductCatalog>,
  )

  await page.getByRole('checkbox', { name: /electronics/i }).click()

  expect(mockOnSelectionChange).toHaveBeenCalledWith({
    category: 'electronics',
    filters: ['electronics'],
  })

  await expect.element(getByText('Showing Electronics products')).toBeInTheDocument()
})
```

## Complex Form Validation

```tsx
test('ContactForm handles complex validation scenarios', async () => {
  const mockSubmit = vi.fn()
  const { getByText } = render(<ContactForm onSubmit={mockSubmit} />)

  const nameInput = page.getByLabelText(/full name/i)
  const emailInput = page.getByLabelText(/email/i)
  const messageInput = page.getByLabelText(/message/i)
  const submitButton = page.getByRole('button', { name: /send message/i })

  await submitButton.click()
  await expect.element(getByText('Name is required')).toBeInTheDocument()
  await expect.element(getByText('Email is required')).toBeInTheDocument()
  await expect.element(getByText('Message is required')).toBeInTheDocument()

  await nameInput.fill('John Doe')
  await submitButton.click()
  await expect.element(getByText('Name is required')).not.toBeInTheDocument()
  await expect.element(getByText('Email is required')).toBeInTheDocument()

  await emailInput.fill('invalid-email')
  await submitButton.click()
  await expect.element(getByText('Please enter a valid email')).toBeInTheDocument()

  await emailInput.fill('john@example.com')
  await messageInput.fill('Hello, this is a test message.')
  await submitButton.click()

  expect(mockSubmit).toHaveBeenCalledWith({
    name: 'John Doe',
    email: 'john@example.com',
    message: 'Hello, this is a test message.',
  })
})
```

## Error Boundary

```tsx
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Component error!')
  return <div>Component working fine</div>
}

test('ErrorBoundary catches and displays errors gracefully', async () => {
  const { getByText, rerender } = render(
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <ThrowError shouldThrow={false} />
    </ErrorBoundary>,
  )

  await expect.element(getByText('Component working fine')).toBeInTheDocument()

  rerender(
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <ThrowError shouldThrow={true} />
    </ErrorBoundary>,
  )

  await expect.element(getByText('Something went wrong')).toBeInTheDocument()
})
```

## Accessibility — Modal

```tsx
test('Modal component is accessible', async () => {
  const { getByRole, getByLabelText } = render(
    <Modal isOpen={true} title="Settings">
      <SettingsForm />
    </Modal>,
  )

  const modal = getByRole('dialog')
  await expect.element(modal).toHaveFocus()
  await expect.element(modal).toHaveAttribute('aria-labelledby')
  await expect.element(modal).toHaveAttribute('aria-modal', 'true')

  await userEvent.keyboard('{Escape}')
  await expect.element(modal).not.toBeInTheDocument()

  const firstInput = getByLabelText(/username/i)
  const lastButton = getByRole('button', { name: /save/i })

  await firstInput.click()
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
  await expect.element(lastButton).toHaveFocus()
})
```

## Debugging Selectors

```tsx
test('debug element queries', async () => {
  render(<LoginForm />)

  const emailInput = page.getByLabelText(/email/i)
  await expect.element(emailInput).toBeVisible()

  const submitButton = page.getByRole('button', { name: /submit/i })
    .or(page.getByTestId('submit-button'))
    .or(page.getByText('Submit'))

  console.log('Button count:', submitButton.length)
})
```
