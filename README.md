# FORMBOX 3D 박스 컨피규레이터

브라우저에서 박스 형태와 제작 사양을 선택하고, 접힘 과정과 예상 견적을 실시간으로 확인하는 Web3D 데모입니다.

- Vercel 데모: https://box-assemble.vercel.app
- Sites 데모: https://formbox-studio-demo.drdnrun.chatgpt.site

## 주요 기능

- G형 메일러, 택배형, 서랍형 박스 선택
- 규격·재질·인쇄·후가공·수량·납기에 따른 실시간 견적 계산
- Three.js 기반 완성·열림·전개도 보기와 드래그 회전
- G형 박스 전개도에서 완성 상태까지 직접 조작하는 접힘 슬라이더
- AI/PDF 도면 추가 흐름과 텍스트 견적서 저장
- 데스크톱·태블릿·모바일 반응형 UI

## 기술 구성

- Next.js 16, React 19, TypeScript
- Three.js
- SUIT Variable, Reicon
- Sites용 Vinext/Cloudflare 빌드와 Vercel용 Next.js 빌드 분리

## 실행

```bash
npm install
npm run dev
```

## 검증과 배포 빌드

```bash
npm run test
npm run build:vercel
```

현재 파일 업로드와 견적은 데모 세션에서만 유지됩니다. 실제 제품화 단계에서는 영구 파일 저장, 관리자 단가표, 견적 승인, ERP·쇼핑몰 연동을 별도 범위로 연결해야 합니다.
