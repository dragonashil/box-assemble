import type { Metadata } from "next";
import { headers } from "next/headers";
import { dictionaries } from "./i18n";
import { getRequestLocale } from "./locale-server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = dictionaries[locale];
  const defaultTitle = t.meta.title;
  const description = t.meta.description;
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0];
  const host =
    forwardedHost?.trim() ||
    requestHeaders.get("host") ||
    "formbox-studio-demo.drdnrun.chatgpt.site";
  const forwardedProtocol = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const isLocalHost = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
  const protocol =
    forwardedProtocol === "http" || isLocalHost ? "http" : "https";
  let metadataBase = new URL(
    "https://formbox-studio-demo.drdnrun.chatgpt.site",
  );

  try {
    metadataBase = new URL(`${protocol}://${host}`);
  } catch {
    // Keep the production fallback for malformed preview host headers.
  }

  return {
    metadataBase,
    title: {
      default: defaultTitle,
      template: "%s | FORMBOX",
    },
    description,
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : "ko_KR",
      alternateLocale: locale === "en" ? "ko_KR" : "en_US",
      title: defaultTitle,
      description,
      images: [
        {
          url: "/og.png",
          width: 1728,
          height: 909,
          alt: t.meta.imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description,
      images: ["/og.png"],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
