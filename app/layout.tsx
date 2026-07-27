import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FORMBOX — 3D 박스 실시간 견적",
    template: "%s | FORMBOX",
  },
  description:
    "AI·PDF 도면을 관리하고 박스 완성·열림 모션과 실시간 제작 견적을 확인하는 패키지 제작 워크스페이스.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

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
