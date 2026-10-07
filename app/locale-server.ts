import { cookies, headers } from "next/headers";
import { isLocale, LOCALE_COOKIE, LOCALE_HEADER, resolveLocale, type Locale } from "./i18n";

export async function getRequestLocale(): Promise<Locale> {
  const [requestHeaders, requestCookies] = await Promise.all([headers(), cookies()]);
  const middlewareLocale = requestHeaders.get(LOCALE_HEADER);
  if (isLocale(middlewareLocale)) return middlewareLocale;
  return resolveLocale(undefined, requestCookies.get(LOCALE_COOKIE)?.value);
}
