import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Allow all requests to pass through — auth is handled client-side via AuthContext
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
