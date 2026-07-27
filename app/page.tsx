import type { Metadata } from "next";
import BoxStudio from "./BoxStudio";

export const metadata: Metadata = {
  title: "FORMBOX — 3D 박스 실시간 견적",
  description:
    "박스 형태와 사양을 고르면 3D 결과와 제작 견적을 즉시 확인할 수 있습니다.",
};

export default function Home() {
  return <BoxStudio />;
}
