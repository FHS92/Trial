import { auth } from './auth'
import { NextResponse } from 'next/server'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/verify',
  '/forgot',
  '/reset',
  '/api/auth',
]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
  if (!isPublic && !req.auth) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', req.url)
    return NextResponse.redirect(loginUrl)
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
