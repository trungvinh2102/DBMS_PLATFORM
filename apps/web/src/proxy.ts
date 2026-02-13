import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
// Routes that require authentication
const protectedRoutes = ["/sqllab", "/connections", "/settings"];
// Routes that are public but should redirect to dashboard if logged in
const authRoutes = ["/auth/login", "/auth/register"];

export function proxy(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const { pathname } = request.nextUrl;

  // 1. Protected Routes: If no token, redirect to login
  const isProtected =
    pathname === "/" ||
    protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtected) {
    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Auth Routes: If token exists, redirect to dashboard
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
