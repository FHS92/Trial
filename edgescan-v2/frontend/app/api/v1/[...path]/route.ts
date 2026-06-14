import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const BACKEND = process.env.API_URL ?? 'http://localhost:8000'
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? ''

async function handle(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params
  const backendUrl = `${BACKEND}/api/v1/${path.join('/')}${req.nextUrl.search}`

  const session = await auth()

  const headers: Record<string, string> = {}
  const ct = req.headers.get('content-type')
  if (ct) headers['content-type'] = ct

  if (session?.user && INTERNAL_SECRET) {
    headers['x-internal-secret'] = INTERNAL_SECRET
    headers['x-user-id'] = (session.user as any).id ?? ''
    headers['x-user-tier'] = (session.user as any).tier ?? 'free'
    headers['x-user-is-admin'] = String((session.user as any).is_admin ?? false)
  }

  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text()

  const res = await fetch(backendUrl, {
    method: req.method,
    headers,
    body,
    cache: 'no-store',
  })

  const text = await res.text()
  return new NextResponse(text, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  })
}

export const GET = handle
export const POST = handle
export const PATCH = handle
export const DELETE = handle
export const PUT = handle
