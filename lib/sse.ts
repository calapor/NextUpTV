const encoder = new TextEncoder()

export function sseEvent(obj: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
}

export function sseResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
