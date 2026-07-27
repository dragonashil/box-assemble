"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ArrowRotate from "reicon-react/icons/ArrowRotate";
import Box from "reicon-react/icons/Box";
import Box2 from "reicon-react/icons/Box2";
import Box3 from "reicon-react/icons/Box3";
import Calculator from "reicon-react/icons/Calculator";
import CartCheck from "reicon-react/icons/CartCheck";
import Check from "reicon-react/icons/Check";
import ChevronDown from "reicon-react/icons/ChevronDown";
import CloseCircle from "reicon-react/icons/CloseCircle";
import Document from "reicon-react/icons/Document";
import FileText from "reicon-react/icons/FileText";
import Fullscreen from "reicon-react/icons/Fullscreen";
import InfoCircle from "reicon-react/icons/InfoCircle";
import Layer from "reicon-react/icons/Layer";
import Pause from "reicon-react/icons/Pause";
import Play from "reicon-react/icons/Play";
import Ruler from "reicon-react/icons/Ruler";
import Upload from "reicon-react/icons/Upload";

const BoxPreview = dynamic(() => import("./BoxPreview"), {
  ssr: false,
  loading: () => <div className="preview-loading">3D 모델을 준비하고 있어요</div>,
});

type BoxType = "mailer" | "shipping" | "drawer";
type Paper = "kraft" | "white" | "green";
type PrintType = "none" | "one" | "full";
type ViewMode = "closed" | "open" | "dieline" | "folding";
type ViewTabMode = Exclude<ViewMode, "folding">;

type Asset = {
  name: string;
  type: "AI" | "PDF";
  size: string;
};

const boxTypes: Array<{
  id: BoxType;
  name: string;
  detail: string;
  icon: typeof Box;
}> = [
  { id: "mailer", name: "G형 택배박스", detail: "FEFCO 0427 · 롤엔드", icon: Box3 },
  { id: "shipping", name: "A형 골판지박스", detail: "일반형 · 접착식", icon: Box },
  { id: "drawer", name: "서랍형 패키지", detail: "슬리브 · 고급형", icon: Box2 },
];

const materials: Array<{
  id: Paper;
  label: string;
  sub: string;
  swatch: string;
}> = [
  { id: "kraft", label: "KLB 크라프트", sub: "E골 · 1.5 mm", swatch: "#C99B62" },
  { id: "white", label: "화이트보드", sub: "E골 · 1.5 mm", swatch: "#F2EFE8" },
  { id: "green", label: "그린보드", sub: "F골 · 1.2 mm", swatch: "#C8E6CD" },
];

const numberFormatter = new Intl.NumberFormat("ko-KR");

export default function BoxStudio() {
  const [boxType, setBoxType] = useState<BoxType>("mailer");
  const [viewMode, setViewMode] = useState<ViewMode>("open");
  const [foldProgress, setFoldProgress] = useState(1);
  const [paper, setPaper] = useState<Paper>("kraft");
  const [printType, setPrintType] = useState<PrintType>("one");
  const [width, setWidth] = useState(240);
  const [depth, setDepth] = useState(160);
  const [height, setHeight] = useState(90);
  const [quantity, setQuantity] = useState(500);
  const [coating, setCoating] = useState(false);
  const [express, setExpress] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([
    { name: "brand_graphic_v4.ai", type: "AI", size: "2.8 MB" },
    { name: "mailer_G240.pdf", type: "PDF", size: "428 KB" },
  ]);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const quote = useMemo(() => {
    const volumeFactor = (width * depth * height) / 1_000_000;
    const typeFactor = { mailer: 1.14, shipping: 0.92, drawer: 1.42 }[boxType];
    const paperFactor = { kraft: 1, white: 1.16, green: 1.1 }[paper];
    const printUnit = { none: 0, one: 92, full: 278 }[printType];
    const finishUnit = coating ? 64 : 0;
    const discount =
      quantity >= 2000
        ? 0.68
        : quantity >= 1000
          ? 0.76
          : quantity >= 500
            ? 0.84
            : 1;
    const rawUnit =
      (310 + volumeFactor * 6.3) * typeFactor * paperFactor +
      printUnit +
      finishUnit;
    const unit = Math.max(420, Math.round((rawUnit * discount) / 10) * 10);
    const plate = printType === "none" ? 0 : printType === "one" ? 55000 : 132000;
    const die = 88000;
    const production = unit * quantity;
    const rush = express ? Math.round((production + plate + die) * 0.12) : 0;
    const subtotal = production + plate + die + rush;
    return {
      unit,
      plate,
      die,
      production,
      rush,
      subtotal,
      vat: Math.round(subtotal * 0.1),
      total: Math.round(subtotal * 1.1),
    };
  }, [
    width,
    depth,
    height,
    boxType,
    paper,
    printType,
    coating,
    quantity,
    express,
  ]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const type = file.name.toLowerCase().endsWith(".ai") ? "AI" : "PDF";
    setAssets((current) => [
      ...current,
      {
        name: file.name,
        type,
        size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      },
    ]);
    event.target.value = "";
  };

  const openFullscreen = () => {
    stageRef.current?.requestFullscreen?.();
  };

  const handleViewModeChange = (mode: ViewTabMode) => {
    setViewMode(mode);
    setFoldProgress(mode === "dieline" ? 0 : 1);
  };

  const handleFoldProgressChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextProgress = Number(event.target.value) / 100;
    setFoldProgress(nextProgress);
    setViewMode(
      nextProgress === 0 ? "dieline" : nextProgress === 1 ? "closed" : "folding",
    );
  };

  const handleBoxTypeChange = (nextBoxType: BoxType) => {
    setBoxType(nextBoxType);
    if (nextBoxType !== "mailer" && viewMode === "folding") {
      setViewMode("open");
    }
  };

  const downloadQuote = () => {
    const quoteText = [
      "FORMBOX 예상 견적서",
      `박스: ${boxTypes.find((item) => item.id === boxType)?.name}`,
      `규격: ${width} × ${depth} × ${height} mm`,
      `재질: ${materials.find((item) => item.id === paper)?.label}`,
      `수량: ${numberFormatter.format(quantity)}개`,
      `개당 예상 단가: ${numberFormatter.format(quote.unit)}원`,
      `예상 총액(VAT 포함): ${numberFormatter.format(quote.total)}원`,
      "",
      "실제 제작 가능 여부와 최종 금액은 도면 검토 후 확정됩니다.",
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([quoteText], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "formbox-quote.txt";
    link.click();
    URL.revokeObjectURL(url);
    setQuoteOpen(false);
  };

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>FORMBOX</span>
          <span className="brand-tag">BETA</span>
        </div>
        <div className="project-title">
          <strong>오브젝트 패키지 · G형</strong>
          <span><Check size={14} aria-hidden="true" /> 모든 변경사항 저장됨</span>
        </div>
        <nav className="header-actions" aria-label="프로젝트 메뉴">
          <button className="plain-button">도면 라이브러리</button>
          <button className="pill-button light">
            <FileText size={18} aria-hidden="true" />
            견적 목록
          </button>
          <button
            className="avatar-button"
            aria-label="사용자 메뉴"
            title="사용자 메뉴"
          >
            BF
          </button>
        </nav>
      </header>

      <div className="workflow-bar">
        <div className="workflow-step done"><span>1</span> 박스 선택</div>
        <div className="workflow-line active" />
        <div className="workflow-step active"><span>2</span> 사양 설정</div>
        <div className="workflow-line" />
        <div className="workflow-step"><span>3</span> 견적 확인</div>
      </div>

      <section className="workspace">
        <aside className="template-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">BOX TYPE</span>
              <h1>박스 형태</h1>
            </div>
            <button className="round-button" aria-label="박스 형태 안내" title="박스 형태 안내">
              <InfoCircle size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="type-list">
            {boxTypes.map((item) => {
              const Icon = item.icon;
              const selected = boxType === item.id;
              return (
                <button
                  key={item.id}
                  className={`type-card ${selected ? "selected" : ""}`}
                  onClick={() => handleBoxTypeChange(item.id)}
                >
                  <span className="type-icon">
                    <Icon
                      size={26}
                      weight={selected ? "Filled" : "Outline"}
                      aria-hidden="true"
                    />
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.detail}</small>
                  </span>
                  {selected ? (
                    <span className="selected-dot"><Check size={12} aria-hidden="true" /></span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="asset-section">
            <div className="asset-title">
              <span>도면 파일</span>
              <span className="asset-count">{assets.length}</span>
            </div>
            <p>AI 또는 PDF 원본을 연결해 인쇄 위치를 관리합니다.</p>
            <div className="asset-list">
              {assets.map((asset, index) => (
                <div className="asset-row" key={`${asset.name}-${index}`}>
                  <span className={`file-badge ${asset.type.toLowerCase()}`}>
                    <Document size={15} aria-hidden="true" />
                  </span>
                  <span className="asset-name">
                    <strong>{asset.name}</strong>
                    <small>{asset.type} · {asset.size}</small>
                  </span>
                  <span className="asset-ok"><Check size={13} aria-hidden="true" /></span>
                </div>
              ))}
            </div>
            <input
              ref={fileInputRef}
              className="visually-hidden"
              type="file"
              accept=".ai,.pdf,application/pdf"
              onChange={handleFile}
            />
            <button
              className="upload-button"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={17} aria-hidden="true" />
              도면 추가
            </button>
          </div>
        </aside>

        <section className="preview-panel" ref={stageRef}>
          <div className="preview-topbar">
            <div className="view-tabs" role="tablist" aria-label="박스 보기 모드">
              {([
                ["closed", "완성"],
                ["open", "열림"],
                ["dieline", "전개도"],
              ] as Array<[ViewTabMode, string]>).map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={viewMode === id}
                  className={viewMode === id ? "active" : ""}
                  onClick={() => handleViewModeChange(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="preview-actions">
              <button
                className={`round-button ${autoRotate ? "active" : ""}`}
                onClick={() => setAutoRotate((value) => !value)}
                aria-label={autoRotate ? "자동 회전 멈추기" : "자동 회전 시작"}
                title={autoRotate ? "자동 회전 멈추기" : "자동 회전 시작"}
              >
                {autoRotate ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
              </button>
              <button
                className="round-button"
                onClick={() => {
                  handleViewModeChange("open");
                  setAutoRotate(true);
                }}
                aria-label="3D 보기 초기화"
                title="3D 보기 초기화"
              >
                <ArrowRotate size={18} aria-hidden="true" />
              </button>
              <button
                className="round-button"
                onClick={openFullscreen}
                aria-label="전체 화면"
                title="전체 화면"
              >
                <Fullscreen size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className={`stage-canvas ${boxType === "mailer" ? "mailer-preview" : ""}`}>
            <div className="grid-floor" aria-hidden="true" />
            <BoxPreview
              boxType={boxType}
              width={width}
              depth={depth}
              height={height}
              mode={viewMode}
              paper={paper}
              print={printType}
              autoRotate={autoRotate}
              foldProgress={boxType === "mailer" ? foldProgress : undefined}
            />
            {boxType === "mailer" ? (
              <div className="fold-progress-control">
                <div className="fold-progress-heading">
                  <label htmlFor="mailer-fold-progress">
                    <Layer size={15} aria-hidden="true" />
                    접힘 진행
                  </label>
                  <output htmlFor="mailer-fold-progress">
                    {viewMode === "open"
                      ? "몸체 100% · 뚜껑 열림"
                      : `${Math.round(foldProgress * 100)}%`}
                  </output>
                </div>
                <input
                  id="mailer-fold-progress"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.round(foldProgress * 100)}
                  onChange={handleFoldProgressChange}
                  aria-valuetext={
                    viewMode === "open"
                      ? "몸체 완성, 뚜껑만 열림"
                      : `${Math.round(foldProgress * 100)}% 접힘`
                  }
                  aria-describedby="mailer-fold-endpoints"
                  style={{
                    background: `linear-gradient(to right, var(--mint-deep) 0 ${foldProgress * 100}%, rgba(37, 95, 74, 0.18) ${foldProgress * 100}% 100%)`,
                  }}
                />
                <div
                  className="fold-progress-endpoints"
                  id="mailer-fold-endpoints"
                >
                  <span>전개도</span>
                  <span>완성</span>
                </div>
              </div>
            ) : null}
            <div className="dimension dimension-width">
              <span />
              <b>{width} mm</b>
              <span />
            </div>
            <div className="dimension dimension-height">
              <span />
              <b>{height} mm</b>
              <span />
            </div>
          </div>

          <div className="preview-footer">
            <div>
              <span className="material-chip">
                <i style={{ background: materials.find((item) => item.id === paper)?.swatch }} />
                {materials.find((item) => item.id === paper)?.label}
              </span>
              <span className="scale-chip">1:1 실측 비율</span>
            </div>
            <p>
              <Layer size={16} aria-hidden="true" />
              {boxType === "mailer"
                ? "FEFCO 0427 전개도와 완성 상태가 동일한 힌지로 연결됩니다"
                : "전개도와 완성 상태가 동일한 접힘선으로 연결됩니다"}
            </p>
          </div>
        </section>

        <aside className="config-panel">
          <div className="config-scroll">
            <div className="config-header">
              <div>
                <span className="eyebrow">CONFIGURATION</span>
                <h2>사양 설정</h2>
              </div>
              <span className="live-badge"><i /> 실시간 반영</span>
            </div>

            <section className="config-section">
              <div className="section-title">
                <span className="section-number">01</span>
                <strong>내부 사이즈</strong>
                <Ruler size={17} aria-hidden="true" />
              </div>
              <div className="dimension-inputs">
                {[
                  ["가로", width, setWidth],
                  ["세로", depth, setDepth],
                  ["높이", height, setHeight],
                ].map(([label, value, setter]) => (
                  <label key={label as string}>
                    <span>{label as string}</span>
                    <span className="input-wrap">
                      <input
                        type="number"
                        min="40"
                        max="1000"
                        value={value as number}
                        onChange={(event) =>
                          (setter as (value: number) => void)(
                            Math.max(40, Number(event.target.value)),
                          )
                        }
                      />
                      <small>mm</small>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="config-section">
              <div className="section-title">
                <span className="section-number">02</span>
                <strong>재질</strong>
                <ChevronDown size={17} aria-hidden="true" />
              </div>
              <div className="material-list">
                {materials.map((item) => (
                  <button
                    key={item.id}
                    className={`material-option ${paper === item.id ? "selected" : ""}`}
                    onClick={() => setPaper(item.id)}
                  >
                    <i style={{ background: item.swatch }} />
                    <span><strong>{item.label}</strong><small>{item.sub}</small></span>
                    <span className="radio-mark">{paper === item.id ? <Check size={12} aria-hidden="true" /> : null}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="config-section">
              <div className="section-title">
                <span className="section-number">03</span>
                <strong>인쇄 · 후가공</strong>
                <ChevronDown size={17} aria-hidden="true" />
              </div>
              <div className="segmented-options">
                {([
                  ["none", "무지"],
                  ["one", "1도 인쇄"],
                  ["full", "4도 컬러"],
                ] as Array<[PrintType, string]>).map(([id, label]) => (
                  <button
                    key={id}
                    className={printType === id ? "selected" : ""}
                    onClick={() => setPrintType(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="check-option">
                <input
                  type="checkbox"
                  checked={coating}
                  onChange={(event) => setCoating(event.target.checked)}
                />
                <span className="custom-check">{coating ? <Check size={13} aria-hidden="true" /> : null}</span>
                <span><strong>무광 코팅</strong><small>표면 보호와 차분한 질감을 더합니다.</small></span>
                <b>+64원</b>
              </label>
            </section>

            <section className="config-section last">
              <div className="section-title">
                <span className="section-number">04</span>
                <strong>수량 · 납기</strong>
                <ChevronDown size={17} aria-hidden="true" />
              </div>
              <div className="quantity-row">
                <label>
                  <span>제작 수량</span>
                  <select
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                  >
                    <option value="100">100개</option>
                    <option value="300">300개</option>
                    <option value="500">500개</option>
                    <option value="1000">1,000개</option>
                    <option value="2000">2,000개</option>
                  </select>
                </label>
                <label>
                  <span>납기</span>
                  <select
                    value={express ? "express" : "standard"}
                    onChange={(event) => setExpress(event.target.value === "express")}
                  >
                    <option value="standard">일반 · 10일</option>
                    <option value="express">빠른 · 6일</option>
                  </select>
                </label>
              </div>
            </section>
          </div>

          <div className="quote-card">
            <div className="quote-label">
              <span><Calculator size={18} aria-hidden="true" /> 예상 견적</span>
              <small>VAT 포함</small>
            </div>
            <div className="unit-price">
              <span>개당 <b>{numberFormatter.format(quote.unit)}원</b></span>
              <small>{numberFormatter.format(quantity)}개 기준</small>
            </div>
            <div className="quote-total">
              <strong>{numberFormatter.format(quote.total)}</strong>
              <span>원</span>
            </div>
            <div className="quote-details">
              <span>박스 제작비 <b>{numberFormatter.format(quote.production)}원</b></span>
              <span>목형 · 인쇄판 <b>{numberFormatter.format(quote.die + quote.plate)}원</b></span>
            </div>
            <button className="quote-button" onClick={() => setQuoteOpen(true)}>
              <CartCheck size={20} aria-hidden="true" />
              이 사양으로 견적 받기
            </button>
          </div>
        </aside>
      </section>

      {quoteOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setQuoteOpen(false)}>
          <section
            className="quote-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quote-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setQuoteOpen(false)}
              aria-label="견적서 닫기"
            >
              <CloseCircle size={24} aria-hidden="true" />
            </button>
            <span className="modal-kicker"><Check size={14} aria-hidden="true" /> 견적 계산 완료</span>
            <h2 id="quote-modal-title">제작 가능한 사양이에요.</h2>
            <p>선택한 옵션을 기준으로 예상 견적서를 만들었습니다.</p>
            <div className="modal-summary">
              <div><span>박스</span><strong>{boxTypes.find((item) => item.id === boxType)?.name}</strong></div>
              <div><span>규격</span><strong>{width} × {depth} × {height} mm</strong></div>
              <div><span>수량</span><strong>{numberFormatter.format(quantity)}개</strong></div>
              <div><span>예상 총액</span><strong>{numberFormatter.format(quote.total)}원</strong></div>
            </div>
            <button className="modal-primary" onClick={downloadQuote}>
              <Document size={19} aria-hidden="true" />
              견적서 저장
            </button>
            <small className="modal-note">실제 제작 가능 여부와 최종 금액은 도면 검토 후 확정됩니다.</small>
          </section>
        </div>
      ) : null}
    </main>
  );
}
