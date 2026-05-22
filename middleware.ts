import { NextRequest, NextResponse } from 'next/server'

const EVAL_USER = process.env.EVAL_USER ?? 'admin'
const EVAL_PASSWORD = process.env.EVAL_PASSWORD

export function middleware(req: NextRequest) {
  if (!EVAL_PASSWORD) return NextResponse.next()

  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Basic ')) {
    const [user, pass] = atob(auth.slice(6)).split(':')
    if (user === EVAL_USER && pass === EVAL_PASSWORD) return NextResponse.next()
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="NextUpTV Eval"' },
  })
}

export const config = {
  matcher: ['/eval', '/eval/:path*', '/api/eval', '/api/usage-logs', '/usage-logs'],
}
