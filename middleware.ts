import { NextRequest, NextResponse } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

export function middleware(req: NextRequest) {
  if (!ADMIN_PASSWORD) return NextResponse.next()

  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Basic ')) {
    const [, pass] = atob(auth.slice(6)).split(':')
    if (pass === ADMIN_PASSWORD) return NextResponse.next()
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="NextUpTV Admin"' },
  })
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/eval', '/eval/:path*', '/api/eval', '/api/usage-logs', '/usage-logs'],
}
