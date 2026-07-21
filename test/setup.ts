import { afterEach, vi } from 'vitest'

// Global safety guards: throw immediately if a test reaches real external APIs without mocking.
// Per-file vi.mock() calls (e.g. in tvdb.test.ts, usage-storage.test.ts) override these.
vi.mock('@anthropic-ai/sdk', () => {
  const guard = (name: string) => () => {
    throw new Error(`Anthropic SDK called without a mock in this test file (${name}). Add vi.mock('@anthropic-ai/sdk', ...) to your test.`)
  }
  const Anthropic = vi.fn(() => ({
    messages: { create: guard('messages.create'), stream: guard('messages.stream') },
  }))
  return { default: Anthropic }
})

vi.mock('@neondatabase/serverless', () => ({
  neon: () => {
    throw new Error("Neon called without a mock in this test file. Add vi.mock('@neondatabase/serverless', ...) to your test.")
  },
}))

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})
