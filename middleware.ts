import { NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE, LOCALE_HEADER, resolveLocale } from "./app/i18n";

export function middleware(request: NextRequest) {
  const locale = resolveLocale(
    request.nextUrl.searchParams.get("lang"),
    request.cookies.get(LOCALE_COOKIE)?.value,
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/"],
};
