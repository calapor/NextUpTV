import { describe, expect, it } from 'vitest'
import { sseEvent, sseResponse } from './sse'

const decoder = new TextDecoder()

describe('sseEvent', () => {
  it('encodes objects with the SSE "data:" prefix and double-newline terminator', () => {
    const bytes = sseEvent({ type: 'status', message: 'hi' })
    const text = decoder.decode(bytes)
    expect(text).toBe('data: {"type":"status","message":"hi"}\n\n')
  })

  it('produces exactly two trailing newlines (SSE spec — single \\n breaks parsers)', () => {
    const text = decoder.decode(sseEvent({ a: 1 }))
    expect(text.endsWith('\n\n')).toBe(true)
    expect(text.endsWith('\n\n\n')).toBe(false)
  })

  it('returns a Uint8Array (binary-safe writes to the controller)', () => {
    expect(sseEvent({ x: 1 })).toBeInstanceOf(Uint8Array)
  })

  it('handles unicode in payloads via UTF-8 encoding', () => {
    const text = decoder.decode(sseEvent({ city: 'São Paulo' }))
    expect(text).toContain('São Paulo')
  })
})

describe('sseResponse', () => {
  it('sets the three load-bearing SSE response headers', () => {
    const stream = new ReadableStream()
    const res = sseResponse(stream)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    expect(res.headers.get('Cache-Control')).toBe('no-cache')
    expect(res.headers.get('Connection')).toBe('keep-alive')
  })
})
