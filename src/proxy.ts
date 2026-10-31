import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, localeCookie, localizedHref } from "./i18n/config";

export function proxy(request: NextRequest) {
  const segment = request.nextUrl.pathname.split("/")[1];
  if (isLocale(segment)) return NextResponse.next();
  const saved = request.cookies.get(localeCookie)?.value;
  const url = request.nextUrl.clone();
  url.pathname = localizedHref(url.pathname, isLocale(saved) ? saved : defaultLocale);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api(?:/|$)|_next(?:/|$)|assets(?:/|$)|fonts(?:/|$)|.*\\..*).*)"],
};
