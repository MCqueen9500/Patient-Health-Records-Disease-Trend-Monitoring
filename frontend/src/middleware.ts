import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXT_PUBLIC_JWT_SECRET || 'your_super_secret_jwt_key_change_in_production'
);

interface JWTPayload {
  id: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  iat?: number;
  exp?: number;
}

async function getTokenPayload(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read the JWT from the HTTP-only cookie set by the backend
  const token = request.cookies.get('token')?.value;

  // Helper: redirect to login with a next param so we can restore navigation
  function redirectToLogin(reason?: string) {
    const loginUrl = new URL('/login', request.url);
    if (reason) loginUrl.searchParams.set('reason', reason);
    return NextResponse.redirect(loginUrl);
  }

  // If no token is present, deny access to all protected routes
  if (!token) {
    return redirectToLogin('unauthenticated');
  }

  const payload = await getTokenPayload(token);

  // Token is invalid or expired
  if (!payload) {
    const response = redirectToLogin('session_expired');
    // Clear the stale cookie
    response.cookies.delete('token');
    return response;
  }

  const { role } = payload;

  // ── Role-based route guards ────────────────────────────────────────

  if (pathname.startsWith('/patient') && role !== 'PATIENT') {
    return redirectToLogin('forbidden');
  }

  if (pathname.startsWith('/doctor') && role !== 'DOCTOR') {
    return redirectToLogin('forbidden');
  }

  if (pathname.startsWith('/admin') && role !== 'ADMIN') {
    return redirectToLogin('forbidden');
  }

  // Authorized – proceed
  return NextResponse.next();
}

export const config = {
  matcher: ['/patient/:path*', '/doctor/:path*', '/admin/:path*'],
};
