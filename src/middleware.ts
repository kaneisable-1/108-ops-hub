import { NextResponse, type NextRequest } from 'next/server'

// AUTH DISABLED FOR TESTING — all routes pass through
export async function middleware(request: NextRequest) {
  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icon-.*\\.png|icon-.*\\.svg|logo-.*\\.svg).*)',
  ],
}
