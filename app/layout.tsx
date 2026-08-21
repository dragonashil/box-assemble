import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const defaultTitle = "FORMBOX — 3D 박스 실시간 견적";
const description =
  "AI·PDF 도면을 관리하고 박스 완성·열림 모션과 실시간 제작 견적을 확인하는 패키지 제작 워크스페이스.";

export async function generateMetadata(): Promise<Metadata> {
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
      locale: "ko_KR",
      title: defaultTitle,
      description,
      images: [
        {
          url: "/og.png",
          width: 1728,
          height: 909,
          alt: "FORMBOX 3D 박스 실시간 견적",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
